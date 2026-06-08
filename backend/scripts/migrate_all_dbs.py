"""Apply pending SQL migrations to all databases on the server."""

import asyncio
import os
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
ADMIN_DB_HOST = os.getenv("ADMIN_DB_HOST", "localhost")
ADMIN_DB_PORT = int(os.getenv("ADMIN_DB_PORT", 5432))
ADMIN_DB_USER = os.getenv("ADMIN_DB_USER", "postgres")
ADMIN_DB_PASSWORD = os.getenv("ADMIN_DB_PASSWORD", "postgres")
ADMIN_DB_NAME = os.getenv("ADMIN_DB_NAME", "postgres")

MIGRATIONS_SQL = [
    "ALTER TABLE dependencia ADD COLUMN IF NOT EXISTS reeup VARCHAR(15)",
]


async def run():
    from sqlalchemy.ext.asyncio import create_async_engine

    admin_url = f"postgresql+asyncpg://{ADMIN_DB_USER}:{ADMIN_DB_PASSWORD}@{ADMIN_DB_HOST}:{ADMIN_DB_PORT}/{ADMIN_DB_NAME}"
    engine = create_async_engine(admin_url, echo=False)

    async with engine.connect() as conn:
        result = await conn.execute(
            text("SELECT datname FROM pg_database WHERE datistemplate = false AND datname != 'postgres' ORDER BY datname")
        )
        databases = [row[0] for row in result]

    await engine.dispose()

    for db_name in databases:
        db_url = f"postgresql+asyncpg://{ADMIN_DB_USER}:{ADMIN_DB_PASSWORD}@{ADMIN_DB_HOST}:{ADMIN_DB_PORT}/{db_name}"
        try:
            eng = create_async_engine(db_url, echo=False)
            async with eng.connect() as conn:
                for sql in MIGRATIONS_SQL:
                    await conn.execute(text(sql))
                await conn.commit()
            await eng.dispose()
            print(f"  ✅ {db_name}")
        except Exception as e:
            print(f"  ❌ {db_name}: {e}")

    print("Done.")


if __name__ == "__main__":
    asyncio.run(run())
