# -*- coding: utf-8 -*-
"""Configuración del ETL de migración MariaDB -> PostgreSQL."""
import os
from dataclasses import dataclass
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DIR_DATA = BASE_DIR / "data"
DIR_TMP = DIR_DATA / "tmp"
DIR_SQL = BASE_DIR / "sql"

PROYECTO = Path(os.getenv("PROYECTO_DIR", str(BASE_DIR.parent)))

#: Ficheros de configuración, en orden de prioridad. El primero gana; los
#: siguientes sólo rellenan lo que falte.
#:
#: `backend/.env` va primero porque es el dueño de la configuración de base:
#: `load_dotenv()` lo lee la aplicación al arrancar. El `.env` de la raíz lo
#: sourcean `scripts/dev.sh` y `scripts/setup.sh`, y se conserva aquí por
#: compatibilidad con instalaciones que no movieron las variables.
#:
#: Que las dos fuentes vivan en ficheros distintos era el origen de que el
#: backend no supiera a qué base iba a escribir el ETL: éste leía el `.env` de
#: la raíz y el backend, sólo el suyo.
FUENTES_ENV = (PROYECTO / "backend" / ".env", PROYECTO / ".env")


def _leer_env(ruta: Path) -> dict:
    valores = {}
    if not ruta.exists():
        return valores
    for linea in ruta.read_text(encoding="utf-8", errors="replace").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        clave, valor = linea.split("=", 1)
        valores[clave.strip()] = valor.strip().strip('"').strip("'")
    return valores


def _leer_todos(rutas) -> dict:
    """Combina varios `.env`. El primero manda; el resto rellena huecos."""
    valores = {}
    for ruta in rutas:
        for clave, valor in _leer_env(ruta).items():
            valores.setdefault(clave, valor)
    return valores


_ENV = _leer_todos(FUENTES_ENV)


def _valor(*claves, defecto=""):
    """Primer valor presente entre las variables de entorno y el .env del proyecto.

    Se aceptan las dos convenciones: PG_DB y POSTGRES_DB.
    """
    for clave in claves:
        valor = os.getenv(clave)
        if valor:
            return valor
    for clave in claves:
        valor = _ENV.get(clave)
        if valor:
            return valor
    return defecto


@dataclass
class ServerConfig:
    host: str
    port: int
    user: str
    password: str
    database: str


POSTGRES = ServerConfig(
    host=_valor("PG_HOST", "DB_HOST", defecto="127.0.0.1"),
    port=_valor("DB_PORT", "PG_PORT", defecto="5432"),
    user=_valor("PG_USER", "POSTGRES_USER", defecto="postgres"),
    password=_valor("PG_PASSWORD", "POSTGRES_PASSWORD", defecto="postgres"),
    database=_valor("PG_DB", "POSTGRES_DB", defecto="caguayo_sa"),
)

# --- El legacy: MariaDB, sólo para extraer los volcados ---------------------
#
# El ETL no lee del legacy: lee volcados suyos. Estas variables sólo las usa
# `generar_dumps.py`, para fabricar esos volcados con mysqldump. En una máquina
# donde el legacy ya no existe no hacen falta y se pueden ignorar.
LEGACY = ServerConfig(
    host=_valor("LEGACY_HOST", defecto="127.0.0.1"),
    port=_valor("LEGACY_PORT", defecto="3306"),
    user=_valor("LEGACY_USER", defecto="root"),
    password=_valor("LEGACY_PASSWORD", defecto=""),
    database="",
)

LEGACY_DB_COMERCIAL = _valor("LEGACY_DB_COMERCIAL", defecto="caguayo_comercial")
LEGACY_DB_PRINCIPAL = _valor("LEGACY_DB_PRINCIPAL", defecto="caguayo")

# --- Dónde viven los volcados ---------------------------------------------
#
# `dumps/comercial.sql` y `dumps/principal.sql` son el sitio por defecto, de
# modo que en una máquina recién desplegada el ETL funciona sin exportar nada:
# se ejecuta `main.py --generar-dumps` (o `--adoptar`) una vez y ya.
DIR_DUMPS = Path(os.getenv("DUMP_DIR", str(BASE_DIR / "dumps")))

