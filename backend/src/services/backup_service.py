"""Servicio de backups y restauración de dependencias (bases de datos tenant).

Toda la lógica pesada (pg_dump, pg_restore, verificación de checksums, conteo
de filas y el swap de bases de datos) vive aquí como funciones síncronas; los
endpoints del router las lanzan como jobs en background, porque el dump o el
restore de una BD puede tardar minutos.

Seguridad por diseño:
  - Los archivos se resuelven SIEMPRE dentro de BACKUP_DIR y con un nombre
    validado por whitelist estricta (ver `validar_archivo_backup`). Nada de
    rutas arbitrarias ni path traversal.
  - El restore NO pisa nunca la BD activa directamente: restaura a una BD
    temporal ({bd}_restore_tmp_<id>), verifica el contenido y sólo entonces
    hace el swap, dejando la BD activa anterior como {bd}_prev_<fecha> para
    rollback manual.
  - Sólo se manejan BDs con nombre seguro (ver `validar_nombre_bd`), el mismo
    guion anti SQL-injection que usa DatabaseService.
"""

import hashlib
import json
import logging
import os
import re
import subprocess
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple

import psycopg2
from dotenv import load_dotenv

from src.services.database_service import (
    get_db_connection,
    validar_nombre_bd,
)

load_dotenv()

logger = logging.getLogger(__name__)

# Directorio de backups. Es el mismo que usa el respaldo diario programado, así
# la UI lista tanto lo que genera esa tarea como lo que se crea desde el panel.
BACKUP_DIR = Path(os.getenv("BACKUP_DIR", "/var/backups/postgresql"))

# Whitelist de nombre de archivo: sólo letras, números, guiones bajos y .dump.
# No admite "/", "\\" ni puntos intermedios → es imposible salir de
# BACKUP_DIR con un nombre malicioso. Tanto el job nocturno como este servicio
# generan nombres con el patrón {base_datos}_{fecha}.dump, que cumple el regex.
RE_ARCHIVO = re.compile(r"^([a-zA-Z0-9_]+)\.dump$")

# Formato de timestamps que este servicio y el cron diario usan en los nombres.
RE_FECHA_HORA = re.compile(r"^(.*?)_(\d{8})_(\d{6})$")
RE_FECHA = re.compile(r"^(.*?)_(\d{8})$")

PREFIJO_RESTORE_TMP = "_restore_tmp_"
PREFIJO_PREVIA = "_prev_"


# ---------------------------------------------------------------------------
# Validación de rutas y nombres
# ---------------------------------------------------------------------------

def validar_archivo_backup(archivo: str) -> Path:
    """Valida un nombre de archivo de backup y lo resuelve dentro de BACKUP_DIR.

    Lanza ValueError ante cualquier path traversal o nombre inválido.
    Devuelve la ruta absoluta resuelta.
    """
    if not archivo:
        raise ValueError("El nombre del archivo de backup no puede estar vacío")
    match = RE_ARCHIVO.match(archivo)
    if not match:
        raise ValueError(
            f"Nombre de archivo de backup inválido: '{archivo}'. Sólo se permiten "
            "letras, números, guiones bajos y la extensión .dump"
        )
    ruta = (BACKUP_DIR / archivo).resolve()
    if ruta.parent != BACKUP_DIR.resolve():
        raise ValueError("El archivo debe estar dentro del directorio de backups")
    return ruta


def _asegurar_backup_dir() -> Path:
    """Crea el directorio de backups si no existe (best-effort)."""
    try:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    except PermissionError:
        logger.warning(
            "No hay permisos para crear %s; los backups pueden fallar", BACKUP_DIR
        )
    return BACKUP_DIR


