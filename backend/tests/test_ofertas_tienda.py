"""Ofertas de tienda: flujo oferta → factura.

Los tests crean sus propios datos con SQL y limpian al terminar, igual
que test_eliminaciones_compra_venta_proyectos.py (la suite corre contra
la BD real definida en DATABASE_URL).
"""

import asyncio
import uuid
from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

from src.database.connection import DATABASE_URL


def _run_sql_returning(sql: str, params: dict) -> list:
    async def _go() -> list:
        engine = create_async_engine(DATABASE_URL)
        async with engine.begin() as conn:
            result = await conn.execute(text(sql), params)
            rows = result.fetchall()
        await engine.dispose()
        return rows

    return asyncio.run(_go())


def _sql(sql: str, params: dict | None = None) -> list:
    if sql.lstrip().upper().startswith(("SELECT", "WITH")):
        return _run_sql_returning(sql.replace("RETURNING *", ""), params or {})
    return _run_sql_returning(
        sql + (" RETURNING *" if "RETURNING" not in sql else ""), params or {}
    )


def _scalar(sql: str, params: dict | None = None):
    rows = _sql(sql, params)
    return rows[0][0] if rows else None


_cached_token: str | None = None


def _login(client) -> dict:
    """Login contra la MISMA BD que los requests (DATABASE_URL).

    El login escribe la sesión en la BD del token (`base_datos`); los endpoints
    con verify_auth la buscan en la sesión del request (DATABASE_URL en los
    tests). Autenticar contra otra BD produce 401 "token inválido o expirado".
    Se cachea el token para no chocar con el UNIQUE de `sesion.token` si dos
    logins caen en el mismo segundo.
    """
    #
    global _cached_token
    db_name = make_url(DATABASE_URL).database
    if _cached_token:
        headers = {"Authorization": f"Bearer {_cached_token}"}
        if client.get("/api/v1/auth/me", headers=headers).status_code == 200:
            return headers
    r = client.post(
        "/api/v1/auth/login",
        json={"alias": "admin", "contrasenia": "admin123", "base_datos": db_name},
    )
    assert r.status_code == 200, r.text
    _cached_token = r.json()["token"]
    return {"Authorization": f"Bearer {_cached_token}"}


def _moneda_id():
    return _scalar("SELECT id_moneda FROM moneda LIMIT 1")


@pytest.fixture()
def headers(client):
    return _login(client)


@pytest.mark.usefixtures("db_session")
def test_oferta_sin_token_devuelve_401(client):
    r_put = client.put("/api/v1/ofertas-tienda/1", json={})
    assert r_put.status_code == 401, r_put.text
    r_del = client.delete("/api/v1/ofertas-tienda/1")
    assert r_del.status_code == 401, r_del.text
    r_conv = client.post("/api/v1/ofertas-tienda/1/convertir")
    assert r_conv.status_code == 401, r_conv.text


