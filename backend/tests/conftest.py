import pytest_asyncio
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine
from src.database.connection import DATABASE_URL


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        future=True,
        connect_args={"server_settings": {"client_encoding": "utf8"}},
    )
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
    await engine.dispose()
