"""Run alembic migrations on all databases on the server."""

import os
import re
from alembic.config import Config
from alembic import command
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv

load_dotenv()

ALEMBIC_CFG_PATH = os.path.join(os.path.dirname(__file__), "..", "alembic.ini")

DatabaseURL = os.getenv("DATABASE_URL")
if not DatabaseURL:
    raise ValueError("DATABASE_URL environment variable is not set")

match = re.match(
    r"(?:postgresql|postgresql\+asyncpg|postgresql\+psycopg)://"
    r"(?P<user>[^:]+):(?P<password>[^@]+)@"
    r"(?P<host>[^:/]+):?(?P<port>\d*)/?(?P<dbname>[^?]*)",
    DatabaseURL,
)
if not match:
    raise ValueError(f"Cannot parse DATABASE_URL: {DatabaseURL}")

ADMIN_DB_HOST = match.group("host") or "localhost"
ADMIN_DB_PORT = int(match.group("port") or 5432)
ADMIN_DB_USER = match.group("user") or "postgres"
ADMIN_DB_PASSWORD = match.group("password") or ""


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


def db_state(conn, db_name: str) -> str:
    """Check database state: 'empty', 'has_tables', or 'has_alembic'."""
    cur = conn.cursor()
    cur.execute(
        "SELECT EXISTS ("
        "  SELECT FROM information_schema.tables "
        "  WHERE table_name = 'alembic_version'"
        ")"
    )
    has_alembic = cur.fetchone()[0]
    if has_alembic:
        cur.close()
        return "has_alembic"

    cur.execute(
        "SELECT EXISTS ("
        "  SELECT FROM information_schema.tables "
        "  WHERE table_schema = 'public'"
        ")"
    )
    has_any_table = cur.fetchone()[0]
    cur.close()
    if has_any_table:
        return "has_tables"
    return "empty"


def main():
    databases = get_all_databases()
    print(f"Migrating {len(databases)} database(s)...")
    for db_name in databases:
        conn = psycopg2.connect(
            host=ADMIN_DB_HOST,
            port=ADMIN_DB_PORT,
            user=ADMIN_DB_USER,
            password=ADMIN_DB_PASSWORD,
            dbname=db_name,
        )
        state = db_state(conn, db_name)
        conn.close()

        db_url = (
            f"postgresql+asyncpg://{ADMIN_DB_USER}:{ADMIN_DB_PASSWORD}"
            f"@{ADMIN_DB_HOST}:{ADMIN_DB_PORT}/{db_name}"
        )
        alembic_cfg = Config(ALEMBIC_CFG_PATH)
        alembic_cfg.set_main_option("sqlalchemy.url", db_url)

        try:
            if state == "has_alembic":
                command.upgrade(alembic_cfg, "head")
                print(f"  ✅ {db_name} (migrated)")
            elif state == "has_tables":
                command.stamp(alembic_cfg, "head")
                print(f"  ✅ {db_name} (stamped as head, tables already exist)")
            else:
                command.upgrade(alembic_cfg, "head")
                print(f"  ✅ {db_name} (created from scratch)")
        except Exception as e:
            print(f"  ❌ {db_name}: {e}")

    print("Done.")


if __name__ == "__main__":
    main()