def _extraer_fecha_de_nombre(archivo: str) -> Optional[datetime]:
    """Extrae la fecha/timestamp del patrón de nombres de dump.

    Soporta los sufijos:
      {bd}_YYYYMMDD_HHMMSS.dump   (cron diario y backups desde la UI)
      {bd}_YYYYMMDD.dump          (dumps manuales "pre_migracion", etc.)
    """
    stem = archivo[: -len(".dump")]
    match = RE_FECHA_HORA.match(stem)
    if match:
        try:
            return datetime.strptime(f"{match.group(2)}_{match.group(3)}", "%Y%m%d_%H%M%S")
        except ValueError:
            return None
    match = RE_FECHA.match(stem)
    if match:
        try:
            return datetime.strptime(match.group(2), "%Y%m%d")
        except ValueError:
            return None
    return None


def _base_de_nombre_archivo(archivo: str) -> Optional[str]:
    """Deduce de qué BD es un dump a partir de su nombre de archivo."""
    stem = archivo[: -len(".dump")]
    match = RE_FECHA_HORA.match(stem)
    if match:
        return match.group(1)
    match = RE_FECHA.match(stem)
    if match:
        return match.group(1)
    return stem if RE_ARCHIVO.match(archivo) else None


# ---------------------------------------------------------------------------
# Subprocess / hashes / conteos
# ---------------------------------------------------------------------------

def _connstr(base_datos: str) -> str:
    """Cadena de conexión al servidor admin para una BD concreta.

    Usa el mismo patrón de credenciales (ADMIN_DB_*) que DatabaseService.
    """
    user = os.getenv("ADMIN_DB_USER", "postgres")
    password = os.getenv("ADMIN_DB_PASSWORD", "")
    host = os.getenv("ADMIN_DB_HOST", "localhost")
    port = os.getenv("ADMIN_DB_PORT", "5432")
    return f"postgresql://{user}:{password}@{host}:{port}/{base_datos}"


def _calcular_sha256(ruta: Path) -> str:
    hasher = hashlib.sha256()
    with open(ruta, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def _leer_sha256_guardado(ruta_dump: Path) -> Optional[str]:
    ruta_sha = ruta_dump.with_suffix(ruta_dump.suffix + ".sha256")
    if not ruta_sha.exists():
        return None
    try:
        contenido = ruta_sha.read_text().strip().split()
        return contenido[0] if contenido else None
    except OSError:
        return None


def _pg_restore_toc_valido(ruta_dump: Path) -> Tuple[bool, str]:
    """Verifica que el dump -Fc tenga cabecera/TOC legible con pg_restore -l."""
    try:
        proc = subprocess.run(
            ["pg_restore", "--list", str(ruta_dump)],
            capture_output=True,
            text=True,
            timeout=60,
        )
    except FileNotFoundError:
        return False, "pg_restore no está instalado en el servidor"
    except subprocess.TimeoutExpired:
        return False, "pg_restore --list agotó el timeout"
    if proc.returncode != 0:
        return False, (proc.stderr.strip() or "pg_restore devolvió error")[:500]
    return True, ""


def _ejecutar_pg_dump(base_datos: str, destino: Path) -> None:
    """pg_dump en formato custom (-Fc): comprimido, restauración selectiva y paralela."""
    proc = subprocess.run(
        ["pg_dump", _connstr(base_datos), "--format=custom", "--file", str(destino)],
        capture_output=True,
        text=True,
        timeout=3600,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            f"pg_dump falló con código {proc.returncode}: {(proc.stderr or '').strip()[:500]}"
        )


def _ejecutar_pg_restore(dump: Path, base_datos: str, jobs: int = 4) -> Tuple[int, str]:
    """pg_restore paralelo de un dump -Fc hacia una BD ya creada.

    Sin transacción única: si algún objeto falla (típico: extensiones o servidores
    FDW), el restore sigue con el resto de los objetos y devuelve exit code 1.
    Exit code >1 sí es un fallo duro (conexión, OS...).
    """
    proc = subprocess.run(
        [
            "pg_restore",
            "--host", os.getenv("ADMIN_DB_HOST", "localhost"),
            "--port", os.getenv("ADMIN_DB_PORT", "5432"),
            "--username", os.getenv("ADMIN_DB_USER", "postgres"),
            "--dbname", base_datos,
            "--jobs", str(jobs),
            "--no-owner",
            "--no-privileges",
            str(dump),
        ],
        capture_output=True,
        text=True,
        env={**os.environ, "PGPASSWORD": os.getenv("ADMIN_DB_PASSWORD", "")},
        timeout=3600,
    )
    return proc.returncode, (proc.stderr or "").strip()


def _conteo_filas_por_tabla(base_datos: str) -> Tuple[int, dict]:
    """Conecta a la BD y cuenta tablas del esquema public + filas exactas por tabla.

    count(*) real: el .stats del backup y la verificación post-restore se
    comparan con valores exactos, no con aproximaciones de pg_stat.
    """
    validar_nombre_bd(base_datos)
    tablas: dict = {}
    with get_db_connection(base_datos) as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
        )
        nombres = [row[0] for row in cur.fetchall()]
        for nombre in nombres:
            try:
                cur.execute(f'SELECT COUNT(*) FROM "{nombre}"')
                tablas[nombre] = int(cur.fetchone()[0])
            except psycopg2.Error:
                logger.warning("No se pudo contar filas de %s en %s", nombre, base_datos)
                conn.rollback()
        cur.close()
    return len(nombres), tablas


