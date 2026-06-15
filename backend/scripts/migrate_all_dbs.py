"""Run alembic migrations on all databases on the server."""

import os
from alembic.config import Config
from alembic import command
import psycopg2
from dotenv import load_dotenv

load_dotenv()

ADMIN_DB_HOST = os.getenv("ADMIN_DB_HOST", "localhost")
ADMIN_DB_PORT = int(os.getenv("ADMIN_DB_PORT", 5432))
ADMIN_DB_USER = os.getenv("ADMIN_DB_USER", "postgres")
ADMIN_DB_PASSWORD = os.getenv("ADMIN_DB_PASSWORD", "postgres")

ALEMBIC_CFG_PATH = os.path.join(os.path.dirname(__file__), "..", "alembic.ini")


def get_all_databases() -> list[str]:
    conn = psycopg2.connect(
        host=ADMIN_DB_HOST,
        port=ADMIN_DB_PORT,
        user=ADMIN_DB_USER,
        password=ADMIN_DB_PASSWORD,
        dbname="postgres",
    )
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(
        "SELECT datname FROM pg_database "
        "WHERE datistemplate = false AND datname != 'postgres' "
        "ORDER BY datname"
    )
    databases = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()
    return databases


def main():
    databases = get_all_databases()
    print(f"Migrating {len(databases)} database(s)...")
    for db_name in databases:
        db_url = (
            f"postgresql+asyncpg://{ADMIN_DB_USER}:{ADMIN_DB_PASSWORD}"
            f"@{ADMIN_DB_HOST}:{ADMIN_DB_PORT}/{db_name}"
        )
        alembic_cfg = Config(ALEMBIC_CFG_PATH)
        alembic_cfg.set_main_option("sqlalchemy.url", db_url)
        try:
            command.upgrade(alembic_cfg, "head")
            print(f"  ✅ {db_name}")
        except Exception as e:
            print(f"  ❌ {db_name}: {e}")

    print("Done.")


if __name__ == "__main__":
    main()
