# -*- coding: utf-8 -*-
"""Migración del legacy desde la aplicación.

El dump del legacy viene en el repositorio, en `etl/legacy/caguayo_comercial.sql`.
Antes se subía desde la pantalla de configuración; ya no: el ETL resuelve la ruta
por su cuenta y este servicio se limita a lanzarlo. Para migrar otro legacy basta
con reemplazar ese fichero.

Lo que hace este servicio NO es destruir nada: se limita a lanzar el ETL, que
es idempotente. Si la base ya está migrada, el resultado es 0 inserciones.

Decisiones que conviene no saltarse al leer esto:

* El ETL NUNCA recibe una ruta del cliente. No hay ninguna petición que pueda
  decir "lee este otro fichero del disco": la ruta la resuelve el propio ETL
  desde su carpeta `legacy/`.
* Antes de nada se comprueba que la base del ETL y la que sirve la aplicación
  son la misma. Si difieren, no se hace nada: migrar una base que nadie está
  viendo es un trabajo perdido.
* Hay un advisory lock, porque dos migraciones simultáneas se pisan.
"""
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_session

#: Dónde vive el dump del legacy. Es el mismo valor que el ETL tiene por
#: defecto, pero se comprueba aquí para poder decir "falta el fichero" con un 400
#: claro en vez de dejar que reviente un FileNotFoundError dentro del subproceso.
DIRECTORIO_LEGACY = Path(__file__).resolve().parents[3] / "etl" / "legacy"
DUMP_LEGACY = DIRECTORIO_LEGACY / "caguayo_comercial.sql"

#: Clave del advisory lock.
#:
#: El sufijo se deriva del nombre de la base con crc32 y NO con hash() de
#: Python, que va salted por proceso: con hash() cada worker sacaría una clave
#: distinta y el lock no protegería de nada, que es justo lo que tiene que
#: hacer. Con crc32 la clave es la misma en todos los procesos.
LOCK_BASE = 987654321


def _clave_lock() -> int:
    import zlib
    base = os.getenv("POSTGRES_DB") or os.getenv("PG_DB") or "caguayo_sa"
    return LOCK_BASE + (zlib.crc32(base.encode("utf-8")) % 100000)

ETL_DIR = Path(__file__).resolve().parents[3] / "etl"

#: Resultado de una ejecución, indexado por sección del log del ETL.
SECCIONES = ("A", "B", "C", "D", "E", "F", "G", "H", "I", "J")
_TITULOS = {
    "A": "Artistas", "B": "Clientes", "C": "TCP / MIPYME",
    "D": "Artistas con CI normalizado", "E": "Cuentas bancarias",
    "F": "Usuarios", "G": "Cuentas de la dependencia",
    "H": "Especialidades del artista", "I": "Tipos de contrato",
    "J": "Grupos del legacy",
}

#: Números que el ETL imprime y que resumen lo que va a hacer.
RE_A_MIGRAR = re.compile(r"Filas a migrar:\s*(\d+)")
RE_A_INSERTAR = re.compile(r"(?:Nuevas a insertar|a insertar|a migrar|usuarios a mover):\s*(\d+)")
RE_ENLAZAR = re.compile(r"Artistas a enlazar:\s*(\d+)")
RE_RESULTADO = re.compile(r"RESULTADO:\s*(.+)")


# --------------------------------------------------------------------------
# El dump del legacy
# --------------------------------------------------------------------------
def dump_legacy() -> dict:
    """Si el fichero del legacy está en su sitio y qué pese.

    El ETL resuelve la ruta por su cuenta (ver config.DUMP_MARIADB), pero
    comprobarlo aquí convierte "no hay dump" en un 400 que dice exactamente
    dónde debería estar, en vez de un FileNotFoundError dentro del subproceso
    que el usuario no puede interpretar.
    """
    existe = DUMP_LEGACY.exists()
    return {
        "disponible": existe,
        "ruta": str(DUMP_LEGACY),
        "bytes": DUMP_LEGACY.stat().st_size if existe else 0,
    }


