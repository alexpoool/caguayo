"""Pre-facturas basadas en `factura.tipo`.

Flujo: cliente → contrato → pre-factura → factura.
Una pre-factura es una fila de `factura` con `tipo='PREFACTURA'`: no valida
stock ni crea movimientos. Al aprobarse se renumera a la serie FT, se crean
los movimientos pendientes y pasa a `tipo='FACTURA'` conservando items y pagos.

Los tests crean sus propios datos con SQL y limpian al terminar, igual que
test_ofertas_tienda.py (la suite corre contra la BD real de DATABASE_URL).
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


def _admin_dependencia_id():
    return _scalar("SELECT id_dependencia FROM usuarios WHERE alias = 'admin'")


@pytest.fixture()
def headers(client):
    return _login(client)


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


def _crear_producto(nombre: str, id_moneda: int, precio_venta: int = 10) -> int:
    return _scalar(
        "INSERT INTO productos (id_subcategoria, nombre, descripcion, precio_compra,"
        " precio_venta, moneda_compra, moneda_venta, precio_minimo)"
        " VALUES ((SELECT id_subcategoria FROM subcategorias LIMIT 1), :nombre,"
        f" 'TEST prefactura', 0, {precio_venta}, {id_moneda}, {id_moneda}, 0)"
        " RETURNING id_producto",
        {"nombre": nombre},
    )


def _crear_anexo_con_stock(
    nombre: str, id_producto: int, id_moneda: int, entrada: int
) -> int:
    """Crea convenio + anexo + item_anexo con stock disponible."""
    id_convenio = _scalar(
        "INSERT INTO convenio (nombre_convenio, id_tipo_convenio, id_cliente, fecha, vigencia)"
        " VALUES (:nombre, 1, 1, DATE '2026-06-01', DATE '2026-12-31')"
        " RETURNING id_convenio",
        {"nombre": nombre},
    )
    id_anexo = _scalar(
        "INSERT INTO anexo (id_convenio, nombre_anexo, fecha)"
        " VALUES (:c, :nombre, DATE '2026-06-01') RETURNING id_anexo",
        {"c": id_convenio, "nombre": nombre},
    )
    _sql(
        "INSERT INTO item_anexo (id_anexo, id_producto, entrada, vendido,"
        " precio_compra, precio_venta, id_moneda, a_vender)"
        f" VALUES (:a, :p, {entrada}, 0, 2, 10, {id_moneda}, FALSE)",
        {"a": id_anexo, "p": id_producto},
    )
    return id_anexo


def _limpiar_anexo(id_anexo: int, id_producto: int) -> None:
    id_convenio = _scalar(
        "SELECT id_convenio FROM anexo WHERE id_anexo = :a", {"a": id_anexo}
    )
    _sql("DELETE FROM item_anexo WHERE id_producto = :p", {"p": id_producto})
    _sql("DELETE FROM anexo WHERE id_anexo = :a", {"a": id_anexo})
    if id_convenio:
        _sql("DELETE FROM convenio WHERE id_convenio = :c", {"c": id_convenio})
    _sql("DELETE FROM productos WHERE id_producto = :p", {"p": id_producto})


def _limpiar_facturas(id_contrato: int) -> None:
    """Borra pagos/items/movimientos/facturas del contrato (incluidas anuladas)."""
    ids = _sql(
        "SELECT id_factura FROM factura WHERE id_contrato = :c",
        {"c": id_contrato},
    )
    for (id_factura,) in ids:
        _sql("DELETE FROM pago WHERE id_factura = :f", {"f": id_factura})
        _sql("DELETE FROM movimiento WHERE id_factura = :f", {"f": id_factura})
        _sql("DELETE FROM item_factura WHERE id_factura = :f", {"f": id_factura})
        _sql("DELETE FROM factura WHERE id_factura = :f", {"f": id_factura})


def _crear_prefactura(client, headers, id_contrato: int, payload: dict):
    return client.post(
        "/api/v1/facturas",
        json={
            "id_contrato": id_contrato,
            "fecha": payload.pop("fecha", "2026-07-01"),
            "tipo": "PREFACTURA",
            **payload,
        },
        headers=headers,
    )


@pytest.mark.usefixtures("db_session")
def test_prefactura_no_toca_stock_y_listados_separados(client, headers):
    """Crear una pre-factura no genera movimientos ni toca `vendido`, y vive
    en su propio listado (tipo=PREFACTURA)."""
    suffix = uuid.uuid4().hex[:8]
    id_moneda = _moneda_id()
    id_producto = _crear_producto(f"TEST prod pre {suffix}", id_moneda)
    id_anexo = _crear_anexo_con_stock(
        f"TEST anexo pre {suffix}", id_producto, id_moneda, 5
    )
    id_contrato = _crear_contrato(
        1, 1, id_moneda, f"TEST contrato pre {suffix}"
    )
    item = {
        "id_producto": id_producto,
        "cantidad": 3,
        "precio_venta": 10,
        "id_moneda": id_moneda,
        "id_anexo": id_anexo,
    }
    try:
        r1 = _crear_prefactura(
            client,
            headers,
            id_contrato,
            {"descripcion": "TEST pre 1", "items": [item]},
        )
        assert r1.status_code == 201, r1.text
        pre1 = r1.json()
        assert pre1["tipo"] == "PREFACTURA"
        assert pre1["estado"] == "ACTIVA"
        assert pre1["codigo_factura"].startswith("PFT.26.")
        assert pre1["codigo_factura"].endswith(".001")
        assert Decimal(str(pre1["monto"])) == Decimal("30.00")
        assert len(pre1["items"]) == 1

        r2 = _crear_prefactura(
            client,
            headers,
            id_contrato,
            {"fecha": "2026-07-02", "items": [item]},
        )
        assert r2.status_code == 201, r2.text
        pre2 = r2.json()
        assert pre2["codigo_factura"].endswith(".002")

        # Sin movimientos ni venta registrada
        assert (
            _scalar(
                "SELECT COUNT(*) FROM movimiento WHERE id_factura = :f",
                {"f": pre1["id_factura"]},
            )
            == 0
        )
        assert (
            _scalar(
                "SELECT vendido FROM item_anexo WHERE id_anexo = :a AND id_producto = :p",
                {"a": id_anexo, "p": id_producto},
            )
            == 0
        )

        listado_pre = client.get(
            "/api/v1/facturas?tipo=PREFACTURA", headers=headers
        ).json()
        ids_pre = [f["id_factura"] for f in listado_pre]
        assert pre1["id_factura"] in ids_pre
        assert pre2["id_factura"] in ids_pre

        listado_facturas = client.get("/api/v1/facturas", headers=headers).json()
        ids_facturas = [f["id_factura"] for f in listado_facturas]
        assert pre1["id_factura"] not in ids_facturas
        assert pre2["id_factura"] not in ids_facturas

        por_contrato_facturas = client.get(
            f"/api/v1/facturas/contrato/{id_contrato}", headers=headers
        ).json()
        assert por_contrato_facturas == []

        por_contrato = client.get(
            f"/api/v1/facturas/contrato/{id_contrato}?tipo=PREFACTURA",
            headers=headers,
        ).json()
        assert {f["id_factura"] for f in por_contrato} == {
            pre1["id_factura"],
            pre2["id_factura"],
        }
    finally:
        _limpiar_facturas(id_contrato)
        _sql("DELETE FROM contrato WHERE id_contrato = :c", {"c": id_contrato})
        _limpiar_anexo(id_anexo, id_producto)


@pytest.mark.usefixtures("db_session")
def test_aprobar_prefactura_con_pago_genera_factura_y_movimientos(client, headers):
    """Aprobar convierte la fila en factura, renumera a FT, reserva stock con
    movimientos pendientes y conserva los pagos."""
    suffix = uuid.uuid4().hex[:8]
    id_moneda = _moneda_id()
    id_producto = _crear_producto(f"TEST prod apro {suffix}", id_moneda)
    id_anexo = _crear_anexo_con_stock(
        f"TEST anexo apro {suffix}", id_producto, id_moneda, 5
    )
    id_contrato = _crear_contrato(
        1, 1, id_moneda, f"TEST contrato apro {suffix}"
    )
    id_dependencia_admin = _admin_dependencia_id()
    try:
        r = _crear_prefactura(
            client,
            headers,
            id_contrato,
            {
                "items": [
                    {
                        "id_producto": id_producto,
                        "cantidad": 2,
                        "precio_venta": 10,
                        "id_moneda": id_moneda,
                        "id_anexo": id_anexo,
                    }
                ]
            },
        )
        assert r.status_code == 201, r.text
        pre = r.json()
        id_pre = pre["id_factura"]
        assert pre["tipo"] == "PREFACTURA"

        # Pago parcial sobre la pre-factura (id_factura → factura)
        rp = client.post(
            "/api/v1/pagos",
            json={
                "id_factura": id_pre,
                "fecha": "2026-07-01",
                "monto": 5,
                "id_moneda": id_moneda,
                "tipo_pago": "EFECTIVO",
            },
            headers=headers,
        )
        assert rp.status_code == 201, rp.text
        pagos_antes = client.get(
            f"/api/v1/pagos/factura/{id_pre}", headers=headers
        ).json()
        assert len(pagos_antes) == 1

        ra = client.post(
            f"/api/v1/facturas/{id_pre}/aprobar", headers=headers
        )
        assert ra.status_code == 200, ra.text
        factura = ra.json()
        assert factura["id_factura"] == id_pre
        assert factura["tipo"] == "FACTURA"
        assert factura["codigo_factura"].startswith("FT.26.")
        assert factura["codigo_factura"].endswith(".001")
        assert Decimal(str(factura["monto"])) == Decimal("20.00")
        assert Decimal(str(factura["pago_actual"])) == Decimal("5.00")
        assert len(factura["items"]) == 1
        codigo_item = factura["items"][0]["codigo"]
        assert codigo_item is not None and codigo_item.startswith(
            f"{id_contrato:03d}.001."
        )

        # Se conserva el pago
        pagos = client.get(
            f"/api/v1/pagos/factura/{id_pre}", headers=headers
        ).json()
        assert len(pagos) == 1
        assert Decimal(str(pagos[0]["monto"])) == Decimal("5.00")

        # Movimiento pendiente con la dependencia de quien aprueba
        movs = _sql(
            "SELECT m.cantidad, tm.tipo, m.estado, m.id_dependencia"
            " FROM movimiento m"
            " JOIN tipo_movimiento tm ON tm.id_tipo_movimiento ="
            " m.id_tipo_movimiento"
            " WHERE m.id_factura = :f",
            {"f": id_pre},
        )
        assert len(movs) == 1
        cantidad, tipo_mov, estado, id_dep = movs[0]
        assert cantidad == 2
        assert tipo_mov == "venta"
        assert estado == "pendiente"
        assert id_dep == id_dependencia_admin

        # El stock físico aún no baja: solo al confirmar el movimiento
        assert (
            _scalar(
                "SELECT vendido FROM item_anexo WHERE id_anexo = :a AND id_producto = :p",
                {"a": id_anexo, "p": id_producto},
            )
            == 0
        )

        # Ya no está en pre-facturas y sí en facturas
        ids_pre = [
            f["id_factura"]
            for f in client.get(
                "/api/v1/facturas?tipo=PREFACTURA", headers=headers
            ).json()
        ]
        assert id_pre not in ids_pre
        ids_facturas = [
            f["id_factura"]
            for f in client.get("/api/v1/facturas", headers=headers).json()
        ]
        assert id_pre in ids_facturas

        # No se puede aprobar dos veces
        ra2 = client.post(f"/api/v1/facturas/{id_pre}/aprobar", headers=headers)
        assert ra2.status_code == 400, ra2.text
        assert "ya está aprobada" in ra2.json()["detail"]
    finally:
        _limpiar_facturas(id_contrato)
        _sql("DELETE FROM contrato WHERE id_contrato = :c", {"c": id_contrato})
        _limpiar_anexo(id_anexo, id_producto)


@pytest.mark.usefixtures("db_session")
def test_aprobar_prefactura_sin_stock_falla_y_sigue_prefactura(client, headers):
    """La pre-factura se crea sin stock; aprobar sin existencias da 400 y no
    cambia el tipo ni crea movimientos."""
    suffix = uuid.uuid4().hex[:8]
    id_moneda = _moneda_id()
    id_producto = _crear_producto(f"TEST prod sinstock {suffix}", id_moneda)
    id_contrato = _crear_contrato(
        1, 1, id_moneda, f"TEST contrato sinstock {suffix}"
    )
    try:
        r = _crear_prefactura(
            client,
            headers,
            id_contrato,
            {
                "items": [
                    {
                        "id_producto": id_producto,
                        "cantidad": 2,
                        "precio_venta": 10,
                        "id_moneda": id_moneda,
                    }
                ]
            },
        )
        assert r.status_code == 201, r.text
        id_pre = r.json()["id_factura"]
        assert r.json()["tipo"] == "PREFACTURA"

        ra = client.post(f"/api/v1/facturas/{id_pre}/aprobar", headers=headers)
        assert ra.status_code == 400, ra.text
        assert "Stock insuficiente" in ra.json()["detail"]

        factura = client.get(f"/api/v1/facturas/{id_pre}", headers=headers).json()
        assert factura["tipo"] == "PREFACTURA"
        assert factura["codigo_factura"].startswith("PFT.")
        assert (
            _scalar(
                "SELECT COUNT(*) FROM movimiento WHERE id_factura = :f",
                {"f": id_pre},
            )
            == 0
        )
    finally:
        _limpiar_facturas(id_contrato)
        _sql("DELETE FROM contrato WHERE id_contrato = :c", {"c": id_contrato})
        _sql("DELETE FROM productos WHERE id_producto = :p", {"p": id_producto})


@pytest.mark.usefixtures("db_session")
def test_series_pft_y_ft_independientes_y_renumeracion(client, headers):
    """PFT y FT numeran por separado; al aprobar se continúa la serie FT real
    y se renumera el código del item."""
    suffix = uuid.uuid4().hex[:8]
    id_moneda = _moneda_id()
    id_producto = _crear_producto(f"TEST prod series {suffix}", id_moneda)
    id_anexo = _crear_anexo_con_stock(
        f"TEST anexo series {suffix}", id_producto, id_moneda, 10
    )
    id_contrato = _crear_contrato(
        1, 1, id_moneda, f"TEST contrato series {suffix}"
    )
    item = {
        "id_producto": id_producto,
        "cantidad": 1,
        "precio_venta": 10,
        "id_moneda": id_moneda,
        "id_anexo": id_anexo,
    }
    try:
        r_factura = client.post(
            "/api/v1/facturas",
            json={
                "id_contrato": id_contrato,
                "fecha": "2026-07-01",
                "items": [item],
            },
            headers=headers,
        )
        assert r_factura.status_code == 201, r_factura.text
        factura = r_factura.json()
        assert factura["tipo"] == "FACTURA"
        assert factura["codigo_factura"].endswith(".001")

        r_pre = _crear_prefactura(
            client, headers, id_contrato, {"fecha": "2026-07-02", "items": [item]}
        )
        assert r_pre.status_code == 201, r_pre.text
        pre = r_pre.json()
        assert pre["codigo_factura"].startswith("PFT.")
        assert pre["codigo_factura"].endswith(".001")

        ra = client.post(
            f"/api/v1/facturas/{pre['id_factura']}/aprobar", headers=headers
        )
        assert ra.status_code == 200, ra.text
        aprobada = ra.json()
        assert aprobada["codigo_factura"].startswith("FT.26.")
        assert aprobada["codigo_factura"].endswith(".002")
        assert aprobada["items"][0]["codigo"].startswith(
            f"{id_contrato:03d}.002."
        )
    finally:
        _limpiar_facturas(id_contrato)
        _sql("DELETE FROM contrato WHERE id_contrato = :c", {"c": id_contrato})
        _limpiar_anexo(id_anexo, id_producto)


@pytest.mark.usefixtures("db_session")
def test_editar_prefactura_reemplaza_items_sin_tocar_stock(client, headers):
    """Editar una pre-factura cambia sus items y el monto, y sigue siendo
    pre-factura sin generar movimientos."""
    suffix = uuid.uuid4().hex[:8]
    id_moneda = _moneda_id()
    id_producto = _crear_producto(f"TEST prod edit {suffix}", id_moneda)
    id_anexo = _crear_anexo_con_stock(
        f"TEST anexo edit {suffix}", id_producto, id_moneda, 10
    )
    id_contrato = _crear_contrato(
        1, 1, id_moneda, f"TEST contrato edit {suffix}"
    )
    try:
        r = _crear_prefactura(
            client,
            headers,
            id_contrato,
            {
                "items": [
                    {
                        "id_producto": id_producto,
                        "cantidad": 1,
                        "precio_venta": 10,
                        "id_moneda": id_moneda,
                        "id_anexo": id_anexo,
                    }
                ]
            },
        )
        assert r.status_code == 201, r.text
        id_pre = r.json()["id_factura"]
        codigo_original = r.json()["codigo_factura"]

        ru = client.put(
            f"/api/v1/facturas/{id_pre}",
            json={
                "descripcion": "TEST editada",
                "items": [
                    {
                        "id_producto": id_producto,
                        "cantidad": 3,
                        "precio_venta": 10,
                        "id_moneda": id_moneda,
                        "id_anexo": id_anexo,
                    }
                ],
            },
            headers=headers,
        )
        assert ru.status_code == 200, ru.text
        editada = ru.json()
        assert editada["tipo"] == "PREFACTURA"
        assert editada["codigo_factura"] == codigo_original
        assert Decimal(str(editada["monto"])) == Decimal("30.00")
        assert len(editada["items"]) == 1
        assert editada["items"][0]["cantidad"] == 3
        assert (
            _scalar(
                "SELECT COUNT(*) FROM movimiento WHERE id_factura = :f",
                {"f": id_pre},
            )
            == 0
        )
    finally:
        _limpiar_facturas(id_contrato)
        _sql("DELETE FROM contrato WHERE id_contrato = :c", {"c": id_contrato})
        _limpiar_anexo(id_anexo, id_producto)


@pytest.mark.usefixtures("db_session")
def test_crear_factura_sin_stock_no_deja_factura_huerfana(client, headers):
    """Si la validación de stock falla, no queda una factura TMP_ sin items."""
    suffix = uuid.uuid4().hex[:8]
    id_moneda = _moneda_id()
    id_producto = _crear_producto(f"TEST prod huerfana {suffix}", id_moneda)
    id_contrato = _crear_contrato(
        1, 1, id_moneda, f"TEST contrato huerfana {suffix}"
    )
    try:
        r = client.post(
            "/api/v1/facturas",
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
        assert r.status_code == 400, r.text
        assert "Stock insuficiente" in r.json()["detail"]
        assert (
            _scalar(
                "SELECT COUNT(*) FROM factura WHERE id_contrato = :c",
                {"c": id_contrato},
            )
            == 0
        )
    finally:
        _limpiar_facturas(id_contrato)
        _sql("DELETE FROM contrato WHERE id_contrato = :c", {"c": id_contrato})
        _sql("DELETE FROM productos WHERE id_producto = :p", {"p": id_producto})


@pytest.mark.usefixtures("db_session")
def test_anular_prefactura_no_revierte_vendido(client, headers):
    """Anular una pre-factura no descuenta `item_anexo.vendido`: nunca se vendió."""
    suffix = uuid.uuid4().hex[:8]
    id_moneda = _moneda_id()
    id_producto = _crear_producto(f"TEST prod anular {suffix}", id_moneda)
    id_anexo = _crear_anexo_con_stock(
        f"TEST anexo anular {suffix}", id_producto, id_moneda, 10
    )
    # Simula ventas previas de otro documento
    _sql(
        "UPDATE item_anexo SET vendido = 2 WHERE id_anexo = :a AND id_producto = :p",
        {"a": id_anexo, "p": id_producto},
    )
    id_contrato = _crear_contrato(
        1, 1, id_moneda, f"TEST contrato anular {suffix}"
    )
    try:
        r = _crear_prefactura(
            client,
            headers,
            id_contrato,
            {
                "items": [
                    {
                        "id_producto": id_producto,
                        "cantidad": 2,
                        "precio_venta": 10,
                        "id_moneda": id_moneda,
                        "id_anexo": id_anexo,
                    }
                ]
            },
        )
        assert r.status_code == 201, r.text
        id_pre = r.json()["id_factura"]

        rd = client.delete(f"/api/v1/facturas/{id_pre}", headers=headers)
        assert rd.status_code == 204, rd.text

        assert (
            _scalar(
                "SELECT vendido FROM item_anexo WHERE id_anexo = :a AND id_producto = :p",
                {"a": id_anexo, "p": id_producto},
            )
            == 2
        )
        estado = _scalar(
            "SELECT estado FROM factura WHERE id_factura = :f", {"f": id_pre}
        )
        assert estado == "ANULADA"

        # No se puede aprobar una pre-factura anulada
        ra = client.post(f"/api/v1/facturas/{id_pre}/aprobar", headers=headers)
        assert ra.status_code == 400, ra.text
    finally:
        _limpiar_facturas(id_contrato)
        _sql("DELETE FROM contrato WHERE id_contrato = :c", {"c": id_contrato})
        _limpiar_anexo(id_anexo, id_producto)
