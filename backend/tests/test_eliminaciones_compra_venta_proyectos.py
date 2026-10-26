"""Eliminaciones en compra, venta y proyectos.

Comprueba la política acordada: nada queda bloqueado de forma opaca —
- Documentos con datos asociados se ANULAN (borrado lógico) conservando
  trazabilidad (contratos, facturas de venta, convenios, facturas de servicio).
- Registros contables confirmados (liquidación de persona confirmada,
  producto ya liquidado) se bloquean con mensaje claro (400 + texto).
- Registros referenciados por documentos emitidos (tareas facturadas,
  etapas con facturas/ofertas) se bloquean explicando qué eliminar primero.
- Todo lo limpio se borra físicamente (cascada manual donde hace falta).

Los tests crean sus propios datos con SQL y los limpian al terminar.
"""

import asyncio
import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from src.database.connection import DATABASE_URL


def _run_sql_returning(sql: str, params: dict) -> list:
    """Ejecuta SQL fuera del loop del TestClient y devuelve las filas."""

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
    return _run_sql_returning(sql + (" RETURNING *" if "RETURNING" not in sql else ""), params or {})


def _scalar(sql: str, params: dict | None = None):
    rows = _sql(sql, params)
    return rows[0][0] if rows else None


def _login(client) -> dict:
    # El login inserta el token en `sesion` (UNIQUE). Dos logins del admin que
    # caen en el mismo segundo generan el mismo JWT y chocan: primero se
    # reutiliza alguna sesión vigente.
    candidatos = [r[0] for r in _sql(
        "SELECT token FROM sesion WHERE fecha_expiracion > now()"
        " ORDER BY id_sesion DESC LIMIT 3"
    )]
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


def _crear_contrato_con_factura(con_pagos: bool = False) -> tuple[int, int]:
    """Crea contrato (SQL) + factura (SQL); returns (id_contrato, id_factura)."""
    ids = _sql(
        "INSERT INTO contrato (id_cliente, nombre, proforma, id_estado, fecha,"
        " vigencia, id_tipo_contrato, id_moneda, monto)"
        " VALUES (1, :nombre, :proforma, 1, DATE '2026-01-01', DATE '2026-12-31', 1, 1, 100)"
        " RETURNING id_contrato",
        {"nombre": "TEST contrato eliminacion", "proforma": None,
         },
    )
    id_contrato = ids[0][0]
    id_factura = _scalar(
        "INSERT INTO factura (id_contrato, codigo_factura, descripcion, fecha,"
        " monto, pago_actual)"
        " VALUES (:id_contrato, :codigo_factura, 'TEST', DATE '2026-01-01', 50, 0)"
        " RETURNING id_factura",
        {"id_contrato": id_contrato,
         "codigo_factura": f"TEST-ELIM-{uuid.uuid4().hex[:10]}",
         },
    )
    if con_pagos:
        _sql(
            "INSERT INTO pago (id_factura, fecha, monto, id_moneda, tipo_pago)"
            " VALUES (:id_factura, DATE '2026-01-02', 20, 1, 'TRANSFERENCIA')",
            {"id_factura": id_factura, },
        )
    return id_contrato, id_factura


def _limpiar(sql: str, params: dict) -> None:
    _sql(sql, params)


@pytest.fixture()
def headers(client):
    return _login(client)


# ============================================================
# VENTA: contratos y facturas (borrado lógico)
# ============================================================

@pytest.mark.usefixtures("db_session")
def test_contrato_con_facturas_se_anula_y_sale_del_listado(client, headers):
    id_contrato, id_factura = _crear_contrato_con_factura()
    try:
        r = client.delete(f"/api/v1/contratos/{id_contrato}", headers=headers)
        assert r.status_code == 204, r.text

        estado = _scalar(
            "SELECT ec.nombre FROM contrato c"
            " JOIN estado_contrato ec ON ec.id_estado_contrato = c.id_estado"
            " WHERE c.id_contrato = :id",
            {"id": id_contrato},
        )
        assert estado == "ANULADO"

        listado = client.get("/api/v1/contratos", headers=headers).json()
        ids = [c["id_contrato"] for c in listado]
        assert id_contrato not in ids

        # Su factura sigue existiendo (trazabilidad)
        n = _scalar("SELECT COUNT(*) FROM factura WHERE id_factura = :id",
                    {"id": id_factura})
        assert n == 1
    finally:
        _sql("DELETE FROM factura WHERE id_factura = :id", {"id": id_factura})
        _sql("DELETE FROM contrato WHERE id_contrato = :id", {"id": id_contrato})


