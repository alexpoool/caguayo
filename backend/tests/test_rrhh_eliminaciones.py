"""Eliminaciones del módulo RRHH (política de borrados lógicos).

Comprueba:
- Nómina `pre_nomina`: borrado físico (los movimientos que cubría quedan
  libres). Nómina confirmada: ANULACIÓN lógica conservando el detalle y los
  pagos de salario (y sale del listado).
- Movimientos (deducciones/bonificaciones) incluidos en una nómina
  confirmada: bloqueados con mensaje claro hasta que se anule esa nómina.
- Tipo de pago referenciado solo por la cabecera de una nómina: desactivado
  (antes caía en IntegrityError → 500).
- Evaluación usada en pagos por resultado: ANULADA en vez de borrada (la FK
  de `pago_x_resultado_empleado` es CASCADE y arrastraría importes pagados).
- Empleado con pagos por resultado: desactivado, no borrado físico.
- Las rutas RRHH exigen token (401 sin él).

Los tests crean sus propios datos con SQL y los limpian al terminar.
"""

import asyncio
import uuid

import pytest
from sqlalchemy import text
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


@pytest.fixture(autouse=True)
def _auth_rrhh(client, auth_headers):
    """Las rutas RRHH llevan verify_auth: inyecto el header en el cliente."""
    client.headers.update(auth_headers)


# ── Semillas SQL ─────────────────────────────────────────────────────────────


def _crear_empleado_sql(nombre: str) -> int:
    return _scalar(
        "INSERT INTO empleados (nombre, apellido, salario, horas_a_trabajar,"
        " dias_a_trabajar, fecha_contratacion)"
        " VALUES (:nombre, 'TEST', 2400, 8, 22, DATE '2026-01-01')"
        " RETURNING id",
        {"nombre": nombre},
    )


def _crear_nomina_sql(
    descripcion: str, estado: str, metodo_pago_id: int | None = None
) -> int:
    return _scalar(
        "INSERT INTO nomina (descripcion, inicio_periodo, fin_periodo,"
        " moneda_id, tasa, porcentaje_impuesto, estado, metodo_pago_id)"
        " VALUES (:descripcion, DATE '2026-03-01', DATE '2026-03-31', 1, 1, 0,"
        " :estado, :metodo)",
        {"descripcion": descripcion, "estado": estado, "metodo": metodo_pago_id},
    )


def _crear_nomina_empleado(nomina_id: int, empleado_id: int):
    metodo = _scalar("SELECT id_tipo_pago FROM tipos_pago LIMIT 1")
    _sql(
        "INSERT INTO nomina_empleados (nomina_id, empleados_id, salario_base,"
        " devengado, neto_a_cobrar, fecha_pago, monto, metodo_id)"
        " VALUES (:nomina, :empleado, 1600, 1600, 1600, DATE '2026-04-02', 1600,"
        " :metodo)",
        {"nomina": nomina_id, "empleado": empleado_id, "metodo": metodo},
    )


def _crear_deduccion_sql(empleado_id: int, tipo_id: int, descripcion: str) -> int:
    return _scalar(
        "INSERT INTO deducciones (empleados_id, tipo_deducciones_id, valor,"
        " inicio_periodo, fin_periodo, observaciones)"
        " VALUES (:empleado, :tipo, 50, DATE '2026-03-05', DATE '2026-03-31',"
        " :observaciones)"
        " RETURNING id_deducciones",
        {"empleado": empleado_id, "tipo": tipo_id, "observaciones": descripcion},
    )


def _crear_evaluacion_con_pago(empleado_id: int):
    """Crea evaluación + lote de pago por resultado; devuelve sus ids."""
    periodo = _sql(
        "INSERT INTO periodo_evaluaciones (nombre, activo)"
        " VALUES (:nombre, true) RETURNING id_periodo_evaluacion",
        {"nombre": f"YYYY-test-{uuid.uuid4().hex[:10]}"},
    )[0][0]
    tipo_id = _scalar("SELECT id_tipos_evaluaciones FROM tipos_evaluaciones LIMIT 1")
    evaluacion = _scalar(
        "INSERT INTO evaluaciones (empleado_id, periodo, tipo_evaluacion_id,"
        " inicio_periodo, fin_periodo, promedio_objetivos)"
        " VALUES (:empleado, 'TEST-eliminacion', :tipo,"
        " DATE '2026-03-01', DATE '2026-03-31', 4.00)"
        " RETURNING id",
        {"empleado": empleado_id, "tipo": tipo_id},
    )
    lote = _scalar(
        "INSERT INTO pago_x_resultado (periodo_evaluacion_id, inicio_periodo,"
        " fin_periodo, monto, nomina_id)"
        " VALUES (:periodo, DATE '2026-03-01', DATE '2026-03-31', 1000, NULL)"
        " RETURNING id_pago_x_resultado",
        {"periodo": periodo},
    )
    _sql(
        "INSERT INTO pago_x_resultado_empleado (pago_x_resultado_id, empleado_id,"
        " evaluacion_id, puntuacion, coeficiente, devengado, impuesto,"
        " neto_a_cobrar)"
        " VALUES (:lote, :empleado, :evaluacion, 4.0, 1.0, 1000, 0, 1000)",
        {"lote": lote, "empleado": empleado_id, "evaluacion": evaluacion},
    )
    return periodo, evaluacion, lote