# ---------------------------------------------------------------------------
# Sidecars (.sha256 + .stats)
# ---------------------------------------------------------------------------

def _escribir_sha256(ruta_dump: Path) -> str:
    sha = _calcular_sha256(ruta_dump)
    ruta_sha = ruta_dump.with_suffix(ruta_dump.suffix + ".sha256")
    ruta_sha.write_text(f"{sha}  {ruta_dump.name}\n")
    return sha


def _leer_stats(ruta_dump: Path) -> Optional[dict]:
    ruta_stats = ruta_dump.with_suffix(ruta_dump.suffix + ".stats")
    if not ruta_stats.exists():
        return None
    try:
        return json.loads(ruta_stats.read_text())
    except (OSError, json.JSONDecodeError):
        return None


def _escribir_stats(base_datos: str, ruta_dump: Path) -> dict:
    n_tablas, filas = _conteo_filas_por_tabla(base_datos)
    stats = {
        "fecha_iso": datetime.now().isoformat(timespec="seconds"),
        "base_datos": base_datos,
        "n_tablas": n_tablas,
        "filas_por_tabla": filas,
    }
    ruta_stats = ruta_dump.with_suffix(ruta_dump.suffix + ".stats")
    ruta_stats.write_text(json.dumps(stats, ensure_ascii=False, indent=2))
    return stats


# ---------------------------------------------------------------------------
# Listado
# ---------------------------------------------------------------------------