@pytest.mark.usefixtures("db_session")
def test_factura_con_pagos_se_anula_y_conserva_pagos(client, headers):
    id_contrato, id_factura = _crear_contrato_con_factura(con_pagos=True)
    try:
        r = client.delete(f"/api/v1/facturas/{id_factura}", headers=headers)
        assert r.status_code == 204, r.text

        estado = _scalar("SELECT estado FROM factura WHERE id_factura = :id",
                         {"id": id_factura})
        assert estado == "ANULADA"

        # El pago NO se pierde (antes el CASCADE lo borra en silencio)
        pagos = _scalar("SELECT COUNT(*) FROM pago WHERE id_factura = :id",
                        {"id": id_factura})
        assert pagos == 1

        listado = client.get("/api/v1/facturas", headers=headers).json()
        ids = [f["id_factura"] for f in listado]
        assert id_factura not in ids
    finally:
        _sql("DELETE FROM pago WHERE id_factura = :id", {"id": id_factura})
        _sql("DELETE FROM factura WHERE id_factura = :id", {"id": id_factura})
        _sql("DELETE FROM contrato WHERE id_contrato = :id", {"id": id_contrato})


@pytest.mark.usefixtures("db_session")
def test_contrato_limpio_se_borra_fisicamente_con_suplementos(client, headers):
    row = _sql(
        "INSERT INTO contrato (id_cliente, nombre, proforma, id_estado, fecha,"
        " vigencia, id_tipo_contrato, id_moneda, monto)"
        " VALUES (1, :nombre, :proforma, 1, DATE '2026-01-01', DATE '2026-12-31', 1, 1, 100)"
        " RETURNING id_contrato",
        {"nombre": "TEST contrato limpio", "proforma": None,
         },
    )
    id_contrato = row[0][0]
    try:
        id_suplemento = _scalar(
            "INSERT INTO suplemento (id_contrato, nombre, id_estado, fecha,"
            " fecha_vigencia, monto)"
            " VALUES (:id_contrato, 'TEST supp', 1, DATE '2026-01-01', DATE '2026-01-01', 10)"
            " RETURNING id_suplemento",
            {"id_contrato": id_contrato, },
        )
        r = client.delete(f"/api/v1/contratos/{id_contrato}", headers=headers)
        assert r.status_code == 204, r.text

        assert _scalar("SELECT COUNT(*) FROM contrato WHERE id_contrato = :id",
                       {"id": id_contrato}) == 0
        assert _scalar(
            "SELECT COUNT(*) FROM suplemento WHERE id_suplemento = :id",
            {"id": id_suplemento}) == 0
    finally:
        _sql("DELETE FROM suplemento WHERE id_contrato = :id",
             {"id": id_contrato})
        _sql("DELETE FROM contrato WHERE id_contrato = :id", {"id": id_contrato})


# ============================================================
# VENTA: convenios (borrado lógico / físico)
# ============================================================

@pytest.mark.usefixtures("db_session")
def test_convenio_con_anexos_se_anula_y_limpio_se_borra(client, headers):
    id_convenio = _scalar(
        "INSERT INTO convenio (id_cliente, nombre_convenio, fecha, vigencia,"
        " id_tipo_convenio, codigo)"
        " VALUES (1, :nombre, DATE '2026-01-01', DATE '2026-12-31', 1, :codigo)"
        " RETURNING id_convenio",
        {"nombre": "TEST convenio eliminacion",
         "codigo": f"CV-TEST-{uuid.uuid4().hex[:8]}"},
    )
    id_convenio_limpio = _scalar(
        "INSERT INTO convenio (id_cliente, nombre_convenio, fecha, vigencia,"
        " id_tipo_convenio, codigo)"
        " VALUES (1, :nombre, DATE '2026-01-01', DATE '2026-12-31', 1, :codigo)"
        " RETURNING id_convenio",
        {"nombre": "TEST convenio limpio",
         "codigo": f"CV-TEST-{uuid.uuid4().hex[:8]}"},
    )
    try:
        # Con anexo → anulado (no físico), fuera del listado
        _sql(
            "INSERT INTO anexo (id_convenio, nombre_anexo, fecha)"
            " VALUES (:id_convenio, 'TEST anexo', DATE '2026-01-01')",
            {"id_convenio": id_convenio, },
        )
        r = client.delete(f"/api/v1/convenios/{id_convenio}", headers=headers)
        assert r.status_code == 204, r.text
        estado = _scalar("SELECT estado FROM convenio WHERE id_convenio = :id",
                         {"id": id_convenio})
        assert estado == "ANULADO"
        listado = client.get("/api/v1/convenios/simple", headers=headers).json()
        ids = [c["id_convenio"] for c in listado]
        assert id_convenio not in ids

        # Limpio → borrado físico
        r = client.delete(
            f"/api/v1/convenios/{id_convenio_limpio}", headers=headers
        )
        assert r.status_code == 204, r.text
        assert _scalar(
            "SELECT COUNT(*) FROM convenio WHERE id_convenio = :id",
            {"id": id_convenio_limpio}) == 0
    finally:
        _sql("DELETE FROM anexo WHERE id_convenio = :id", {"id": id_convenio})
        _sql("DELETE FROM convenio WHERE id_convenio = :id",
             {"id": id_convenio})