@pytest.mark.usefixtures("db_session")
def test_crear_oferta_no_toca_stock_ni_movimientos(client, headers):
    """La oferta se crea con código OFT sin crear movimientos."""
    suffix = uuid.uuid4().hex[:8]
    id_moneda = _moneda_id()
    id_producto = _scalar(
        f"INSERT INTO productos (id_subcategoria, nombre, descripcion, precio_compra, precio_venta,"
        f" moneda_compra, moneda_venta, precio_minimo)"
        f" VALUES ((SELECT id_subcategoria FROM subcategorias LIMIT 1), :nombre, 'TEST oferta', 0, 10, {id_moneda}, {id_moneda}, 0)"
        f" RETURNING id_producto",
        {"nombre": f"TEST prod {suffix}"},
    )
    id_contrato = _scalar(
        f"INSERT INTO contrato (id_cliente, nombre, proforma, id_estado, fecha,"
        f" vigencia, id_tipo_contrato, id_moneda, monto)"
        f" VALUES (1, :nombre, NULL, 1, DATE '2026-06-01', DATE '2026-12-31',"
        f" 1, {id_moneda}, 100) RETURNING id_contrato",
        {"nombre": f"TEST contrato oferta {suffix}"},
    )
    try:
        r = client.post(
            "/api/v1/ofertas-tienda",
            json={
                "id_contrato": id_contrato,
                "fecha": "2026-07-01",
                "descripcion": "TEST oferta",
                "items": [
                    {
                        "id_producto": id_producto,
                        "cantidad": 3,
                        "precio_venta": 10,
                        "id_moneda": id_moneda,
                    }
                ],
            },
            headers=headers,
        )
        assert r.status_code == 201, r.text
        oferta = r.json()
        assert Decimal(str(oferta["monto"])) == Decimal("30.00")
        assert oferta["codigo_oferta"].startswith("OFT.26.")
        assert oferta["estado"] == "ACTIVA"
        id_oferta = oferta["id_oferta_tienda"]

        n_mov = _scalar(
            "SELECT COUNT(*) FROM movimiento WHERE id_producto = :p",
            {"p": id_producto},
        )
        assert n_mov == 0

        r2 = client.post(
            "/api/v1/ofertas-tienda",
            json={
                "id_contrato": id_contrato,
                "fecha": "2026-07-02",
                "items": [
                    {
                        "id_producto": id_producto,
                        "cantidad": 1,
                        "precio_venta": 5,
                        "id_moneda": id_moneda,
                    }
                ],
            },
            headers=headers,
        )
        assert r2.status_code == 201, r2.text
        assert r2.json()["codigo_oferta"].endswith(".002")

        # Anular: sale del listado
        rd = client.delete(f"/api/v1/ofertas-tienda/{id_oferta}", headers=headers)
        assert rd.status_code == 204, rd.text
        listado = client.get("/api/v1/ofertas-tienda", headers=headers).json()
        assert id_oferta not in [o["id_oferta_tienda"] for o in listado]
    finally:
        ids_ofer = _sql(
            "SELECT id_oferta_tienda FROM oferta_tienda WHERE id_contrato = :c",
            {"c": id_contrato},
        )
        for (id_o,) in ids_ofer:
            _sql(
                "DELETE FROM item_oferta_tienda WHERE id_oferta_tienda = :o",
                {"o": id_o},
            )
            _sql(
                "DELETE FROM oferta_tienda WHERE id_oferta_tienda = :o",
                {"o": id_o},
            )
        _sql("DELETE FROM contrato WHERE id_contrato = :c", {"c": id_contrato})
        _sql("DELETE FROM productos WHERE id_producto = :p", {"p": id_producto})


@pytest.mark.usefixtures("db_session")
def test_convertir_sin_stock_bloquea_y_oferta_queda_activa(client, headers):
    """Producto sin stock: la conversión falla (400) y la oferta sigue ACTIVA."""
    suffix = uuid.uuid4().hex[:8]
    id_moneda = _moneda_id()
    id_producto = _scalar(
        "INSERT INTO productos (id_subcategoria, nombre, descripcion, precio_compra, precio_venta,"
        " moneda_compra, moneda_venta, precio_minimo)"
        " VALUES ((SELECT id_subcategoria FROM subcategorias LIMIT 1), :nombre, 'TEST sin stock', 0, 10,"
        f" {id_moneda}, {id_moneda}, 0)"
        " RETURNING id_producto",
        {"nombre": f"TEST prod nostock {suffix}"},
    )
    id_contrato = _scalar(
        "INSERT INTO contrato (id_cliente, nombre, proforma, id_estado, fecha,"
        " vigencia, id_tipo_contrato, id_moneda, monto)"
        " VALUES (1, :nombre, NULL, 1, DATE '2026-06-01', DATE '2026-12-31',"
        f" 1, {id_moneda}, 100) RETURNING id_contrato",
        {"nombre": f"TEST contrato nostock {suffix}"},
    )
    try:
        r = client.post(
            "/api/v1/ofertas-tienda",
            json={
                "id_contrato": id_contrato,
                "fecha": "2026-07-01",
                "items": [
                    {
                        "id_producto": id_producto,
                        "cantidad": 2,
                        "precio_venta": 10,
                        "id_moneda": id_moneda,
                    }
                ],
            },
            headers=headers,
        )
        assert r.status_code == 201, r.text
        id_oferta = r.json()["id_oferta_tienda"]

        rc = client.post(
            f"/api/v1/ofertas-tienda/{id_oferta}/convertir", headers=headers
        )
        assert rc.status_code == 400, rc.text
        assert "Stock insuficiente" in rc.json()["detail"]

        estado = _scalar(
            "SELECT estado FROM oferta_tienda WHERE id_oferta_tienda = :o",
            {"o": id_oferta},
        )
        assert estado == "ACTIVA"
        n_facturas = _scalar(
            "SELECT COUNT(*) FROM factura f"
            " JOIN oferta_tienda o ON o.id_factura = f.id_factura"
            " WHERE o.id_oferta_tienda = :o",
            {"o": id_oferta},
        )
        assert n_facturas == 0
    finally:
        ids_ofer = _sql(
            "SELECT id_oferta_tienda FROM oferta_tienda WHERE id_contrato = :c",
            {"c": id_contrato},
        )
        for (id_o,) in ids_ofer:
            _sql(
                "DELETE FROM item_oferta_tienda WHERE id_oferta_tienda = :o",
                {"o": id_o},
            )
            _sql(
                "DELETE FROM oferta_tienda WHERE id_oferta_tienda = :o",
                {"o": id_o},
            )
        _sql("DELETE FROM contrato WHERE id_contrato = :c", {"c": id_contrato})
        _sql("DELETE FROM productos WHERE id_producto = :p", {"p": id_producto})


