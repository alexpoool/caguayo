"""Header X-Total-Count en GET /solicitudes-servicio.

El contador de la página de Proyectos muestra el total real de la tabla.
El backend lo manda en el header para no cambiar el shape del body
(lista pelada). Verifica que el header exista, sea entero y coincida con
el COUNT(*) real de la BD.
"""

import pytest

pytestmark = pytest.mark.asyncio


@pytest.mark.usefixtures("db_session")
async def test_total_count_header_coincide_con_la_tabla(client, db_session):
    # COUNT(*) real vía el repo: la fuente de verdad, sin duplicar SQL.
    from src.repository.servicio_repo import solicitud_servicio_repo

    total_real = await solicitud_servicio_repo.count_all(db_session)

    resp = client.get("/api/v1/solicitudes-servicio?skip=0&limit=1")
    assert resp.status_code == 200

    header = resp.headers.get("X-Total-Count")
    assert header is not None, "El header X-Total-Count debe estar presente"
    assert header.isdigit(), f"X-Total-Count debe ser un entero, llegó: {header!r}"
    assert int(header) == total_real

    # Body sigue siendo una lista pelada (contrato sin cambios) truncada por limit.
    body = resp.json()
    assert isinstance(body, list)
    assert len(body) <= 1


@pytest.mark.usefixtures("db_session")
async def test_total_count_no_cambia_con_limit(client, db_session):
    """El total no depende del tamaño de página: mismo header con limit=1 y limit=100."""
    h1 = client.get("/api/v1/solicitudes-servicio?skip=0&limit=1").headers.get(
        "X-Total-Count"
    )
    h2 = client.get("/api/v1/solicitudes-servicio?skip=0&limit=100").headers.get(
        "X-Total-Count"
    )
    assert h1 == h2


@pytest.mark.usefixtures("db_session")
async def test_total_count_refleja_filtro_estado(client, db_session):
    """Con ?estado= el header cuenta solo las del estado, y el body también."""
    from src.repository.servicio_repo import solicitud_servicio_repo

    estado = "EN PROCESO"
    total = await solicitud_servicio_repo.count_all(db_session, estado=estado)

    resp = client.get(
        "/api/v1/solicitudes-servicio",
        params={"skip": 0, "limit": 1, "estado": estado},
    )
    assert resp.status_code == 200
    assert int(resp.headers["X-Total-Count"]) == total

    body = resp.json()
    assert isinstance(body, list)
    assert all(item["estado"] == estado for item in body)


@pytest.mark.usefixtures("db_session")
async def test_total_count_buscador_sin_coincidencias_da_cero(client, db_session):
    """Búsqueda que no matchea nada: header 0 y body vacío."""
    resp = client.get(
        "/api/v1/solicitudes-servicio",
        params={"skip": 0, "limit": 10, "search": "zzz-sin-coincidencias-x9"},
    )
    assert resp.status_code == 200
    assert resp.headers["X-Total-Count"] == "0"
    assert resp.json() == []