# ============================================================
# COMPRA: productos en liquidación y liquidaciones
# ============================================================

@pytest.mark.usefixtures("db_session")
def test_producto_liquidado_no_se_elimina(client, headers):
    id_p = _scalar(
        "INSERT INTO productos_en_liquidacion (codigo, id_producto, cantidad,"
        " precio, id_moneda, tipo_compra, liquidada, fecha)"
        " VALUES (:codigo, 1, 1, 10, 1, 'EFECTIVO', true, DATE '2026-01-01')"
        " RETURNING id_producto_en_liquidacion",
        {"codigo": f"TESTPEL-{uuid.uuid4().hex[:8]}", },
    )
    try:
        r = client.delete(
            f"/api/v1/productos-en-liquidacion/{id_p}", headers=headers
        )
        assert r.status_code == 400, r.text
        assert "liquidado" in r.json()["detail"].lower()
        assert _scalar(
            "SELECT COUNT(*) FROM productos_en_liquidacion"
            " WHERE id_producto_en_liquidacion = :id", {"id": id_p}) == 1
    finally:
        _sql("DELETE FROM productos_en_liquidacion"
             " WHERE id_producto_en_liquidacion = :id", {"id": id_p})


# ============================================================
# PROYECTOS: guardas de etapas, tareas y liquidaciones
# ============================================================

def _crear_etapa_de_prueba() -> tuple[int, int]:
    """Crea solicitud + etapa y devuelve (id_solicitud, id_etapa)."""
    id_solicitud = _scalar(
        "INSERT INTO solicitud_servicio (id_cliente, fecha_solicitud,"
        " estado, material_asumido_x, aprobado)"
        " VALUES (1, DATE '2026-01-01', 'PENDIENTE', false, false)"
        " RETURNING id_solicitud_servicio",
        {},
    )
    id_etapa = _scalar(
        "INSERT INTO etapas (id_solicitud_servicio, numero_etapa,"
        " nombre_etapa, valor, pagada)"
        " VALUES (:id_sol, 1, 'TEST etapa', 100, false)"
        " RETURNING id_etapa",
        {"id_sol": id_solicitud},
    )
    return id_solicitud, id_etapa


@pytest.mark.usefixtures("db_session")
def test_etapa_con_factura_activa_no_se_elimina(client, headers):
    id_solicitud, id_etapa = _crear_etapa_de_prueba()
    try:
        id_factura = _scalar(
            "INSERT INTO factura_servicio (id_etapa, codigo_factura, importe,"
            " pagado, estado, tipo)"
            " VALUES (:id_etapa, :codigo, 100, 0, 'APROBADA', 'FACTURA')"
            " RETURNING id_factura_servicio",
            {"id_etapa": id_etapa,
             "codigo": f"TESTFS-{uuid.uuid4().hex[:8]}"},
        )
        try:
            r = client.delete(f"/api/v1/etapas/{id_etapa}", headers=headers)
            assert r.status_code == 400, r.text
            assert "facturas" in r.json()["detail"].lower()
            assert _scalar("SELECT COUNT(*) FROM etapas WHERE id_etapa = :id",
                           {"id": id_etapa}) == 1
        finally:
            _sql("DELETE FROM factura_servicio WHERE id_factura_servicio = :id",
                 {"id": id_factura})

        # Sin factura: la etapa sí se elimina (con su solicitud)
        r = client.delete(f"/api/v1/etapas/{id_etapa}", headers=headers)
        assert r.status_code == 204, r.text
    finally:
        _sql("DELETE FROM etapas WHERE id_solicitud_servicio = :id",
             {"id": id_solicitud})
        _sql("DELETE FROM solicitud_servicio WHERE id_solicitud_servicio = :id",
             {"id": id_solicitud})


@pytest.mark.usefixtures("db_session")
def test_tarea_facturada_no_se_elimina(client, headers):
    id_solicitud, id_etapa = _crear_etapa_de_prueba()
    try:
        id_tarea = _scalar(
            "INSERT INTO tareas_etapa (id_etapa, cantidad, precio_ajustado,"
            " facturada)"
            " VALUES (:id_etapa, 1, 10, true)"
            " RETURNING id_tarea_etapa",
            {"id_etapa": id_etapa},
        )
        r = client.delete(f"/api/v1/tareas-etapa/{id_tarea}", headers=headers)
        assert r.status_code == 400, r.text
        assert "factura" in r.json()["detail"].lower()
        # Sin referencia a documentos: se elimina
        _sql("UPDATE tareas_etapa SET facturada = false"
             " WHERE id_tarea_etapa = :id", {"id": id_tarea})
        r = client.delete(f"/api/v1/tareas-etapa/{id_tarea}", headers=headers)
        assert r.status_code == 204, r.text
    finally:
        _sql("DELETE FROM tareas_etapa WHERE id_etapa = :id", {"id": id_etapa})
        _sql("DELETE FROM etapas WHERE id_solicitud_servicio = :id",
             {"id": id_solicitud})
        _sql("DELETE FROM solicitud_servicio WHERE id_solicitud_servicio = :id",
             {"id": id_solicitud})


