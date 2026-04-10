import os
from contextvars import ContextVar
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Context variable to store the database name for the current request
_current_db: ContextVar[str] = ContextVar(
    "current_db", default=os.getenv("AUTH_DATABASE", "caguayo")
)


def set_current_db(db_name: str):
    """Set the database name for the current request (called by middleware)."""
    _current_db.set(db_name)


# Ensure we use the async driver
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
elif DATABASE_URL.startswith("postgresql+psycopg://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql+psycopg://", "postgresql+asyncpg://"
    )

AUTH_DATABASE = os.getenv("AUTH_DATABASE", "caguayo")

# Default engine for auth database
engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    future=True,
    connect_args={"server_settings": {"client_encoding": "utf8"}},
)

# Cache of engines per database name
_engines: dict[str, AsyncEngine] = {AUTH_DATABASE: engine}


def _get_engine_for_db(db_name: str) -> AsyncEngine:
    """Get or create an async engine for the given database name."""
    if db_name not in _engines:
        db_url = DATABASE_URL.replace(DATABASE_URL.split("/")[-1], db_name)
        _engines[db_name] = create_async_engine(
            db_url,
            echo=False,
            future=True,
            connect_args={"server_settings": {"client_encoding": "utf8"}},
        )
    return _engines[db_name]


async def get_session() -> AsyncSession:
    """Get session for the user's selected database (from ContextVar)."""
    db_name = _current_db.get()
    target_engine = _get_engine_for_db(db_name)
    async_session = sessionmaker(
        target_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session


async def get_auth_session(db_name: str = None) -> AsyncSession:
    """Get session for authentication database."""
    auth_db = db_name or AUTH_DATABASE
    target_engine = _get_engine_for_db(auth_db)
    async_session = sessionmaker(
        target_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session
