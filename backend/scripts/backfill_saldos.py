"""Regenera los snapshots de la tabla `saldos` desde `movimiento`.

`saldos` es una caché derivada de los movimientos confirmados. Este script
recorre todos los pares (id_producto, id_dependencia) que aparezcan en
`movimiento` o en `saldos` y reconstruye su cadena con
`SaldoService.recalcular_cadena` (la misma lógica que usan los hooks de
confirmar/cancelar). Idempotente: se puede ejecutar tantas veces como se
quiera.

Uso:
    uv run python scripts/backfill_saldos.py            # BD de DATABASE_URL
    uv run python scripts/backfill_saldos.py --db nombre_bd
    uv run python scripts/backfill_saldos.py --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys

from dotenv import load_dotenv
from sqlalchemy import select, union_all
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from src.models.movimiento import Movimiento  # noqa: E402
from src.models.saldo import Saldo  # noqa: E402
from src.services.saldo_service import SaldoService  # noqa: E402


def _database_url(db_name: str | None) -> str:
    url = os.environ["DATABASE_URL"]
    if db_name:
        url = url.rsplit("/", 1)[0] + "/" + db_name
    # Mismo reemplazo que hace src.database.connection (driver asyncpg).
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://")
    elif url.startswith("postgresql+psycopg://"):
        url = url.replace("postgresql+psycopg://", "postgresql+asyncpg://")
    return url


async def backfill(db_name: str | None, dry_run: bool) -> None:
    engine = create_async_engine(_database_url(db_name), echo=False, future=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as db:
        # Pares presentes en movimiento ∪ saldos (los de saldos sin
        # movimientos quedarán vacíos: se limpian snapshots huérfanos).
        mov_pares = select(
            Movimiento.id_producto.label("id_producto"),
            Movimiento.id_dependencia.label("id_dependencia"),
        ).distinct()
        saldos_pares = select(
            Saldo.id_producto.label("id_producto"),
            Saldo.id_dependencia.label("id_dependencia"),
        ).distinct()
        query = union_all(mov_pares, saldos_pares)
        pares = sorted({(r[0], r[1]) for r in (await db.execute(query)).all()})

        if not pares:
            print("No hay pares producto/dependencia para reconstruir.")
            return

        print(f"{len(pares)} par(es) producto/dependencia a reconstruir.")

        if dry_run:
            for pid, dep in pares:
                print(f"  [dry-run] producto={pid} dependencia={dep}")
            return

        for pid, dep in pares:
            await SaldoService.recalcular_cadena(db, pid, dep)
        await db.commit()

        resumen = await db.execute(
            select(
                Saldo.id_producto,
                Saldo.id_dependencia,
            ).distinct()
        )
        filas = resumen.all()
        print(f"Listo: snapshots activos en {len(filas)} par(es).")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", help="Nombre de la BD (default: DATABASE_URL)")
    parser.add_argument(
        "--dry-run", action="store_true", help="Solo lista los pares, no escribe"
    )
    args = parser.parse_args()
    asyncio.run(backfill(args.db, args.dry_run))


if __name__ == "__main__":
    main()
