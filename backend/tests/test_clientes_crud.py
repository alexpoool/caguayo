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
