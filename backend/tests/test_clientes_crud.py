"""CRUD de terceros: validación del tipo de relación, actualización y borrado.

Los tests usan la BD real (caguayo_sa) como el resto de la suite, pero crean
sus propios registros con códigos únicos y los eliminan al terminar.
"""

import asyncio
import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from src.database.connection import DATABASE_URL


def _payload(tipo_relacion: str = "CLIENTE") -> dict:
    sufijo = uuid.uuid4().hex[:10]
    return {
        "codigo": f"TEST-{sufijo}",
        "nit": f"NIT-{sufijo}",
        "nombre": "Tercero de prueba",
        "tipo_persona": "JURIDICA",
        "tipo_relacion": tipo_relacion,
        "estado": "ACTIVO",
        "cliente_juridica": {"codigo_reup": f"REUP-{sufijo}"},
    }


def _run_sql(sql: str, params: dict) -> None:
    """Ejecuta DML fuera del loop del TestClient (limpieza y datos de apoyo)."""

    async def _go() -> None:
        engine = create_async_engine(DATABASE_URL)
        async with engine.begin() as conn:
            await conn.execute(text(sql), params)
        await engine.dispose()

    asyncio.run(_go())


def _run_sql_scalar(sql: str, params: dict):
    """Ejecuta SQL y devuelve el primer valor (ids de datos de apoyo)."""

    async def _go():
        engine = create_async_engine(DATABASE_URL)
        try:
            async with engine.begin() as conn:
                result = await conn.execute(text(sql), params)
                return result.scalar()
        finally:
            await engine.dispose()

    return asyncio.run(_go())


def _payload_tipo(tipo_persona: str) -> dict:
    """Payload mínimo válido para cada tipo de persona."""
    sufijo = uuid.uuid4().hex[:10]
    payload = {
        "codigo": f"TEST-{sufijo}",
        "nit": f"NIT-{sufijo}",
        "nombre": f"Tercero {tipo_persona}",
        "tipo_persona": tipo_persona,
        "tipo_relacion": "CLIENTE",
        "estado": "ACTIVO",
    }
    if tipo_persona == "NATURAL":
        payload["cliente_natural"] = {
            "nombre": "Ana",
            "primer_apellido": "Prueba",
            "carnet_identidad": str(uuid.uuid4().int % 10**11).zfill(11),
        }
    elif tipo_persona == "TCP":
        payload["cliente_tcp"] = {
            "nombre": "Tcp",
            "primer_apellido": "Prueba",
        }
    else:
        payload["cliente_juridica"] = {"codigo_reup": f"REUP-{sufijo}"}
    return payload


@pytest.mark.usefixtures("db_session")
def test_tipo_relacion_invalido_se_rechaza(client):
    resp = client.post("/api/v1/clientes", json=_payload("OTRO"))
    assert resp.status_code == 422

    # El update también valida, sin tocar la BD (el id ni siquiera existe).
    resp = client.put(
        "/api/v1/clientes/999999999", json={"tipo_relacion": "CUALQUIERA"}
    )
    assert resp.status_code == 422


