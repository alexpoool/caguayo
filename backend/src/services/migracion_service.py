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
import importlib.util
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_session

# Clave del advisory lock.
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

#: Config del ETL: `etl/config.py` no es un paquete y el directorio del ETL
#: tiene módulos (`db`, `log`) que colisionarían con los del backend si se
#: añadiera a `sys.path`. Se carga por ruta, bajo un nombre privado.
CONFIG_ETL = ETL_DIR / "config.py"

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
# El volcado del legacy
# --------------------------------------------------------------------------
def dump_legacy() -> dict:
    """Si el volcado del legacy está en su sitio, y cuál es.

    La ruta la contesta `etl/config.py` —el mismo módulo que va a leer el
    subproceso—, no una constante repetida aquí. Duplicarla es justo lo que
    rompió esto: `config.py` pasó a leer `etl/dumps/comercial.sql` y el backend
    siguió mirando `etl/legacy/caguayo_comercial.sql`, así que la pantalla decía
    que no había volcado con el volcado de 6 MB en su sitio y el botón de
    ejecutar quedaba deshabilitado sin explicación.

    Si la config no se puede cargar, `disponible` sale False y `motivo` lo dice:
    sin poder preguntar, tampoco se puede afirmar que esté.
    """
    modulo, motivo = cargar_config_etl()
    if modulo is None:
        return {
            "disponible": False,
            "ruta": None,
            "bytes": 0,
            "motivo": "No se pudo leer la configuración del ETL: %s" % motivo,
        }

    ruta = Path(modulo.DUMP_MARIADB)
    existe = ruta.exists()
    return {
        "disponible": existe,
        "ruta": str(ruta),
        "bytes": ruta.stat().st_size if existe else 0,
        "motivo": None if existe else (
            "No existe %s. Se deja ahí con `main.py --generar-dumps` (mysqldump "
            "contra el legacy), o con `main.py --adoptar` si ya tienes un .sql."
            % ruta),
    }


def _exigir_dump() -> None:
    info = dump_legacy()
    if info["disponible"]:
        return
    raise HTTPException(
        status_code=400,
        detail=info.get("motivo") or "No se pudo determinar la ruta del volcado",
    )


# --------------------------------------------------------------------------
# Guardas
# --------------------------------------------------------------------------
def cargar_config_etl():
    """Carga `etl/config.py` y devuelve (módulo, motivo_del_fallo).

    Se ejecuta en proceso, con el mismo PROYECTO_DIR que prepara `_entorno()`
    para el subproceso, para que lo que se ve aquí sea exactamente lo que verá
    el ETL. PROYECTO_DIR se restaura al terminar: no es asunto del resto de la
    aplicación.

    Ante cualquier fallo devuelve (None, motivo). El guard avisa y deja pasar:
    quedarse sin pantalla de migración por un `etl/` no desplegado sería peor
    que avisar de lo que no se ha verificado.
    """
    if not CONFIG_ETL.exists():
        return None, "no existe %s" % CONFIG_ETL

    previo = os.environ.get("PROYECTO_DIR")
    os.environ["PROYECTO_DIR"] = previo or str(ETL_DIR.parent)
    try:
        spec = importlib.util.spec_from_file_location("_caguayo_etl_config",
                                                       CONFIG_ETL)
        if spec is None or spec.loader is None:
            return None, "no se pudo crear el loader de %s" % CONFIG_ETL
        modulo = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(modulo)
        return modulo, None
    except Exception as exc:  # noqa: BLE001 - el motivo va al aviso
        return None, "%s: %s" % (type(exc).__name__, exc)
    finally:
        if previo is None:
            os.environ.pop("PROYECTO_DIR", None)
        else:
            os.environ["PROYECTO_DIR"] = previo


def _base_destino_etl():
    """La base a la que va a escribir el ETL, según su propia configuración.

    Devuelve (base, motivo_del_fallo). `base` es None si no se pudo saber.
    """
    modulo, motivo = cargar_config_etl()
    if modulo is None:
        return None, motivo
    return getattr(modulo.POSTGRES, "database", None), None


def comprobar_identidad() -> dict:
    """Que la base del ETL y la que sirve la app sean la misma.

    El ETL no lee POSTGRES_DB del entorno del backend: lo saca de `etl/config.py`,
    que a su vez lo lee de los `.env`. El backend nunca lo tuvo en `os.environ`,
    así que este guard comparaba el literal "caguayo_sa" contra la base de la
    aplicación. Siempre coherente, y un ETL apuntado a otra base —cambiando el
    `.env`, que es como se documenta retargetizarlo— pasaba inadvertido.

    Ahora lo pregunta al ETL. Del lado de la app se usa la base de la sesión,
    que es la que atienden los endpoints: hoy siempre AUTH_DATABASE, porque
    `set_current_db()` todavía no lo llama nadie.

    Si la base del ETL no se puede determinar, `coherente` sigue en True para
    no bloquear la migración; `verificado` en False y `detalle` lo dicen. Sólo
    bloquea cuando sabe que difieren.
    """
    from src.database.connection import get_current_db

    base_etl, motivo = _base_destino_etl()
    base_app = get_current_db() or "(sin definir)"

    if base_etl is None:
        return {
            "base_etl": "(desconocida)",
            "base_app": base_app,
            "coherente": True,
            "verificado": False,
            "fuente_etl": "etl/config.py (no se pudo cargar)",
            "fuente_app": "sesión de la aplicación",
            "detalle": [
                "No se pudo determinar la base del ETL: %s. La migración va a "
                "salir sin comprobar contra qué base escribe." % motivo
            ],
        }

    if base_etl == base_app:
        return {
            "base_etl": base_etl,
            "base_app": base_app,
            "coherente": True,
            "verificado": True,
            "fuente_etl": "etl/config.py (backend/.env, luego .env)",
            "fuente_app": "sesión de la aplicación",
            "detalle": [],
        }

    return {
        "base_etl": base_etl,
        "base_app": base_app,
        "coherente": False,
        "verificado": True,
        "fuente_etl": "etl/config.py (backend/.env, luego .env)",
        "fuente_app": "sesión de la aplicación",
        "detalle": [
            "El ETL migraría a %s (su config) y la aplicación está sirviendo %s "
            "(su sesión). Migrar produce una base que nadie está viendo."
            % (base_etl, base_app)
        ],
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
        "dump_motivo": dump.get("motivo"),
    }