# ── Tests: nómina ───────────────────────────────────────────────────────────


def test_nomina_confirmada_se_anula_conservando_pagos(client):
    marcador = f"TEST nomina anulada {uuid.uuid4().hex[:8]}"
    empleado = _crear_empleado_sql(marcador)
    nomina_id = _crear_nomina_sql(marcador, estado="nomina")
    _crear_nomina_empleado(nomina_id, empleado)
    try:
        r = client.delete(f"/api/v1/rrhh/nomina/{nomina_id}")
        assert r.status_code == 200, r.text
        assert r.json()["accion"] == "anulada"

        # El detalle (y el pago de salario) sigue accesible.
        detalle = client.get(f"/api/v1/rrhh/nomina/{nomina_id}")
        assert detalle.status_code == 200, detalle.text
        cuerpo = detalle.json()
        assert cuerpo["estado"] == "anulada"
        assert len(cuerpo["empleados"]) == 1
        fila = cuerpo["empleados"][0]
        assert fila["fecha_pago"] is not None and fila["monto"] is not None

        # Sale del listado por defecto.
        ids = [n["id"] for n in client.get("/api/v1/rrhh/nomina").json()]
        assert nomina_id not in ids
    finally:
        _sql("DELETE FROM nomina WHERE id = :id", {"id": nomina_id})
        _sql("DELETE FROM empleados WHERE id = :id", {"id": empleado})


def test_nomina_pre_nomina_se_borra_fisicamente(client):
    marcador = f"TEST nomina pre {uuid.uuid4().hex[:8]}"
    nomina_id = _crear_nomina_sql(marcador, estado="pre_nomina")
    empleado = _crear_empleado_sql(marcador)
    _crear_nomina_empleado(nomina_id, empleado)
    try:
        r = client.delete(f"/api/v1/rrhh/nomina/{nomina_id}")
        assert r.status_code == 200, r.text
        assert r.json()["accion"] == "eliminado"
        assert client.get(f"/api/v1/rrhh/nomina/{nomina_id}").status_code == 404
        # El detalle cayó en cascada.
        queda = _scalar(
            "SELECT COUNT(*) FROM nomina_empleados WHERE nomina_id = :id",
            {"id": nomina_id},
        )
        assert queda == 0
    finally:
        _sql("DELETE FROM nomina WHERE id = :id", {"id": nomina_id})
        _sql("DELETE FROM empleados WHERE id = :id", {"id": empleado})


def test_nomina_anulada_reiterada_es_idempotente(client):
    marcador = f"TEST nomina re {uuid.uuid4().hex[:8]}"
    nomina_id = _crear_nomina_sql(marcador, estado="nomina")
    try:
        assert client.delete(f"/api/v1/rrhh/nomina/{nomina_id}").status_code == 200
        r = client.delete(f"/api/v1/rrhh/nomina/{nomina_id}")
        assert r.status_code == 200, r.text
        assert r.json()["accion"] == "anulada"
    finally:
        _sql("DELETE FROM nomina WHERE id = :id", {"id": nomina_id})


# ── Tests: movimientos ligados a nómina confirmada ──────────────────────────


