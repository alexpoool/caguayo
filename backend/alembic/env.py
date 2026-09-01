from logging.config import fileConfig
from sqlalchemy import pool, text
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.database.connection import DATABASE_URL
from src.models import SQLModel

config = context.config
if not config.get_main_option("sqlalchemy.url"):
    config.set_main_option("sqlalchemy.url", DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata


def _is_fresh_db(connection) -> bool:
    """Check if this is a fresh database with no alembic_version table or no rows.
    
    Uses information_schema to safely detect the table without failing
    if it doesn't exist (which would poison the transaction).
    """
    result = connection.execute(text(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables "
        "WHERE table_name = 'alembic_version')"
    ))
    table_exists = result.scalar()
    if not table_exists:
        return True
    result = connection.execute(text("SELECT COUNT(*) FROM alembic_version"))
    count = result.scalar()
    return count == 0


def _stamp_to_head(connection):
    """Create alembic_version table and stamp to the current head revision."""
    # Create alembic_version table if it doesn't exist
    connection.execute(text(
        "CREATE TABLE IF NOT EXISTS alembic_version ("
        "version_num VARCHAR(32) NOT NULL)"
    ))
    # Delete any stale rows
    connection.execute(text("DELETE FROM alembic_version"))
    from alembic.script import ScriptDirectory
    script = ScriptDirectory.from_config(config)
    heads = script.get_heads()
    if heads:
        for head in heads:
            connection.execute(
                text("INSERT INTO alembic_version (version_num) VALUES (:rev)"),
                {"rev": head},
            )


def create_all_and_seed(connection):
    """For fresh databases: create all tables from models and stamp to head."""
    print("  🆕 Fresh database detected — creating tables from models...")
    target_metadata.create_all(connection)
    print("  ✅ Tables created successfully")

    # Stamp alembic to head so future migrations know we're up to date
    _stamp_to_head(connection)
    print("  ✅ Alembic stamped to head")

    # Explicitly commit — async connections auto-begin a transaction,
    # and without begin_transaction() it won't auto-commit.
    connection.commit()


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)

    if _is_fresh_db(connection):
        # Fresh DB — skip migration chain (which has conflicts between
        # bootstrap and incremental migrations) and create everything
        # directly from the SQLAlchemy models.
        create_all_and_seed(connection)
    else:
        # Existing DB — run migrations normally
        with context.begin_transaction():
            context.run_migrations()


async def run_async_migrations():
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    import asyncio

    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