def listar_backups(base_datos: str, verificacion_detallada: bool = False) -> dict:
    """Lista los dumps de una BD + las BDs `_prev_*` de rollback disponibles.

    `verificacion_detallada=True` corre pg_restore -l para cada dump (se usa
    antes de restaurar; para pintar la tabla es redundante, el checksum es el
    que valida la integridad del archivo).
    """
    validar_nombre_bd(base_datos)
    _asegurar_backup_dir()

    prefijo = f"{base_datos}_"
    resultados: List[dict] = []
    if BACKUP_DIR.exists():
        for ruta in sorted(BACKUP_DIR.glob("*.dump"), key=lambda p: p.name, reverse=True):
            if not ruta.name.startswith(prefijo):
                continue
            # Un dump se cuenta para una sola BD, no para otra cuyo nombre
            # comparte prefijo (ej.: caguayo y caguayo_sa).
            if _base_de_nombre_archivo(ruta.name) != base_datos:
                continue

            fecha = _extraer_fecha_de_nombre(ruta.name)
            fecha_dt = fecha or datetime.fromtimestamp(ruta.stat().st_mtime)
            stat = ruta.stat()

            checksum_ok: Optional[bool] = None
            sha_guardado = _leer_sha256_guardado(ruta)
            if sha_guardado:
                checksum_ok = sha_guardado == _calcular_sha256(ruta)

            error_cabecera: Optional[str] = None
            ok, mensaje = _pg_restore_toc_valido(ruta)
            if not ok:
                error_cabecera = mensaje

            resultados.append(
                {
                    "archivo": ruta.name,
                    "base_datos": base_datos,
                    "fecha": fecha_dt.strftime("%d/%m/%Y %H:%M"),
                    "fecha_iso": fecha_dt.isoformat(timespec="seconds"),
                    "tamano_bytes": stat.st_size,
                    "checksum_ok": checksum_ok,
                    "cabecera_ok": not bool(error_cabecera),
                    "detalle_error": error_cabecera,
                }
            )

    # BDs _prev_*: copias de rollback que deja cada restore
    previas: List[dict] = []
    try:
        with get_db_connection(os.getenv("ADMIN_DB_NAME", "postgres")) as conn:
            cur = conn.cursor()
            cur.execute("SELECT datname FROM pg_database")
            nombres = [row[0] for row in cur.fetchall()]
            cur.close()
        patron = re.compile(rf"^{re.escape(base_datos)}{re.escape(PREFIJO_PREVIA)}(.+)$")
        for nombre in nombres:
            match = patron.match(nombre)
            if not match:
                continue
            fecha: Optional[datetime] = None
            m2 = re.match(r"^(\d{8})_(\d{6})$", match.group(1))
            if m2:
                try:
                    fecha = datetime.strptime(match.group(1), "%Y%m%d_%H%M%S")
                except ValueError:
                    fecha = None
            previas.append(
                {
                    "nombre": nombre,
                    "fecha": fecha.isoformat(timespec="seconds") if fecha else None,
                }
            )
        previas.sort(key=lambda p: p["fecha"] or "", reverse=True)
    except Exception as e:  # el listado de dumps no debe interrumpirse
        logger.warning("No se pudo listar BDs _prev_ de %s: %s", base_datos, e)

    return {"base_datos": base_datos, "backups": resultados, "bds_previas": previas}


# ---------------------------------------------------------------------------
# Jobs en background
# ---------------------------------------------------------------------------