def test_deduccion_en_nomina_confirmada_bloqueada_hasta_anularla(client):
    marcador = f"TEST deduccion {uuid.uuid4().hex[:8]}"
    empleado = _crear_empleado_sql(marcador)
    tipo_id = _scalar("SELECT id_tipos_deducciones FROM tipos_deducciones LIMIT 1")
    nomina_id = _crear_nomina_sql(marcador, estado="nomina")
    _crear_nomina_empleado(nomina_id, empleado)
    deduccion_id = _crear_deduccion_sql(empleado, tipo_id, marcador)
    try:
        # Bloqueada con un mensaje que nombra la nómina.
        r = client.delete(f"/api/v1/rrhh/deducciones/{deduccion_id}")
        assert r.status_code == 409, r.text
        assert "nómina confirmada" in r.json()["detail"].lower()

        # También queda congelada su edición.
        u = client.put(
            f"/api/v1/rrhh/deducciones/{deduccion_id}", json={"valor": 60}
        )
        assert u.status_code == 409, u.text

        # Anulada la nómina, el movimiento vuelve a ser eliminable.
        a = client.delete(f"/api/v1/rrhh/nomina/{nomina_id}")
        assert a.status_code == 200, a.text
        assert a.json()["accion"] == "anulada"

        d = client.delete(f"/api/v1/rrhh/deducciones/{deduccion_id}")
        assert d.status_code == 200, d.text
        assert d.json()["accion"] == "eliminado"
    finally:
        _sql("DELETE FROM nomina WHERE id = :id", {"id": nomina_id})
        _sql(
            "DELETE FROM deducciones WHERE id_deducciones = :id",
            {"id": deduccion_id},
        )
        _sql("DELETE FROM empleados WHERE id = :id", {"id": empleado})


# ── Tests: el delete de nómina con pago por resultado → 409 literal ────────


def test_nomina_anulada_conserva_movimiento_para_el_reporte(client):
    """El reporte de costo solo cuenta nóminas confirmadas: anulada no suma."""
    marcador = f"TEST costo {uuid.uuid4().hex[:8]}"
    nomina_id = _crear_nomina_sql(marcador, estado="nomina")
    empleado = _crear_empleado_sql(marcador)
    _crear_nomina_empleado(nomina_id, empleado)
    try:
        assert client.delete(f"/api/v1/rrhh/nomina/{nomina_id}").status_code == 200
        # El listado de pagos sigue mostrando el pago del lote anulado.
        pagos = client.get("/api/v1/rrhh/nomina/pagos").json()
        de_esta = [p for p in pagos if p["nomina_id"] == nomina_id]
        assert len(de_esta) == 1
        assert de_esta[0]["estado_nomina"] == "anulada"
        # El reporte de costo no explota con nóminas anuladas.
        assert client.get("/api/v1/rrhh/nomina/costo").status_code == 200
    finally:
        _sql("DELETE FROM nomina WHERE id = :id", {"id": nomina_id})
        _sql("DELETE FROM empleados WHERE id = :id", {"id": empleado})


# ── Tests: catálogo de tipos de pago ────────────────────────────────────────


def test_tipo_pago_usado_solo_por_nomina_se_desactiva(client):
    marcador = f"TEST pago {uuid.uuid4().hex[:8]}"
    tipo_id = _scalar(
        "INSERT INTO tipos_pago (nombre, descripcion)"
        " VALUES (:nombre, 'TEST')"
        " RETURNING id_tipo_pago",
        {"nombre": marcador[:30]},
    )
    nomina_id = _crear_nomina_sql(marcador, estado="pre_nomina", metodo_pago_id=tipo_id)
    try:
        r = client.delete(f"/api/v1/rrhh/catalogos/tipos-pago/{tipo_id}")
        assert r.status_code == 200, r.text
        assert r.json()["accion"] == "desactivado"
    finally:
        _sql("DELETE FROM nomina WHERE id = :id", {"id": nomina_id})
        _sql("DELETE FROM tipos_pago WHERE id_tipo_pago = :id", {"id": tipo_id})


def test_tipo_pago_libre_se_borra_fisicamente(client):
    marcador = f"TEST pago libre {uuid.uuid4().hex[:8]}"
    tipo_id = _scalar(
        "INSERT INTO tipos_pago (nombre)"
        " VALUES (:nombre) RETURNING id_tipo_pago",
        {"nombre": marcador[:30]},
    )
    try:
        r = client.delete(f"/api/v1/rrhh/catalogos/tipos-pago/{tipo_id}")
        assert r.status_code == 200, r.text
        assert r.json()["accion"] == "eliminado"
    finally:
        _sql("DELETE FROM tipos_pago WHERE id_tipo_pago = :id", {"id": tipo_id})


# ── Tests: evaluaciones usadas en pagos por resultado ───────────────────────


