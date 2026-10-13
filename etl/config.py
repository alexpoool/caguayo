# -*- coding: utf-8 -*-
"""Configuración del ETL de migración MariaDB -> PostgreSQL."""
import os
from dataclasses import dataclass
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DIR_DATA = BASE_DIR / "data"
DIR_TMP = DIR_DATA / "tmp"
DIR_SQL = BASE_DIR / "sql"
DIR_LEGACY = BASE_DIR / "legacy"

PROYECTO = Path(os.getenv("PROYECTO_DIR", "/home/admin/caguayo"))


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


_ENV = _leer_env(PROYECTO / ".env")


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
class PGConfig:
    host: str
    port: int
    user: str
    password: str
    database: str


POSTGRES = PGConfig(
    host=_valor("PG_HOST", "DB_HOST", defecto="127.0.0.1"),
    port=_valor("DB_PORT", "PG_PORT", defecto="5432"),
    user=_valor("PG_USER", "POSTGRES_USER", defecto="postgres"),
    password=_valor("PG_PASSWORD", "POSTGRES_PASSWORD", defecto="postgres"),
    database=_valor("PG_DB", "POSTGRES_DB", defecto="caguayo_sa"),
)

# El dump del legacy vive en `etl/legacy/`, junto al ETL, para que la migración
# se pueda relanzar sin depender de una ruta absoluta de otra máquina.
#
# Es un solo fichero y trae todo lo que la Fase I necesita. La base principal
# `caguayo` también tenía catálogos, pero no se usa: `caguayo_comercial` trae
# los 9 tipos de contrato y ninguna otra tabla de la que dependen las fases.
DUMP_MARIADB = Path(
    os.getenv("DUMP_MARIADB", str(DIR_LEGACY / "caguayo_comercial.sql"))
)

# Catálogos que se migran en la Fase I, con las bases de las que se leen.
#
# `tipo_convenio` no está y no se migra: `caguayo_comercial` no tiene esa tabla,
# y en PostgreSQL los 2 valores de la semilla ya cubren el único tipo en uso
# (COMPRA VENTA). Si algún día hace falta otro, se añade a mano.
CATALOGOS = (
    ("tipo_contrato", (DUMP_MARIADB,)),
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
