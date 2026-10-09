# -*- coding: utf-8 -*-
"""Configuración del ETL de migración MariaDB -> PostgreSQL."""
import os
from dataclasses import dataclass
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DIR_DATA = BASE_DIR / "data"
DIR_TMP = DIR_DATA / "tmp"
DIR_SQL = BASE_DIR / "sql"

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

DUMP_MARIADB = Path(
    os.getenv(
        "DUMP_MARIADB",
        "/home/admin/AGC RESPALDO/CAGUAYO FINAL VLADIMIR/OFICINA COMERCIAL"
        "/comercialOFFICE/php/db/migrar/dumpCaguayo.sql",
    )
)

# Segunda base del legacy. No es una copia de la anterior: es otra base con
# otros catálogos.
#
# `caguayo_comercial` (DUMP_MARIADB) no tiene ni una fila de tipo_convenio, y
# su tipo_contrato sólo llega hasta el id 7. La base principal `caguayo` es la
# que tiene los cuatro valores de tipo_convenio y los cuatro de tipo_contrato
# que le faltan a la otra.
#
# Los ids de ambas se solapan CON SIGNIFICADO DISTINTO. tipo_contrato id=7 es
# "CONTRATO DE OBRA POR ENCARGO." aquí y "Prestación de Servicios - Impresión"
# en la base principal, así que los catálogos se unen por nombre y nunca por
# id. Ver migrar_catalogo.py.
DUMP_CAGUAYO = Path(
    os.getenv(
        "DUMP_CAGUAYO",
        "/home/admin/AGC RESPALDO/AGC/CAGUAYO/BD AGC CN ultima 11_9_2026/tkla.sql",
    )
)

# Catálogos que se migran en la Fase I, con las bases de las que se leen.
CATALOGOS = (
    ("tipo_contrato", (DUMP_MARIADB, DUMP_CAGUAYO)),
    ("tipo_convenio", (DUMP_CAGUAYO,)),
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
TABLA_TIPO_CONVENIO = "tipo_convenio"
TABLA_USUARIO = "usuarios"
TABLA_LOG = "migracion_log"
