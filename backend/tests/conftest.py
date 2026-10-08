import os

# Los tests que importan src.services arrastran auth_service, que exige
# SECRET_KEY al importarse. Default solo para el entorno de pruebas.
os.environ.setdefault("SECRET_KEY", "test-secret")

import pytest
import pytest_asyncio
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool
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

    - Sobrescribe get_session y get_auth_session para conectar a la BD real.
    - Usa `with TestClient(app)`: todas las peticiones del test corren en un
      único event loop (portal), así las conexiones en pool de la app
      (src.database.connection._engines) no saltan de un loop a otro
      ("future attached to a different loop").
    - Resetea `_engines` al inicio y al final del test: las conexiones creadas
      en el portal (event loop) de otro test no pueden reutilizarse aquí.
    """
    from fastapi.testclient import TestClient
    from main import app
    from src.database import connection as db_connection

    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        future=True,
        # Sin pool: la sesión override se crea/descarta dentro de un mismo
        # request sin arrastrar conexiones entre peticiones.
        poolclass=NullPool,
        connect_args={"server_settings": {"client_encoding": "utf8"}},
    )
    AsyncSessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async def override_get_session():
        async with AsyncSessionLocal() as session:
            yield session

    async def override_get_auth_session():
        async with AsyncSessionLocal() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_auth_session] = override_get_auth_session

    # No se hace dispose(): las conexiones nuevas se crean dentro del portal
    # (mismo event loop) que abrirá el TestClient de este test.
    db_connection._engines.clear()

    with TestClient(app) as tc:
        yield tc

    app.dependency_overrides.clear()
    db_connection._engines.clear()

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