def _exigir_dump() -> str:
    info = dump_legacy()
    if not info["disponible"]:
        raise HTTPException(
            status_code=400,
            detail="Falta el dump del legacy en %s. Cópialo ahí y vuelve a "
                   "intentar; el ETL no busca en ningún otro sitio."
                   % DUMP_LEGACY,
        )
    return str(DUMP_LEGACY)


# --------------------------------------------------------------------------
# Guardas
# --------------------------------------------------------------------------
def comprobar_identidad() -> dict:
    """Que la base del ETL y la que sirve la app sean la misma.

    El ETL lee POSTGRES_DB; la app usa AUTH_DATABASE y la de DATABASE_URL. Si
    no coinciden, migrar produce una base que nadie está viendo.
    """
    etl = os.getenv("POSTGRES_DB") or os.getenv("PG_DB") or "caguayo_sa"
    auth = os.getenv("AUTH_DATABASE")
    central = os.getenv("CENTRAL_DATABASE")
    url = os.getenv("DATABASE_URL", "")
    activa = ""
    if url:
        activa = url.rsplit("/", 1)[-1].split("?")[0]

    incoherencias = []
    for nombre, valor in (("AUTH_DATABASE", auth), ("CENTRAL_DATABASE", central),
                         ("DATABASE_URL", activa)):
        if valor and valor != etl:
            incoherencias.append("%s apunta a %s y el ETL a %s"
                                  % (nombre, valor, etl))
    return {
        "base_etl": etl,
        "base_app": activa or auth or "(sin definir)",
        "coherente": not incoherencias,
        "detalle": incoherencias,
    }


async def _tomar_lock(conn: AsyncSession) -> bool:
    """Advisory lock. Sin esto, dos migraciones a la vez se pisan."""
    from sqlalchemy import text
    resultado = await conn.execute(
        text("SELECT pg_try_advisory_lock(:clave)"), {"clave": _clave_lock()}
    )
    return bool(resultado.scalar())


async def _liberar_lock(conn: AsyncSession) -> None:
    from sqlalchemy import text
    try:
        await conn.execute(
            text("SELECT pg_advisory_unlock(:clave)"), {"clave": _clave_lock()}
        )
    except Exception:
        # Si la sesión se cayó, la conexión se cierra y Postgres suelta el lock
        # solo. Fallar aquí no debe enmascarar el resultado de la migración.
        pass


# --------------------------------------------------------------------------
# Ejecución del ETL
# --------------------------------------------------------------------------
def _entorno() -> dict:
    """Entorno para el subproceso.

    No se fija `DUMP_MARIADB`: el ETL ya sabe encontrar el dump en su carpeta
    `legacy/`. Cuanto menos le pase este servicio, menos formas hay de que la
    ruta y lo que de verdad lee el ETL se desincronicen.
    """
    env = os.environ.copy()
    env.setdefault("PROYECTO_DIR", str(ETL_DIR.parent))
    return env


def _interpretar(salida: str, codigo: int, commit: bool) -> dict:
    """Saca del log del ETL un resumen por fase."""
    fase_actual = None
    fases: List[dict] = []
    resultado = None

    for linea in salida.splitlines():
        cabecera = re.match(r"=== FASE ([A-J]):", linea.strip())
        if cabecera:
            fase_actual = {"letra": cabecera.group(1),
                           "titulo": _TITULOS[cabecera.group(1)],
                           "a_insertar": 0, "detalle": []}
            fases.append(fase_actual)
            continue
        if "RESUMEN DE LA MIGRACIÓN" in linea or "VERIFICACIÓN" in linea:
            fase_actual = None
            continue

        m = RE_RESULTADO.search(linea)
        if m:
            resultado = m.group(1).strip()
            continue

        if fase_actual is None:
            continue

        for patron, etiqueta in ((RE_A_MIGRAR, "filas"),
                                 (RE_A_INSERTAR, "filas"),
                                 (RE_ENLAZAR, "enlaces")):
            mm = patron.search(linea)
            if mm:
                valor = int(mm.group(1))
                if etiqueta == "enlaces":
                    fase_actual["a_insertar"] += valor
                else:
                    fase_actual["a_insertar"] = max(
                        fase_actual["a_insertar"], valor)
                fase_actual["detalle"].append(linea.strip())
                break

    total = sum(f["a_insertar"] for f in fases)
    # En la simulación el ETL sale ANTES de verificar, así que no hay línea
    # "RESULTADO". Judgar la análisis por su ausencia marcaba todo como fallido
    # cuando en realidad ha ido bien. El código de salida y el total bastan.
    if commit:
        ok = codigo == 0 and (resultado or "").startswith("TODO CORRECTO")
    else:
        ok = codigo == 0
    return {
        "codigo": codigo,
        "fases": fases,
        "total_a_insertar": total,
        "resultado": resultado,
        "ok": ok,
    }


