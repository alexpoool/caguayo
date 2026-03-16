import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

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

engine = create_async_engine(DATABASE_URL, echo=True, future=True)


async def get_session() -> AsyncSession:
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


async def get_auth_session(db_name: str = None) -> AsyncSession:
    """Get session for authentication database."""
    auth_db_url = os.getenv("AUTH_DATABASE", "caguayo_inventario")
    if db_name:
        auth_db_url = db_name

    auth_url = DATABASE_URL.replace(DATABASE_URL.split("/")[-1], auth_db_url)

    auth_engine = create_async_engine(auth_url, echo=False, future=True)
    async_session = sessionmaker(
        auth_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session
