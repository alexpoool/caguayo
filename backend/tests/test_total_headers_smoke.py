"""X-Total-Count en los GET de lista principales.

Cada endpoint listado del header interno debe enviar el total real de la BD
(en header, sin cambiar el body). Asserts acotados: header presente, entero,
y >= filas del body (el body va truncado por limit).
"""

import pytest


ENDPOINTS = [
    "/api/v1/convenios",
    "/api/v1/monedas",
    "/api/v1/anexos",
    "/api/v1/productos-en-liquidacion",
    "/api/v1/productos-en-liquidacion/pendientes",
    "/api/v1/productos-en-liquidacion/liquidadas",
    "/api/v1/movimientos/pendientes",
    "/api/v1/liquidaciones",
    "/api/v1/liquidaciones/pendientes",
    "/api/v1/liquidaciones/liquidadas",
    "/api/v1/servicios",
    "/api/v1/facturas-servicio",
    "/api/v1/ofertas?estado=PENDIENTE",
    "/api/v1/persona-liquidacion",
    "/api/v1/certificaciones",
    "/api/v1/contratos",
    "/api/v1/suplementos",
    "/api/v1/ventas-efectivo",
    "/api/v1/productos",
    "/api/v1/clientes",
    "/api/v1/solicitudes-servicio",
]


@pytest.mark.parametrize("endpoint", ENDPOINTS)
@pytest.mark.usefixtures("db_session")
def test_x_total_count_en_listado(client, endpoint):
    resp = client.get(endpoint, params={"limit": 1})
    assert resp.status_code == 200, f"{endpoint} -> {resp.status_code}"

    header = resp.headers.get("X-Total-Count")
    assert header is not None, f"{endpoint} sin header X-Total-Count"
    assert header.isdigit(), f"{endpoint}: header no entero: {header!r}"

    body = resp.json()
    assert isinstance(body, list), f"{endpoint}: body no es lista"
    total = int(header)
    assert total >= 0 and (len(body) == 0 or total >= len(body)), (
        f"{endpoint}: total {total} incoherente con body de {len(body)}"
    )


@pytest.mark.usefixtures("db_session")
def test_convenios_header_refleja_search(client, db_session):
    """El header de convenios cuenta con el mismo WHERE del search."""
    resp = client.get("/api/v1/convenios", params={"search": "zzz-sin-match-x9"})
    assert resp.status_code == 200
    assert resp.headers.get("X-Total-Count") == "0"
    assert resp.json() == []