def ejecutar_etl(commit: bool, timeout: int = 900) -> dict:
    """Lanza el ETL. `commit=False` es el análisis."""
    _exigir_dump()
    comando = [sys.executable, "main.py"]
    if commit:
        comando.append("--commit")

    try:
        proc = subprocess.run(
            comando, cwd=str(ETL_DIR), env=_entorno(),
            capture_output=True, text=True, timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=504,
            detail="La migración pasó de %d s y se detuvo. Mira el log del ETL."
                   % timeout,
        )

    salida = (proc.stdout or "") + (proc.stderr or "")
    informe = _interpretar(salida, proc.returncode, commit)
    informe["log"] = salida.splitlines()[-200:]
    informe["commit"] = commit
    return informe


async def migrar(conn: AsyncSession, commit: bool) -> dict:
    """Analiza o ejecuta la migración, con el lock puesto."""
    identidad = comprobar_identidad()
    if not identidad["coherente"]:
        raise HTTPException(
            status_code=409,
            detail="Las bases no coinciden, no se hace nada. %s"
                   % "; ".join(identidad["detalle"]),
        )

    if not await _tomar_lock(conn):
        raise HTTPException(
            status_code=409,
            detail="Ya hay una migración en marcha. Espera a que termine.",
        )
    try:
        return ejecutar_etl(commit=commit)
    finally:
        await _liberar_lock(conn)


async def estado(conn: AsyncSession) -> dict:
    """Recuentos y salud de la base, para pintar en pantalla."""
    from sqlalchemy import text
    consulta = {}
    for tabla in ("clientes", "clientes_persona_natural",
                  "clientes_persona_juridica", "cuenta", "usuarios",
                  "grupo", "especialidades_artisticas", "tipo_contrato",
                  "tipo_convenio"):
        r = await conn.execute(text("SELECT count(*) FROM %s" % tabla))
        consulta[tabla] = r.scalar() or 0

    r = await conn.execute(text(
        "SELECT count(*) FROM migracion_log WHERE severidad = 'ERROR'"))
    errores = r.scalar() or 0
    r = await conn.execute(text("SELECT version_num FROM alembic_version"))
    revision = r.scalar()

    # NO se toma el lock para mirarlo: en la misma conexión es reentrante y
    # devolvería siempre "ocupado". Se consulta pg_locks, que ve las sesiones
    # de los demás procesos.
    clave = _clave_lock()
    r = await conn.execute(
        text("SELECT count(*) FROM pg_locks "
             "WHERE locktype = 'advisory' AND classid = :alto AND objid = :bajo"),
        {"alto": clave >> 32, "bajo": clave & 0xFFFFFFFF},
    )
    en_curso = (r.scalar() or 0) > 0

    dump = dump_legacy()
    return {
        "recuentos": consulta,
        "errores_migracion": errores,
        "revision": revision,
        "identidad": comprobar_identidad(),
        "operacion_en_curso": en_curso,
        "dump_disponible": dump["disponible"],
        "dump_ruta": dump["ruta"],
    }