@pytest.mark.usefixtures("db_session")
def test_convertir_con_stock_crea_factura_items_y_movimientos(client, headers):
    """Flujo completo: oferta → convertida con factura, items y movimientos."""
    suffix = uuid.uuid4().hex[:8]
    id_moneda = _moneda_id()
    id_producto = _scalar(
        "INSERT INTO productos (id_subcategoria, nombre, descripcion, precio_compra, precio_venta,"
        " moneda_compra, moneda_venta, precio_minimo)"
        " VALUES ((SELECT id_subcategoria FROM subcategorias LIMIT 1), :nombre, 'TEST con stock', 0, 10,"
        f" {id_moneda}, {id_moneda}, 0)"
        " RETURNING id_producto",
        {"nombre": f"TEST prod stock {suffix}"},
    )
    id_convenio = _scalar(
        "INSERT INTO convenio (nombre_convenio, id_tipo_convenio, id_cliente, fecha, vigencia)"
        " VALUES (:nombre, 1, 1, DATE '2026-06-01', DATE '2026-12-31')"
        " RETURNING id_convenio",
        {"nombre": f"TEST convenio {suffix}"},
    )
    id_anexo = _scalar(
        "INSERT INTO anexo (id_convenio, nombre_anexo, fecha)"
        " VALUES (:c, 'TEST anexo', DATE '2026-06-01') RETURNING id_anexo",
        {"c": id_convenio},
    )
    # Stock por consignación: entrada 5, vendido 0
    _sql(
        "INSERT INTO item_anexo (id_anexo, id_producto, entrada, vendido,"
        " precio_compra, precio_venta, id_moneda, a_vender)"
        f" VALUES (:a, :p, 5, 0, 2, 10, {id_moneda}, FALSE)",
        {"a": id_anexo, "p": id_producto},
    )
    id_contrato = _scalar(
        "INSERT INTO contrato (id_cliente, nombre, proforma, id_estado, fecha,"
        " vigencia, id_tipo_contrato, id_moneda, monto)"
        " VALUES (1, :nombre, NULL, 1, DATE '2026-06-01', DATE '2026-12-31',"
        f" 1, {id_moneda}, 100) RETURNING id_contrato",
        {"nombre": f"TEST contrato conv {suffix}"},
    )
    id_oferta = None
    id_factura = None
    try:
        r = client.post(
            "/api/v1/ofertas-tienda",
            json={
                "id_contrato": id_contrato,
                "fecha": "2026-07-01",
                "descripcion": "TEST conversion",
                "items": [
                    {
                        "id_producto": id_producto,
                        "cantidad": 4,
                        "precio_venta": 10,
                        "id_moneda": id_moneda,
                        "id_anexo": id_anexo,
                    }
                ],
            },
            headers=headers,
        )
        assert r.status_code == 201, r.text
        id_oferta = r.json()["id_oferta_tienda"]

        rc = client.post(
            f"/api/v1/ofertas-tienda/{id_oferta}/convertir", headers=headers
        )
        assert rc.status_code == 201, rc.text
        factura = rc.json()
        id_factura = factura["id_factura"]

        assert factura["id_contrato"] == id_contrato
        assert Decimal(str(factura["monto"])) == Decimal("40.00")
        assert factura["codigo_factura"].startswith("FT.")
        assert factura["codigo_factura"] not in ("OFT", "")
        assert len(factura["items"]) == 1
        assert factura["items"][0]["cantidad"] == 4
        assert factura["items"][0]["id_anexo"] == id_anexo

        # La oferta quedó CONVERTIDA con rastro de la factura y fuera del listado
        oferta = _sql(
            "SELECT estado, id_factura FROM oferta_tienda"
            " WHERE id_oferta_tienda = :o",
            {"o": id_oferta},
        )[0]
        assert oferta[0] == "CONVERTIDA"
        assert oferta[1] == id_factura
        listado = client.get("/api/v1/ofertas-tienda", headers=headers).json()
        assert id_oferta not in [o["id_oferta_tienda"] for o in listado]

        # Movimientos de venta pendientes por el item
        movs = _sql(
            "SELECT m.cantidad, tm.tipo, m.estado FROM movimiento m"
            " JOIN tipo_movimiento tm ON tm.id_tipo_movimiento ="
            " m.id_tipo_movimiento"
            " WHERE m.id_factura = :f",
            {"f": id_factura},
        )
        assert len(movs) == 1
        assert movs[0][0] == 4
        assert movs[0][1] == "venta"
        assert movs[0][2] == "pendiente"

        # Reconvertir se bloquea
        rd = client.post(
            f"/api/v1/ofertas-tienda/{id_oferta}/convertir", headers=headers
        )
        assert rd.status_code == 400, rd.text
    finally:
        if id_oferta:
            _sql(
                "DELETE FROM item_oferta_tienda WHERE id_oferta_tienda = :o",
                {"o": id_oferta},
            )
            _sql(
                "DELETE FROM oferta_tienda WHERE id_oferta_tienda = :o",
                {"o": id_oferta},
            )
        if id_factura:
            _sql("DELETE FROM movimiento WHERE id_factura = :f", {"f": id_factura})
            _sql(
                "DELETE FROM item_factura WHERE id_factura = :f", {"f": id_factura}
            )
            _sql("DELETE FROM factura WHERE id_factura = :f", {"f": id_factura})
        _sql("DELETE FROM contrato WHERE id_contrato = :c", {"c": id_contrato})
        _sql("DELETE FROM item_anexo WHERE id_producto = :p", {"p": id_producto})
        _sql("DELETE FROM anexo WHERE id_anexo = :a", {"a": id_anexo})
        _sql("DELETE FROM convenio WHERE id_convenio = :c", {"c": id_convenio})
        _sql("DELETE FROM productos WHERE id_producto = :p", {"p": id_producto})


