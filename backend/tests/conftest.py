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


def pytest_sessionfinish(session, exitstatus):
    """Borra los residuos de pruebas (fechas 2098 y empleados de prueba).

    Varios tests crean datos en 2098 y limpian el empleado con `DELETE`, que
    puede acabar en baja lógica. La FK en cascada no se dispara en ese caso,
    así que estos registros quedarían en la BD real.
    """
    from sqlalchemy.engine import make_url
    import psycopg2

    try:
        url = make_url(DATABASE_URL)
        conn = psycopg2.connect(
            host=url.host,
            port=url.port or 5432,
            user=url.username,
            password=url.password,
            dbname=url.database,
        )
        try:
            with conn, conn.cursor() as cur:
                # Los tests nombran sus empleados `Nombre<hash>` y Apellido<hash>.
                # El supervisor apunta con NO ACTION: hay que soltarlo antes.
                cur.execute(
                    "UPDATE empleados SET supervisor = NULL "
                    "WHERE supervisor IN ("
                    "SELECT id FROM empleados "
                    "WHERE nombre LIKE 'Nombre%' "
                    "AND apellido LIKE 'Apellido%'"
                    ")"
                )
                cur.execute(
                    "DELETE FROM evaluaciones "
                    "WHERE periodo LIKE '2098%' "
                    "OR inicio_periodo >= DATE '2098-01-01'"
                )
                cur.execute(
                    "DELETE FROM pago_x_resultado "
                    "WHERE periodo_evaluacion_id IN ("
                    "SELECT id_periodo_evaluacion FROM periodo_evaluaciones "
                    "WHERE nombre LIKE '2098%'"
                    ")"
                )
                cur.execute(
                    "DELETE FROM periodo_evaluaciones WHERE nombre LIKE '2098%'"
                )
                cur.execute(
                    "DELETE FROM objetivos "
                    "WHERE periodo_inicio >= DATE '2098-01-01' "
                    "OR periodo_fin >= DATE '2098-01-01'"
                )
                cur.execute(
                    "DELETE FROM deducciones "
                    "WHERE inicio_periodo >= DATE '2098-01-01' "
                    "OR fin_periodo >= DATE '2098-01-01'"
                )
                cur.execute(
                    "DELETE FROM bonificaciones "
                    "WHERE inicio_periodo >= DATE '2098-01-01' "
                    "OR fin_periodo >= DATE '2098-01-01'"
                )
                cur.execute(
                    "DELETE FROM asistencia WHERE fecha >= DATE '2098-01-01'"
                )
                cur.execute(
                    "DELETE FROM solicitudes "
                    "WHERE fecha_inicio >= DATE '2098-01-01' "
                    "OR fecha_fin >= DATE '2098-01-01'"
                )
                cur.execute(
                    "DELETE FROM empleados "
                    "WHERE nombre LIKE 'Nombre%' "
                    "AND apellido LIKE 'Apellido%'"
                )
        finally:
            conn.close()
    except Exception:
        # La limpieza no debe hacer fallar la sesión de tests.
        pass


@pytest.fixture
def auth_headers(client):
    """Headers Authorization con token de admin para endpoints con verify_auth.

    Reutiliza sesiones vigentes de `sesion` para evitar el UNIQUE del token
    cuando dos logins del admin caen en el mismo segundo (mismo patrón que
    test_eliminaciones_compra_venta_proyectos._login).
    """
    candidatos = [
        r[0]
        for r in _sql_sesion(
            "SELECT token FROM sesion WHERE fecha_expiracion > now()"
            " ORDER BY id_sesion DESC LIMIT 3"
        )
    ]
    for token in candidatos:
        probe = client.delete(
            "/api/v1/etapas/999999999", headers={"Authorization": f"Bearer {token}"}
        )
        if probe.status_code != 401:
            return {"Authorization": f"Bearer {token}"}

    conexiones = client.get("/api/v1/conexiones").json()
    nombre_db = conexiones[0]["nombre_database"]
    r = client.post(
        "/api/v1/auth/login",
        json={"alias": "admin", "contrasenia": "admin123", "base_datos": nombre_db},
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _sql_sesion(sql: str) -> list:
    """SELECT simple contra la BD de auth, fuera del loop del TestClient."""
    import asyncio

    from sqlalchemy import text

    async def _go() -> list:
        engine = create_async_engine(DATABASE_URL, poolclass=NullPool)
        async with engine.connect() as conn:
            rows = (await conn.execute(text(sql))).fetchall()
        await engine.dispose()
        return rows

    return asyncio.run(_go())
