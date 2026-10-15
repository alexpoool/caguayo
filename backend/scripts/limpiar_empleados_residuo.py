#!/usr/bin/env python3
"""Elimina de la BD los empleados residuo creados por la suite de tests.

Los tests generan empleados con nombres aleatorios `Nombre`/`Apellido` +
8 caracteres hexadécimos (`uuid4().hex[:8]`); estos residuos ensucian las
listas del módulo RRHH. El borrado es **físico** y arrastra en cascada los
datos de cada empleado (evaluaciones, objetivos, asistencia, nóminas,
solicitudes y movimientos), según las FK `ON DELETE CASCADE` del esquema.

Antes del borrado se limpian las filas de `nomina_deducciones` y
`nomina_bonificaciones` ligadas al residuo: esas FK son `RESTRICT` y
bloquearían la cascada.

Los empleados que no siguen el patrón (empleados reales, p. ej. el
personal dado de alta a mano) **nunca se tocan**, y además hay una lista
de protección explícita por código.

Uso:
    python scripts/limpiar_empleados_residuo.py              # dry-run (ROLLBACK)
    python scripts/limpiar_empleados_residuo.py --yes        # borra de verdad
    python scripts/limpiar_empleados_residuo.py --db otro_bd --yes

El dry-run es el comportamiento por defecto: cuenta, borra dentro de la
transacción para descubrir cualquier FK bloqueante y hace ROLLBACK, sin
tocar nada. Cada corrida de tests vuelve a generar residuo, así que el
script es reutilizable.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent

# Cargar .env del backend (DATABASE_URL)
from dotenv import load_dotenv  # noqa: E402

load_dotenv(BACKEND_DIR / ".env")

# Patrón de los empleados residuo de tests (uuid4().hex[:8])
PATRON_RESIDUO = r"^(Nombre|Apellido)[0-9a-f]{8}$"

# Empleados reales que jamás se borran, aunque encajen con el patrón
PROTEGIDOS = ("EMP-3111",)  # Alejandro Pozo (alta manual)

# Tablas cuyo conteo se informa antes/después
TABLAS_CONTEO = (
    "empleados",
    "evaluaciones",
    "objetivos",
    "metas",
    "asistencia",
    "nomina",
    "solicitudes",
    "deducciones",
    "bonificaciones",
)

SQL_RESIDUOS = """
    SELECT id FROM empleados
    WHERE (nombre ~ :patron OR apellido ~ :patron)
      AND COALESCE(codigo_empleado, '') <> ALL(:protegidos)
"""

# Las dos FK RESTRICT hacia deducciones/bonificaciones impiden que la
# cascada desde empleados las borre: se limpian primero.
SQL_PUENTE_DED = """
    DELETE FROM nomina_deducciones
    WHERE deduccion_id IN (SELECT id_deducciones FROM deducciones WHERE empleados_id = ANY(:ids))
       OR nomina_id IN (SELECT id FROM nomina WHERE empleado_id = ANY(:ids))
"""
SQL_PUENTE_BON = """
    DELETE FROM nomina_bonificaciones
    WHERE bonificacion_id IN (SELECT id_bonificaciones FROM bonificaciones WHERE empleados_id = ANY(:ids))
       OR nomina_id IN (SELECT id FROM nomina WHERE empleado_id = ANY(:ids))
"""
SQL_BORRAR = "DELETE FROM empleados WHERE id = ANY(:ids)"


async def contar(conn) -> dict[str, int]:
    conteo = {}
    for tabla in TABLAS_CONTEO:
        res = await conn.execute(text(f"SELECT count(*) FROM {tabla}"))
        conteo[tabla] = res.scalar_one()
    return conteo


async def main(db: str, si: bool) -> int:
    url = os.getenv("DATABASE_URL")
    if not url:
        print("ERROR: DATABASE_URL no definida (falta el .env del backend)", file=sys.stderr)
        return 1
    # El .env del backend usa fin de línea CRLF: el \r se pegaría al nombre
    url = url.rstrip("\r")
    # Mismo normalizado que src/database/connection.py: driver asyncpg instalado
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql+psycopg://"):
        url = url.replace("postgresql+psycopg://", "postgresql+asyncpg://", 1)
    # Reemplazar solo el nombre de la base al final de la URL
    url = url.rsplit("/", 1)[0] + f"/{db}"
    engine = create_async_engine(url, echo=False, future=True)

    try:
        async with engine.connect() as conn:
            trans = await conn.begin()

            antes = await contar(conn)
            res = await conn.execute(
                text(SQL_RESIDUOS),
                {"patron": PATRON_RESIDUO, "protegidos": list(PROTEGIDOS)},
            )
            ids = [row[0] for row in res.all()]

            print(f"BD: {db}")
            print(f"Empleados residuo detectados: {len(ids)}")
            if not ids:
                await trans.rollback()
                print("Nada que limpiar.")
                return 0

            # Ejecutar el borrado completo dentro de la transacción para
            # descubrir cualquier FK bloqueante aunque sea un dry-run.
            await conn.execute(text(SQL_PUENTE_DED), {"ids": ids})
            await conn.execute(text(SQL_PUENTE_BON), {"ids": ids})
            await conn.execute(text(SQL_BORRAR), {"ids": ids})
            despues = await contar(conn)

            print(f"\n{'Tabla':<18}{'antes':>8}{'borrados':>10}{'después':>9}")
            for tabla in TABLAS_CONTEO:
                delta = antes[tabla] - despues[tabla]
                print(f"{tabla:<18}{antes[tabla]:>8}{delta:>10}{despues[tabla]:>9}")

            if si:
                await trans.commit()
                print("\nCOMMIT: residuos eliminados.")
            else:
                await trans.rollback()
                print("\nDRY-RUN: todo revertido (ROLLBACK). Repite con --yes para borrar.")
            return 0
    finally:
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--db", default="caguayo_sa", help="Base de datos destino (default: caguayo_sa)")
    parser.add_argument("--yes", action="store_true", help="Ejecuta el borrado real (sin esto es dry-run)")
    args = parser.parse_args()
    if os.name == "nt":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    sys.exit(asyncio.run(main(args.db, args.yes)))