DUMP_MARIADB = Path(_valor("DUMP_MARIADB", defecto=str(DIR_DUMPS / "comercial.sql")))

# Segunda base del legacy. No es una copia de la anterior: es otra base con
# otros catálogos, y sus ids se solapan CON SIGNIFICADO DISTINTO con los de la
# comercial --`tipo_contrato` id=7 no significa lo mismo en una que en otra--
# así que los catálogos se unen por nombre y nunca por id. Ver migrar_catalogo.
#
# Es opcional. Si no hay `principal.sql`, la Fase I migra `tipo_contrato` con lo
# que aporta la comercial y se salta `tipo_convenio`, dejandolo anotado en
# `migracion_log` en vez de fingir que si. Ver CATALOGOS.
DUMP_CAGUAYO = Path(_valor("DUMP_CAGUAYO", defecto=str(DIR_DUMPS / "principal.sql")))

# Catálogos que se migran en la Fase I, con las bases de las que se leen.
#
# `tipo_convenio` no está y no se migra: `caguayo_comercial` no tiene esa tabla,
# y en PostgreSQL los 2 valores de la semilla ya cubren el único tipo en uso
# (COMPRA VENTA). Si algún día hace falta otro, se añade a mano.
CATALOGOS = (
    ("tipo_contrato", (DUMP_MARIADB,)),
)


# --- Comprobación de los volcados -----------------------------------------
#: Qué fichero cubre cada papel. `generar_dumps.py` los fabrica o los adopta.
DUMPS = {"comercial": DUMP_MARIADB, "principal": DUMP_CAGUAYO}


class DumpAusente(Exception):
    """Falta un volcado, o no se puede leer. El mensaje dice cómo arreglarlo."""


def comprobar_dumps(roles=()):
    """Que existan los volcados que pide la ejecución.

    `roles` son los papeles necesarios. Vacío significa "los dos".

    Se comprueba aquí y no al importar el módulo a propósito: el backend carga
    este `config.py` en proceso para preguntar por su base de destino, y una
    excepción al importarlo lo dejaría sin poder responder nunca.
    """
    roles = tuple(roles) or tuple(DUMPS)
    faltan = []
    for rol in roles:
        ruta = DUMPS[rol]
        if not ruta.exists():
            faltan.append(
                "  %-9s %s\n"
                "            no existe. Pon el volcado ahí, o exporta %s=/ruta/al/fichero.sql"
                % (rol, ruta, "DUMP_MARIADB" if rol == "comercial" else "DUMP_CAGUAYO")
            )
    if faltan:
        raise DumpAusente(
            "Faltan los volcados del legacy:\n%s\n"
            "Sácalos del MariaDB con  `python main.py --generar-dumps`,\n"
            "o instala los que ya tengas con `python main.py --adoptar COMERCIAL PRINCIPAL`.\n"
            "Lo que hace falta está en  `python main.py --instrucciones`."
            % "\n".join(faltan)
        )

CSV_RECHAZOS = DIR_DATA / "migracion_rechazos.csv"
ENCODING = "utf-8"

TAMANO_LOTE = int(os.getenv("TAMANO_LOTE", "200"))

TABLA_CLIENTES = "clientes"
TABLA_NATURAL = "clientes_persona_natural"
TABLA_JURIDICA = "clientes_persona_juridica"
TABLA_TCP = "cliente_tcp"
TABLA_CUENTA = "cuenta"
TABLA_CUENTA_DEP = "cuenta_dependencias"
TABLA_ESPECIALIDAD = "especialidades_artisticas"
TABLA_TIPO_CONTRATO = "tipo_contrato"
TABLA_USUARIO = "usuarios"
TABLA_LOG = "migracion_log"
TABLA_LIQUIDACION = "liquidacion"
TABLA_CONTRATO = "contrato"
TABLA_SUPLEMENTO = "suplemento"
TABLA_SOLICITUD = "solicitud_servicio"
TABLA_ETAPA = "etapas"
TABLA_TAREA_ETAPA = "tareas_etapa"
TABLA_PERSONA_ETAPA = "persona_etapa"