def _crear_contrato(id_cliente: int, id_estado: int, id_moneda: int, nombre: str) -> int:
    return _scalar(
        "INSERT INTO contrato (id_cliente, nombre, proforma, id_estado, fecha,"
        " vigencia, id_tipo_contrato, id_moneda, monto)"
        " VALUES (:c, :nombre, NULL, :estado, DATE '2026-06-01',"
        " DATE '2026-12-31', 1, :moneda, 100) RETURNING id_contrato",
        {
            "c": id_cliente,
            "nombre": nombre,
            "estado": id_estado,
            "moneda": id_moneda,
        },
    )


@pytest.mark.usefixtures("db_session")
def test_crear_oferta_contrato_anulado_bloquea(client, headers):
    """Un contrato ANULADO no admite ofertas nuevas."""
    suffix = uuid.uuid4().hex[:8]
    id_contrato = _crear_contrato(
        1, 34, _moneda_id(), f"TEST contrato anulado {suffix}"
    )
    try:
        r = client.post(
            "/api/v1/ofertas-tienda",
            json={"id_contrato": id_contrato, "fecha": "2026-07-01"},
            headers=headers,
        )
        assert r.status_code == 400, r.text
        assert "anulado" in r.json()["detail"].lower()

        n = _scalar(
            "SELECT COUNT(*) FROM oferta_tienda WHERE id_contrato = :c",
            {"c": id_contrato},
        )
        assert n == 0
    finally:
        _sql("DELETE FROM contrato WHERE id_contrato = :c", {"c": id_contrato})