@pytest.mark.usefixtures("db_session")
def test_persona_liquidacion_confirmada_no_se_elimina(client, headers):
    id_solicitud, id_etapa = _crear_etapa_de_prueba()
    try:
        id_liq = _scalar(
            "INSERT INTO persona_liquidacion (id_etapa, id_persona, fecha_emision,"
            " fecha_liquidacion, tipo_pago, importe, porcentaje_caguayo,"
            " importe_caguayo, porciento_gestion, porciento_empresa, devengado,"
            " tributario, tributario_monto, comision_bancaria,"
            " comision_admin_obra, neto_pagar, gasto_empresa, confirmado)"
            " VALUES (:id_etapa, 1, DATE '2026-01-01', DATE '2026-01-01', 'TRANSFERENCIA', 100, 10,"
            " 10, 0, 0, 0, 0, 0, 0, 0, 90, 0, true)"
            " RETURNING id_liquidacion",
            {"id_etapa": id_etapa, },
        )
        r = client.delete(
            f"/api/v1/persona-liquidacion/{id_liq}", headers=headers
        )
        assert r.status_code == 400, r.text
        assert "confirmada" in r.json()["detail"].lower()
        assert _scalar(
            "SELECT COUNT(*) FROM persona_liquidacion WHERE id_liquidacion = :id",
            {"id": id_liq}) == 1
    finally:
        _sql("DELETE FROM persona_liquidacion WHERE id_etapa = :id",
             {"id": id_etapa})
        _sql("DELETE FROM etapas WHERE id_solicitud_servicio = :id",
             {"id": id_solicitud})
        _sql("DELETE FROM solicitud_servicio WHERE id_solicitud_servicio = :id",
             {"id": id_solicitud})


@pytest.mark.usefixtures("db_session")
def test_factura_servicio_con_pagos_se_anula_y_conserva_pagos(client, headers):
    id_solicitud, id_etapa = _crear_etapa_de_prueba()
    try:
        id_factura = _scalar(
            "INSERT INTO factura_servicio (id_etapa, codigo_factura, importe,"
            " pagado, estado, tipo)"
            " VALUES (:id_etapa, :codigo, 100, 0, 'PENDIENTE', 'FACTURA')"
            " RETURNING id_factura_servicio",
            {"id_etapa": id_etapa,
             "codigo": f"TESTFS-{uuid.uuid4().hex[:8]}"},
        )
        _sql(
            "INSERT INTO pago_factura_servicio (id_factura_servicio, monto,"
            " monto_disponible, id_moneda, fecha)"
            " VALUES (:id_factura, 50, 50, 1, DATE '2026-01-02')",
            {"id_factura": id_factura, },
        )
        r = client.delete(
            f"/api/v1/facturas-servicio/{id_factura}", headers=headers
        )
        assert r.status_code == 204, r.text

        estado = _scalar(
            "SELECT estado FROM factura_servicio WHERE id_factura_servicio = :id",
            {"id": id_factura},
        )
        assert estado == "CANCELADA"
        assert _scalar(
            "SELECT COUNT(*) FROM pago_factura_servicio"
            " WHERE id_factura_servicio = :id", {"id": id_factura}) == 1

        listado = client.get("/api/v1/facturas-servicio", headers=headers).json()
        if listado:
            ids = [f["id_factura_servicio"] for f in listado]
            assert id_factura not in ids
    finally:
        _sql("DELETE FROM pago_factura_servicio WHERE id_factura_servicio = :id",
             {"id": id_factura})
        _sql("DELETE FROM factura_servicio WHERE id_factura_servicio = :id",
             {"id": id_factura})
        _sql("DELETE FROM etapas WHERE id_solicitud_servicio = :id",
             {"id": id_solicitud})
        _sql("DELETE FROM solicitud_servicio WHERE id_solicitud_servicio = :id",
             {"id": id_solicitud})


# ============================================================
# Errores básicos
# ============================================================

@pytest.mark.usefixtures("db_session")
def test_cuenta_inexistente_submit_404(client, headers):
    r = client.delete("/api/v1/cuentas/999999999", headers=headers)
    assert r.status_code == 404, r.text


@pytest.mark.usefixtures("db_session")
def test_delete_sin_token_submit_401(client):
    r = client.delete("/api/v1/etapas/999999999")
    assert r.status_code == 401, r.text
