"""Stamp alembic head en todas las bases de datos que no tienen alembic_version.

Este script es para migrar bases de datos existentes que fueron creadas
con init.sql o new.sql y nunca usaron alembic.

Uso:
    uv run python -m scripts.stamp_all_databases [--dry-run]
"""

from __future__ import annotations

import argparse
import os
import sys

import psycopg2
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

ALEMBIC_CFG_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "alembic.ini",
)


def _connect_admin():
    return psycopg2.connect(
        host=os.getenv("ADMIN_DB_HOST", "localhost"),
        port=int(os.getenv("ADMIN_DB_PORT", 5432)),
        user=os.getenv("ADMIN_DB_USER", "postgres"),
        password=os.getenv("ADMIN_DB_PASSWORD"),
        dbname=os.getenv("ADMIN_DB_NAME", "postgres"),
        client_encoding="utf8",
    )


def _connect(db_name: str):
    return psycopg2.connect(
        host=os.getenv("ADMIN_DB_HOST", "localhost"),
        port=int(os.getenv("ADMIN_DB_PORT", 5432)),
        user=os.getenv("ADMIN_DB_USER", "postgres"),
        password=os.getenv("ADMIN_DB_PASSWORD"),
        dbname=db_name,
        client_encoding="utf8",
    )


def get_all_databases() -> list[str]:
    """Obtiene todas las bases de datos excepto las del sistema."""
    excluded = {"postgres", "template0", "template1"}
    with _connect_admin() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT datname FROM pg_database "
            "WHERE datistemplate = false AND datname NOT IN %s "
            "ORDER BY datname",
            (tuple(excluded),),
        )
        dbs = [row[0] for row in cur.fetchall()]
        cur.close()
    return dbs


def has_alembic_version(db_name: str) -> bool:
    """Verifica si una BD tiene la tabla alembic_version."""
    try:
        with _connect(db_name) as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_name = 'alembic_version'"
            )
            exists = cur.fetchone() is not None
            cur.close()
        return exists
    except Exception:
        return False


def get_alembic_version(db_name: str) -> str | None:
    """Obtiene la versión actual de alembic en una BD."""
    try:
        with _connect(db_name) as conn:
            cur = conn.cursor()
            cur.execute("SELECT version_num FROM alembic_version")
            row = cur.fetchone()
            cur.close()
        return row[0] if row else None
    except Exception:
        return None


def stamp_database(db_name: str, dry_run: bool = False) -> dict:
    """Hace stamp head en una base de datos."""
    result = {"db": db_name, "status": "unknown", "version": None, "error": None}

    if has_alembic_version(db_name):
        version = get_alembic_version(db_name)
        result["status"] = "already_stamped"
        result["version"] = version
        return result

    if dry_run:
        result["status"] = "would_stamp"
        return result

    try:
        from alembic import command
        from alembic.config import Config

        user = os.getenv("ADMIN_DB_USER", "postgres")
        password = os.getenv("ADMIN_DB_PASSWORD", "")
        host = os.getenv("ADMIN_DB_HOST", "localhost")
        port = os.getenv("ADMIN_DB_PORT", "5432")
        db_url = f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{db_name}"

        cfg = Config(os.path.abspath(ALEMBIC_CFG_PATH))
        cfg.set_main_option("sqlalchemy.url", db_url)

        command.stamp(cfg, "head")

        version = get_alembic_version(db_name)
        result["status"] = "stamped"
        result["version"] = version
    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)

    return result


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="stamp_all_databases",
        description="Stamp alembic head en todas las BDs que no lo tienen.",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Mostrar qué se haría sin ejecutar nada",
    )
    args = parser.parse_args(argv)

    print("=" * 60)
    print("==> Buscando bases de datos...")
    print("=" * 60)

    databases = get_all_databases()
    print(f"Encontradas {len(databases)} bases de datos: {', '.join(databases)}")
    print()

    results = []
    for db in databases:
        result = stamp_database(db, dry_run=args.dry_run)
        results.append(result)

        icon = {
            "already_stamped": "✓",
            "stamped": "+",
            "would_stamp": "~",
            "error": "✗",
            "unknown": "?",
        }.get(result["status"], "?")

        version_str = f" (v{result['version']})" if result["version"] else ""
        error_str = f" ERROR: {result['error']}" if result["error"] else ""

        print(f"  {icon} {result['db']}: {result['status']}{version_str}{error_str}")

    print()
    print("=" * 60)
    summary = {}
    for r in results:
        summary[r["status"]] = summary.get(r["status"], 0) + 1

    parts = [f"{count} {status}" for status, count in summary.items()]
    print(f"Resumen: {', '.join(parts)}")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