class BackupJobManager:
    """Registro en memoria de jobs de backup/restauración (thread-safe).

    Un único job ACTIVO por base de datos: si ya hay uno corriendo para esa BD,
    nuevas peticiones se rechazan con 409 desde el router. El estado vive en
    memoria del proceso: si uvicorn reinicia a mitad de job, el resultado queda
    en los logs del servidor (el resto del flujo es idempotente).
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._jobs: dict = {}

    # ---------------- helpers internos ----------------

    def _nuevo_job(self, tipo: str, base_datos: str, archivo: Optional[str]) -> dict:
        job = {
            "id": uuid.uuid4().hex[:12],
            "tipo": tipo,
            "base_datos": base_datos,
            "archivo": archivo,
            "estado": "pendiente",
            "pasos": [],
            "resultado": None,
            "error": None,
            "creado_iso": datetime.now().isoformat(timespec="seconds"),
            "terminado_iso": None,
        }
        with self._lock:
            self._jobs[job["id"]] = job
        return job

    def _paso(self, job: dict, paso: str, estado: str, detalle: Optional[str] = None):
        """Registra/actualiza un paso visible al frontend vía polling."""
        with self._lock:
            nuevo = {"paso": paso, "estado": estado}
            if detalle:
                nuevo["detalle"] = detalle
            existente = next((p for p in job["pasos"] if p["paso"] == paso), None)
            if existente:
                existente.update(nuevo)
            else:
                job["pasos"].append(nuevo)

    def _hay_job_activo_para(self, base_datos: str) -> bool:
        with self._lock:
            return any(
                j["base_datos"] == base_datos
                and j["estado"] in ("pendiente", "ejecutando")
                for j in self._jobs.values()
            )

    def _terminar(self, job: dict, estado: str, resultado: Optional[dict], error: Optional[str]):
        with self._lock:
            job["estado"] = estado
            job["resultado"] = resultado
            job["error"] = error
            job["terminado_iso"] = datetime.now().isoformat(timespec="seconds")
            # Poda: guarda como máximo 20 jobs por BD en memoria
            de_esta_bd = [j for j in self._jobs.values() if j["base_datos"] == job["base_datos"]]
            if len(de_esta_bd) > 20:
                for viejo in sorted(de_esta_bd, key=lambda j: j["creado_iso"] or "")[
                    : len(de_esta_bd) - 20
                ]:
                    self._jobs.pop(viejo["id"], None)

    # ---------------- API pública -----------------

    def obtener(self, job_id: str) -> Optional[dict]:
        with self._lock:
            return self._jobs.get(job_id)

    def lanzar_backup(self, base_datos: str) -> dict:
        if self._hay_job_activo_para(base_datos):
            raise RuntimeError(
                "Ya hay un backup/restauración en ejecución para esta dependencia"
            )
        job = self._nuevo_job("backup", base_datos, None)
        with self._lock:
            job["estado"] = "ejecutando"
        threading.Thread(target=self._ejecutar_backup, args=(job,), daemon=True).start()
        return job

    def lanzar_restaurar(self, base_datos: str, dump: Path) -> dict:
        """Lanza el job de restore. `dump` DEBE venir ya validado por el router."""
        if self._hay_job_activo_para(base_datos):
            raise RuntimeError(
                "Ya hay un backup/restauración en ejecución para esta dependencia"
            )
        job = self._nuevo_job("restaurar", base_datos, dump.name)
        with self._lock:
            job["estado"] = "ejecutando"
        threading.Thread(target=self._ejecutar_restaurar, args=(job, dump), daemon=True).start()
        return job

    # ---------------- job: crear backup ----------------

    def _ejecutar_backup(self, job: dict) -> None:
        base_datos = job["base_datos"]
        sha = ""
        stats: Optional[dict] = None
        try:
            validar_nombre_bd(base_datos)

            self._paso(job, "conectando", "en_curso")
            with get_db_connection(base_datos) as conn:
                cur = conn.cursor()
                cur.execute("SELECT 1")
                cur.close()
            self._paso(job, "conectando", "ok")

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            destino = _asegurar_backup_dir() / f"{base_datos}_{timestamp}.dump"
            job["archivo"] = destino.name

            self._paso(job, "pg_dump", "en_curso")
            _ejecutar_pg_dump(base_datos, destino)
            tamano = destino.stat().st_size
            if tamano == 0:
                destino.unlink(missing_ok=True)
                raise RuntimeError(
                    "pg_dump produjo un archivo vacío — no se registra como backup válido"
                )
            self._paso(job, "pg_dump", "ok", f"{tamano / 1_000_000:.1f} MB")

            self._paso(job, "verificar_cabecera", "en_curso")
            ok, mensaje = _pg_restore_toc_valido(destino)
            if not ok:
                # El dump es inservible: no lo dejamos pasar por "backup válido".
                destino.unlink(missing_ok=True)
                destino.with_suffix(".dump.sha256").unlink(missing_ok=True)
                raise RuntimeError(
                    f"El dump generado no es legible por pg_restore: {mensaje}"
                )
            self._paso(job, "verificar_cabecera", "ok")

            self._paso(job, "checksum", "en_curso")
            sha = _escribir_sha256(destino)
            self._paso(job, "checksum", "ok", f"sha256={sha[:16]}…")

            self._paso(job, "stats", "en_curso")
            try:
                stats = _escribir_stats(base_datos, destino)
                filas = sum(stats["filas_por_tabla"].values())
                self._paso(job, "stats", "ok", f"{stats['n_tablas']} tablas, {filas} filas")
            except Exception as e:
                stats = None
                self._paso(job, "stats", "advertencia", f"No se generaron stats: {e}")

            self._terminar(
                job,
                "completado",
                resultado={
                    "archivo": destino.name,
                    "tamano_bytes": tamano,
                    "n_tablas": stats["n_tablas"] if stats else None,
                    "sha256": sha,
                },
                error=None,
            )
            logger.info("Backup de %s completado: %s", base_datos, destino.name)
        except Exception as e:
            logger.exception("Job de backup falló para %s", base_datos)
            self._terminar(job, "fallido", resultado=None, error=str(e))

    # ---------------- job: restaurar ----------------

    def _ejecutar_restaurar(self, job: dict, dump: Path) -> None:
        bd = job["base_datos"]
        tmp = f"{bd}{PREFIJO_RESTORE_TMP}{job['id']}"[:63]
        previa = f"{bd}{PREFIJO_PREVIA}{datetime.now().strftime('%Y%m%d_%H%M%S')}"[:63]
        try:
            validar_nombre_bd(bd)
            validar_nombre_bd(tmp)
            validar_nombre_bd(previa)

            # ---- 1. Verificación previa (obligatoria, no desactivable) ----
            self._paso(job, "verificar_checksum", "en_curso")
            sha_guardado = _leer_sha256_guardado(dump)
            if sha_guardado:
                if sha_guardado != _calcular_sha256(dump):
                    raise RuntimeError(
                        "El checksum SHA256 del archivo NO coincide con el .sha256 guardado: "
                        "el dump está corrupto o fue modificado. Restauración cancelada."
                    )
                self._paso(job, "verificar_checksum", "ok")
            else:
                self._paso(
                    job, "verificar_checksum", "advertencia", "No existe .sha256 para comparar"
                )

            self._paso(job, "verificar_cabecera", "en_curso")
            ok, mensaje = _pg_restore_toc_valido(dump)
            if not ok:
                raise RuntimeError(f"La cabecera del dump no es legible: {mensaje}")
            self._paso(job, "verificar_cabecera", "ok")

            # ---- 2. Restore a BD temporal (jamás sobre la BD activa) ----
            self._paso(job, "restaurando", "en_curso", f"BD temporal {tmp}")
            self._drop_bd_si_existe(tmp)
            self._crear_bd_vacia(tmp)
            codigo, stderr = _ejecutar_pg_restore(dump, tmp)
            if codigo > 1:
                raise RuntimeError(
                    f"pg_restore falló (código {codigo}): {stderr[-500:] if stderr else 'sin detalle'}"
                )
            advertencias = codigo == 1 or bool(stderr)
            self._paso(
                job,
                "restaurando",
                "advertencia" if advertencias else "ok",
                (
                    f"completado con avisos: {stderr[-200:]}"
                    if advertencias
                    else "completado sin avisos"
                ),
            )

            # ---- 3. Verificación post-restore (tablas + filas vs .stats) ----
            self._paso(job, "verificar_filas", "en_curso")
            n_tablas, filas_restore = _conteo_filas_por_tabla(tmp)
            if n_tablas == 0:
                raise RuntimeError("Tras el restore la BD temporal no tiene ninguna tabla")
            stats_backup = _leer_stats(dump)
            diferencias: List[str] = ["sin .stats del backup: verificación solo de estructura"]
            if stats_backup:
                filas_backup = stats_backup.get("filas_por_tabla", {})
                difs = [
                    f"{tabla}: esperado {esperado}, restaurado {filas_restore.get(tabla)}"
                    for tabla, esperado in filas_backup.items()
                    if filas_restore.get(tabla) != esperado
                ]
                diferencias = difs or []
            self._paso(
                job,
                "verificar_filas",
                "ok",
                (
                    f"{n_tablas} tablas; diferencias vs .stats: {'; '.join(diferencias[:5])}"
                    if diferencias
                    else f"{n_tablas} tablas; conteo de filas coincide con el .stats del backup"
                ),
            )

            # ---- 4. Swap: la BD activa queda como _prev_ (rollback manual) ----
            self._paso(job, "swap", "en_curso")
            self._terminar_conexiones(bd)
            # Se eliminan las copias de rollback anteriores de esta BD: queda
            # una única copia genérica _prev_ (la del restore que acaba de entrar).
            for antigua in self._bds_previas_de(bd):
                self._drop_bd_si_existe(antigua)
            self._alter_database(f"ALTER DATABASE {bd} RENAME TO {previa}")
            self._alter_database(f"ALTER DATABASE {tmp} RENAME TO {bd}")
            self._paso(
                job,
                "swap",
                "ok",
                f"BD activa anterior conservada como '{previa}' para rollback manual",
            )

            # ---- 5. Liberar el pool de conexiones cacheado de esa BD ----
            self._paso(job, "reset_pool", "en_curso")
            try:
                import asyncio

                from src.database.connection import reset_engine

                # El job corre en su propio hilo (sin event loop de FastAPI):
                # se necesita un loop propio para esperar el dispose().
                asyncio.run(reset_engine(bd))
                self._paso(job, "reset_pool", "ok")
            except Exception as e:
                self._paso(
                    job,
                    "reset_pool",
                    "advertencia",
                    f"No se pudo reiniciar el pool de conexiones: {e}",
                )

            self._terminar(
                job,
                "completado",
                resultado={
                    "n_tablas": n_tablas,
                    "filas_por_tabla": filas_restore,
                    "bd_previa": previa,
                    "diferencias_stats": diferencias,
                },
                error=None,
            )
            logger.info("Restore de %s desde %s completado (previa: %s)", bd, dump.name, previa)
        except Exception as e:
            logger.exception("Job de restauración falló para %s", bd)
            self._terminar(job, "fallido", resultado=None, error=str(e))
            try:  # limpieza de la BD temporal a medias, si quedó
                self._drop_bd_si_existe(tmp)
            except Exception:
                pass

    # ---------------- helpers de BD administrativa ----------------

    def _crear_bd_vacia(self, nombre: str) -> None:
        validar_nombre_bd(nombre)
        with get_db_connection(os.getenv("ADMIN_DB_NAME", "postgres")) as conn:
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute(f"CREATE DATABASE {nombre} WITH ENCODING 'UTF8' TEMPLATE template0")
            cur.close()

    def _drop_bd_si_existe(self, nombre: str) -> None:
        validar_nombre_bd(nombre)
        with get_db_connection(os.getenv("ADMIN_DB_NAME", "postgres")) as conn:
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute(f"DROP DATABASE IF EXISTS {nombre}")
            cur.close()

    def _alter_database(self, sql: str) -> None:
        with get_db_connection(os.getenv("ADMIN_DB_NAME", "postgres")) as conn:
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute(sql)
            cur.close()

    def _bds_previas_de(self, bd: str) -> List[str]:
        patron = f"{bd}{PREFIJO_PREVIA}"
        with get_db_connection(os.getenv("ADMIN_DB_NAME", "postgres")) as conn:
            cur = conn.cursor()
            cur.execute("SELECT datname FROM pg_database")
            nombres = [row[0] for row in cur.fetchall()]
            cur.close()
        return [n for n in nombres if n.startswith(patron)]

    def _terminar_conexiones(self, bd: str) -> None:
        """Corta las conexiones activas a la BD activa para que el RENAME no bloquee."""
        with get_db_connection(os.getenv("ADMIN_DB_NAME", "postgres")) as conn:
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                "WHERE datname = %s AND pid <> pg_backend_pid()",
                (bd,),
            )
            cur.close()


backup_job_manager = BackupJobManager()
