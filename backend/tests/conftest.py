import pytest
import pytest_asyncio
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine
from src.database.connection import DATABASE_URL, get_session, get_auth_session


@pytest_asyncio.fixture
async def db_session():
    """Async DB session conectada al DATABASE_URL real."""
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


@pytest.fixture(scope="function")
def client():
    """TestClient fixture para tests de endpoints HTTP.

    Sobrescribe las dependencias get_session y get_auth_session
    para conectar con la BD real (misma que usa db_session).
    """
    from fastapi.testclient import TestClient
    from main import app

    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        future=True,
        connect_args={"server_settings": {"client_encoding": "utf8"}},
    )
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_session():
        async with AsyncSessionLocal() as session:
            yield session

    async def override_get_auth_session():
        async with AsyncSessionLocal() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_auth_session] = override_get_auth_session

    tc = TestClient(app)
    yield tc

    app.dependency_overrides.clear()

    # Cleanup engine
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(engine.dispose())
        else:
            loop.run_until_complete(engine.dispose())
    except Exception:
        pass