def test_evaluacion_usada_en_pago_queda_anulada(client):
    marcador = f"TEST eval {uuid.uuid4().hex[:8]}"
    empleado = _crear_empleado_sql(marcador)
    periodo, evaluacion_id, lote = _crear_evaluacion_con_pago(empleado)
    try:
        r = client.delete(f"/api/v1/rrhh/evaluaciones/{evaluacion_id}")
        assert r.status_code == 200, r.text
        assert r.json()["accion"] == "anulada"

        # La fila del lote (dinero repartido) se conserva.
        queda = _scalar(
            "SELECT COUNT(*) FROM pago_x_resultado_empleado WHERE evaluacion_id = :id",
            {"id": evaluacion_id},
        )
        assert queda == 1

        # Sale del listado y queda congelada (solo lectura).
        ids = [
            e["id"] for e in client.get("/api/v1/rrhh/evaluaciones").json()
        ]
        assert evaluacion_id not in ids
        u = client.put(
            f"/api/v1/rrhh/evaluaciones/{evaluacion_id}", json={"comentarios": "x"}
        )
        assert u.status_code == 409, u.text
        assert "anulada" in u.json()["detail"].lower()

        # Ya está anulada: reiterar no explota y no recalcula el lote.
        r2 = client.delete(f"/api/v1/rrhh/evaluaciones/{evaluacion_id}")
        assert r2.status_code == 200, r2.text
    finally:
        _sql(
            "DELETE FROM pago_x_resultado WHERE id_pago_x_resultado = :id",
            {"id": lote},
        )
        _sql("DELETE FROM evaluaciones WHERE id = :id", {"id": evaluacion_id})
        _sql(
            "DELETE FROM periodo_evaluaciones WHERE id_periodo_evaluacion = :id",
            {"id": periodo},
        )
        _sql("DELETE FROM empleados WHERE id = :id", {"id": empleado})


def test_evaluacion_sin_pago_se_borra_fisicamente(client):
    marcador = f"TEST eval libre {uuid.uuid4().hex[:8]}"
    empleado = _crear_empleado_sql(marcador)
    tipo_id = _scalar("SELECT id_tipos_evaluaciones FROM tipos_evaluaciones LIMIT 1")
    evaluacion_id = _scalar(
        "INSERT INTO evaluaciones (empleado_id, periodo, tipo_evaluacion_id,"
        " inicio_periodo, fin_periodo)"
        " VALUES (:empleado, :periodo, :tipo, DATE '2026-03-01', DATE '2026-03-31')"
        " RETURNING id",
        {"empleado": empleado, "periodo": marcador[:90], "tipo": tipo_id},
    )
    try:
        r = client.delete(f"/api/v1/rrhh/evaluaciones/{evaluacion_id}")
        assert r.status_code == 200, r.text
        assert client.get(f"/api/v1/rrhh/evaluaciones/{evaluacion_id}").status_code == 404
    finally:
        _sql("DELETE FROM evaluaciones WHERE id = :id", {"id": evaluacion_id})
        _sql("DELETE FROM empleados WHERE id = :id", {"id": empleado})


# ── Tests: empleado con pagos por resultado ─────────────────────────────────


def test_empleado_con_pago_resultado_se_desactiva(client):
    marcador = f"TEST emp {uuid.uuid4().hex[:8]}"
    empleado = _crear_empleado_sql(marcador)
    periodo, evaluacion_id, lote = _crear_evaluacion_con_pago(empleado)
    try:
        r = client.delete(f"/api/v1/rrhh/empleados/{empleado}")
        assert r.status_code == 200, r.text
        assert r.json()["accion"] == "desactivado"
        # El empleado sigue existiendo (borrado lógico).
        assert _scalar(
            "SELECT COUNT(*) FROM empleados WHERE id = :id", {"id": empleado}
        ) == 1
    finally:
        _sql(
            "DELETE FROM pago_x_resultado WHERE id_pago_x_resultado = :id",
            {"id": lote},
        )
        _sql("DELETE FROM evaluaciones WHERE id = :id", {"id": evaluacion_id})
        _sql(
            "DELETE FROM periodo_evaluaciones WHERE id_periodo_evaluacion = :id",
            {"id": periodo},
        )
        _sql("DELETE FROM empleados WHERE id = :id", {"id": empleado})


# ── Tests: patrón transversal ───────────────────────────────────────────────


def test_rutas_rrhh_exigen_token(client):
    # Override explícito del header del autouse para forzar el caso sin token.
    headers = {"Authorization": ""}
    r = client.delete("/api/v1/rrhh/nomina/999999999", headers=headers)
    assert r.status_code == 401, r.text


def test_nomina_inexistente_404(client):
    r = client.delete("/api/v1/rrhh/nomina/999999999")
    assert r.status_code == 404, r.text