@pytest.mark.usefixtures("db_session")
def test_crear_oferta_cliente_baja_bloquea(client, headers):
    """Un cliente en BAJA no admite ofertas nuevas."""
    suffix = uuid.uuid4().hex[:8]
    id_cliente = _scalar(
        "INSERT INTO clientes (nombre, nit, codigo, direccion, tipo_relacion, estado, fecha_registro)"
        " VALUES (:nombre, :nit, :codigo, 'TEST', 'CLIENTE', 'BAJA', DATE '2026-01-01')"
        " RETURNING id_cliente",
        {
            "nombre": f"TEST cliente baja {suffix}",
            "nit": f"NIT-{suffix}",
            "codigo": f"CLI-{suffix}",
        },
    )
    id_contrato = _crear_contrato(
        id_cliente, 1, _moneda_id(), f"TEST contrato cliente baja {suffix}"
    )
    try:
        r = client.post(
            "/api/v1/ofertas-tienda",
            json={"id_contrato": id_contrato, "fecha": "2026-07-01"},
            headers=headers,
        )
        assert r.status_code == 400, r.text
        assert "baja" in r.json()["detail"].lower()

        n = _scalar(
            "SELECT COUNT(*) FROM oferta_tienda WHERE id_contrato = :c",
            {"c": id_contrato},
        )
        assert n == 0
    finally:
        _sql("DELETE FROM contrato WHERE id_contrato = :c", {"c": id_contrato})
        _sql("DELETE FROM clientes WHERE id_cliente = :c", {"c": id_cliente})


@pytest.mark.usefixtures("db_session")
def test_convertir_oferta_contrato_anulado_bloquea_y_queda_activa(client, headers):
    """Si el contrato se anula después de ofertar, la conversión falla sin
    crear factura y sin tocar el estado de la oferta."""
    suffix = uuid.uuid4().hex[:8]
    id_moneda = _moneda_id()
    id_producto = _scalar(
        "INSERT INTO productos (id_subcategoria, nombre, descripcion, precio_compra, precio_venta,"
        " moneda_compra, moneda_venta, precio_minimo)"
        " VALUES ((SELECT id_subcategoria FROM subcategorias LIMIT 1), :nombre, 'TEST anulado', 0, 10,"
        f" {id_moneda}, {id_moneda}, 0)"
        " RETURNING id_producto",
        {"nombre": f"TEST prod anulado {suffix}"},
    )
    id_contrato = _crear_contrato(
        1, 1, id_moneda, f"TEST contrato conv anulado {suffix}"
    )
    id_oferta = None
    try:
        r = client.post(
            "/api/v1/ofertas-tienda",
            json={
                "id_contrato": id_contrato,
                "fecha": "2026-07-01",
                "items": [
                    {
                        "id_producto": id_producto,
                        "cantidad": 1,
                        "precio_venta": 10,
                        "id_moneda": id_moneda,
                    }
                ],
            },
            headers=headers,
        )
        assert r.status_code == 201, r.text
        id_oferta = r.json()["id_oferta_tienda"]

        _sql(
            "UPDATE contrato SET id_estado = 34 WHERE id_contrato = :c",
            {"c": id_contrato},
        )

        rc = client.post(
            f"/api/v1/ofertas-tienda/{id_oferta}/convertir", headers=headers
        )
        assert rc.status_code == 400, rc.text
        assert "anulado" in rc.json()["detail"].lower()

        estado = _scalar(
            "SELECT estado FROM oferta_tienda WHERE id_oferta_tienda = :o",
            {"o": id_oferta},
        )
        assert estado == "ACTIVA"
        n_facturas = _scalar(
            "SELECT COUNT(*) FROM factura WHERE id_contrato = :c",
            {"c": id_contrato},
        )
        assert n_facturas == 0
    finally:
        if id_oferta:
            _sql(
                "DELETE FROM item_oferta_tienda WHERE id_oferta_tienda = :o",
                {"o": id_oferta},
            )
            _sql(
                "DELETE FROM oferta_tienda WHERE id_oferta_tienda = :o",
                {"o": id_oferta},
            )
        _sql("DELETE FROM contrato WHERE id_contrato = :c", {"c": id_contrato})
        _sql("DELETE FROM productos WHERE id_producto = :p", {"p": id_producto})


@pytest.mark.usefixtures("db_session")
def test_crear_factura_directa_contrato_anulado_bloquea(client, headers):
    """La facturación directa (sin oferta) también valida el estado."""
    suffix = uuid.uuid4().hex[:8]
    id_contrato = _crear_contrato(
        1, 34, _moneda_id(), f"TEST contrato factura anulada {suffix}"
    )
    try:
        r = client.post(
            "/api/v1/facturas",
            json={"id_contrato": id_contrato, "fecha": "2026-07-01"},
            headers=headers,
        )
        assert r.status_code == 400, r.text
        assert "anulado" in r.json()["detail"].lower()

        n = _scalar(
            "SELECT COUNT(*) FROM factura WHERE id_contrato = :c",
            {"c": id_contrato},
        )
        assert n == 0
    finally:
        _sql("DELETE FROM contrato WHERE id_contrato = :c", {"c": id_contrato})