@pytest.mark.usefixtures("db_session")
def test_actualizar_tipo_relacion_conserva_datos_y_elimina(client):
    creado = client.post("/api/v1/clientes", json=_payload())
    assert creado.status_code == 201, creado.text
    id_cliente = creado.json()["id_cliente"]

    try:
        # Cambiar el rol a AMBAS y luego editar un campo suelto no debe borrar
        # los datos de la persona jurídica.
        resp = client.put(
            f"/api/v1/clientes/{id_cliente}", json={"tipo_relacion": "AMBAS"}
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["tipo_relacion"] == "AMBAS"

        resp = client.put(
            f"/api/v1/clientes/{id_cliente}", json={"telefono": "555-1234"}
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["telefono"] == "555-1234"
        assert resp.json()["cliente_juridica"] is not None

        resp = client.delete(f"/api/v1/clientes/{id_cliente}")
        assert resp.status_code == 204, resp.text
        assert client.get(f"/api/v1/clientes/{id_cliente}").status_code == 404
    finally:
        client.delete(f"/api/v1/clientes/{id_cliente}")


@pytest.mark.usefixtures("db_session")
def test_eliminar_inexistente_devuelve_404(client):
    resp = client.delete("/api/v1/clientes/999999999")
    assert resp.status_code == 404


@pytest.mark.usefixtures("db_session")
def test_no_elimina_tercero_con_solicitudes(client):
    creado = client.post("/api/v1/clientes", json=_payload())
    assert creado.status_code == 201, creado.text
    id_cliente = creado.json()["id_cliente"]

    solicitud = client.post(
        "/api/v1/solicitudes-servicio",
        json={"id_cliente": id_cliente, "fecha_solicitud": "2026-01-01"},
    )
    assert solicitud.status_code == 201, solicitud.text
    id_solicitud = solicitud.json()["id_solicitud_servicio"]

    try:
        resp = client.delete(f"/api/v1/clientes/{id_cliente}")
        assert resp.status_code == 409, resp.text
        assert "solicitudes de servicio" in resp.json()["detail"]

        # El cliente sigue existiendo.
        assert client.get(f"/api/v1/clientes/{id_cliente}").status_code == 200
    finally:
        _run_sql(
            "DELETE FROM solicitud_servicio WHERE id_solicitud_servicio = :id",
            {"id": id_solicitud},
        )
        client.delete(f"/api/v1/clientes/{id_cliente}")


@pytest.mark.usefixtures("db_session")
def test_filtros_por_tipo_persona_y_entidad(client):
    sufijo = uuid.uuid4().hex[:10]
    id_entidad = _run_sql_scalar(
        "INSERT INTO tipo_entidad (nombre, descripcion) "
        "VALUES (:nombre, 'entidad de prueba') RETURNING id_tipo_entidad",
        {"nombre": f"TEST-ENT-{sufijo}"},
    )

    creados: list[int] = []
    try:
        natural = _payload_tipo("NATURAL")
        tcp = _payload_tipo("TCP")
        juridica = _payload_tipo("JURIDICA")
        juridica["cliente_juridica"]["id_tipo_entidad"] = id_entidad

        for payload in (natural, tcp, juridica):
            resp = client.post("/api/v1/clientes", json=payload)
            assert resp.status_code == 201, resp.text
            creados.append(resp.json()["id_cliente"])
        id_natural, id_tcp, id_juridica = creados

        # Filtro por tipo de persona: incluye el tipo pedido y excluye el resto.
        resp = client.get(
            "/api/v1/clientes",
            params={"tipo_persona": "NATURAL", "limit": 10000},
        )
        assert resp.status_code == 200, resp.text
        ids = {c["id_cliente"] for c in resp.json()}
        assert id_natural in ids
        assert id_tcp not in ids
        assert id_juridica not in ids

        resp = client.get(
            "/api/v1/clientes", params={"tipo_persona": "TCP", "limit": 10000}
        )
        assert resp.status_code == 200, resp.text
        ids = {c["id_cliente"] for c in resp.json()}
        assert id_tcp in ids
        assert id_natural not in ids
        assert id_juridica not in ids

        # Filtro por entidad jurídica concreta: sólo esa persona jurídica y el
        # total del header coincide con el WHERE.
        resp = client.get(
            "/api/v1/clientes",
            params={"id_tipo_entidad": id_entidad, "limit": 10000},
        )
        assert resp.status_code == 200, resp.text
        assert resp.headers["X-Total-Count"] == "1"
        assert {c["id_cliente"] for c in resp.json()} == {id_juridica}

        # El filtro se combina con la búsqueda por texto.
        resp = client.get(
            "/api/v1/clientes",
            params={"tipo_persona": "TCP", "search": tcp["codigo"]},
        )
        assert resp.status_code == 200, resp.text
        assert [c["id_cliente"] for c in resp.json()] == [id_tcp]

        # Valores inválidos se rechazan.
        assert (
            client.get(
                "/api/v1/clientes", params={"tipo_persona": "OTRO"}
            ).status_code
            == 422
        )
        assert (
            client.get(
                "/api/v1/clientes", params={"id_tipo_entidad": 0}
            ).status_code
            == 422
        )
    finally:
        for id_cliente in creados:
            client.delete(f"/api/v1/clientes/{id_cliente}")
        _run_sql(
            "DELETE FROM tipo_entidad WHERE id_tipo_entidad = :id",
            {"id": id_entidad},
        )


@pytest.mark.usefixtures("db_session")
def test_transiciones_de_relacion_en_edicion(client):
    creado = client.post("/api/v1/clientes", json=_payload_tipo("JURIDICA"))
    assert creado.status_code == 201, creado.text
    id_cliente = creado.json()["id_cliente"]

    def cambiar(relacion: str):
        return client.put(
            f"/api/v1/clientes/{id_cliente}", json={"tipo_relacion": relacion}
        )

    try:
        # CLIENTE no puede degradarse a PROVEEDOR, sí ampliarse a AMBAS.
        resp = cambiar("PROVEEDOR")
        assert resp.status_code == 422, resp.text
        assert (
            client.get(f"/api/v1/clientes/{id_cliente}").json()["tipo_relacion"]
            == "CLIENTE"
        )

        resp = cambiar("AMBAS")
        assert resp.status_code == 200, resp.text
        assert resp.json()["tipo_relacion"] == "AMBAS"

        # Desde AMBAS se puede volver a una sola relación.
        resp = cambiar("CLIENTE")
        assert resp.status_code == 200, resp.text
        assert resp.json()["tipo_relacion"] == "CLIENTE"

        resp = cambiar("AMBAS")
        assert resp.status_code == 200, resp.text

        resp = cambiar("PROVEEDOR")
        assert resp.status_code == 200, resp.text
        assert resp.json()["tipo_relacion"] == "PROVEEDOR"

        # PROVEEDOR tampoco puede degradarse a CLIENTE, sí ampliarse a AMBAS.
        resp = cambiar("CLIENTE")
        assert resp.status_code == 422, resp.text
        assert (
            client.get(f"/api/v1/clientes/{id_cliente}").json()["tipo_relacion"]
            == "PROVEEDOR"
        )

        resp = cambiar("AMBAS")
        assert resp.status_code == 200, resp.text
        assert resp.json()["tipo_relacion"] == "AMBAS"
    finally:
        client.delete(f"/api/v1/clientes/{id_cliente}")
