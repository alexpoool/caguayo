"""Tests de la Fase 6 v2 del módulo RRHH — Nómina como lote.

Usan el patrón `client` de conftest.py (TestClient contra la BD real).

La nómina es una cabecera (`pre_nomina` → `nomina`) con detalle por empleado
en `nomina_empleados`. Cada test crea sus propios empleados, marcaciones,
movimientos y tipos, con periodos en 2098 para no colisionar con datos
reales, y limpia todo al final.
"""

import asyncio
import uuid
from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from src.database.connection import DATABASE_URL
from src.domain.rrhh_nomina_calc import (
    SALARIO_PROMEDIO,
    impuesto_sobre_promedio,
    neto_a_cobrar,
    pago_por_horas,
    tarifa_hora,
)

PERIODO_INICIO = "2098-01-01"
PERIODO_FIN = "2098-01-31"
MONEDA_ID = 1


def _sufijo():
    return uuid.uuid4().hex[:8]


# ═══════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════


def _crear_empleado(client, **kwargs):
    payload = {
        "codigo_empleado": f"EMP-{uuid.uuid4().hex[:8]}",
        "nombre": f"Nombre{_sufijo()}",
        "apellido": f"Apellido{_sufijo()}",
        "carnet_identidad": f"CI-{uuid.uuid4().hex[:10]}",
        "correo": f"emp-{uuid.uuid4().hex[:8]}@test.cu",
    }
    payload.update(kwargs)
    response = client.post("/api/v1/rrhh/empleados", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def _crear_nomina(client, **overrides):
    payload = {
        "descripcion": f"Nómina {_sufijo()}",
        "periodo": PERIODO_FIN,
        "inicio_periodo": PERIODO_INICIO,
        "fin_periodo": PERIODO_FIN,
        "moneda_id": MONEDA_ID,
        "tasa": 1,
        "porcentaje_impuesto": 0,
    }
    payload.update(overrides)
    response = client.post("/api/v1/rrhh/nomina", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def _seleccionar(client, nomina_id, empleado_ids):
    return client.put(
        f"/api/v1/rrhh/nomina/{nomina_id}/empleados",
        json={"empleado_ids": empleado_ids},
    )


def _candidato(client, nomina_id, empleado_id):
    filas = client.get(f"/api/v1/rrhh/nomina/{nomina_id}/candidatos")
    assert filas.status_code == 200, filas.text
    for fila in filas.json():
        if fila["empleado_id"] == empleado_id:
            return fila
    raise AssertionError(f"El empleado {empleado_id} no aparece en candidatos")


def _marcar(client, empleado_id, fecha, entrada, salida):
    response = client.post(
        "/api/v1/rrhh/asistencia",
        json={
            "empleado_id": empleado_id,
            "fecha": fecha,
            "hora_entrada": entrada,
            "hora_salida": salida,
            "estado": "presente",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _crear_tipo(client, prefijo, **kwargs):
    rutas = {
        "BON": "tipos-bonificaciones",
        "DED": "tipos-deducciones",
        "PAG": "tipos-pago",
    }
    payload = {"nombre": f"{prefijo}-{_sufijo()}"}
    payload.update(kwargs)
    response = client.post(
        f"/api/v1/rrhh/catalogos/{rutas[prefijo]}", json=payload
    )
    assert response.status_code == 201, response.text
    return response.json()


def _crear_movimiento(client, clase, empleado_id, tipo_id, valor, **kwargs):
    if clase == "bonificacion":
        payload = {
            "empleado_id": empleado_id,
            "tipo_bonificaciones_id": tipo_id,
            "valor": valor,
            "inicio_periodo": PERIODO_INICIO,
            "fin_periodo": PERIODO_FIN,
        }
        url = "/api/v1/rrhh/bonificaciones"
    else:
        payload = {
            "empleado_id": empleado_id,
            "tipo_deducciones_id": tipo_id,
            "valor": valor,
            "inicio_periodo": PERIODO_INICIO,
            "fin_periodo": PERIODO_FIN,
        }
        url = "/api/v1/rrhh/deducciones"
    payload.update(kwargs)
    response = client.post(url, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def _limpiar_asistencias(client, empleado_id):
    response = client.get(
        f"/api/v1/rrhh/asistencia?empleado_id={empleado_id}&limit=1000"
    )
    if response.status_code == 200:
        for fila in response.json():
            client.delete(f"/api/v1/rrhh/asistencia/{fila['id']}")


def _limpiar_movimientos(client, empleado_id):
    for clase, url in (
        ("deducciones", "/api/v1/rrhh/deducciones"),
        ("bonificaciones", "/api/v1/rrhh/bonificaciones"),
    ):
        response = client.get(f"{url}?empleado_id={empleado_id}&limit=1000")
        if response.status_code == 200:
            for fila in response.json():
                pk = (
                    fila.get("id_deducciones")
                    if clase == "deducciones"
                    else fila.get("id_bonificaciones")
                )
                if pk:
                    client.delete(f"{url}/{pk}")


async def _borrar_nomina_db(nomina_id: int) -> None:
    """Borra la nómina directamente (las confirmadas no se pueden por API)."""
    engine = create_async_engine(DATABASE_URL, poolclass=NullPool)
    try:
        async with engine.begin() as conn:
            await conn.execute(
                text("DELETE FROM nomina WHERE id = :id"), {"id": nomina_id}
            )
    finally:
        await engine.dispose()


def _limpiar_nomina(nomina_id):
    asyncio.run(_borrar_nomina_db(nomina_id))


def _limpiar_empleado(client, empleado_id):
    client.delete(f"/api/v1/rrhh/empleados/{empleado_id}")


def _limpiar_tipo(client, prefijo, tipo_id):
    rutas = {
        "BON": "tipos-bonificaciones",
        "DED": "tipos-deducciones",
        "PAG": "tipos-pago",
    }
    client.delete(f"/api/v1/rrhh/catalogos/{rutas[prefijo]}/{tipo_id}")


# ═══════════════════════════════════════════════════════════════════════════
# Módulo de dominio (funciones puras, sin BD)
# ═══════════════════════════════════════════════════════════════════════════


class TestTarifaHora:
    def test_deriva_del_salario_mensual(self):
        # 2400 / (30 días × 8 h) = 10.00
        assert tarifa_hora(Decimal("2400"), 8, 30) == Decimal("10.00")

    def test_sin_salario_es_cero(self):
        assert tarifa_hora(None, 8, 30) == Decimal("0.00")

    def test_sin_horas_pactadas_es_cero(self):
        assert tarifa_hora(Decimal("1000"), None, 30) == Decimal("0.00")

    def test_sin_dias_pactados_es_cero(self):
        assert tarifa_hora(Decimal("1000"), 8, None) == Decimal("0.00")

    def test_salario_cero_es_cero(self):
        assert tarifa_hora(Decimal("0"), 8, 30) == Decimal("0.00")


class TestPagoPorHoras:
    def test_sin_horas(self):
        assert pago_por_horas(0, 0, Decimal("10")) == (
            Decimal("0.00"),
            Decimal("0.00"),
        )

    def test_jornada_ordinaria(self):
        assert pago_por_horas(480, 0, Decimal("10")) == (
            Decimal("80.00"),
            Decimal("0.00"),
        )

    def test_jornada_con_extras(self):
        # 600 min = 10 h, de las cuales 120 min (2 h) son extras.
        base, extras = pago_por_horas(600, 120, Decimal("10"))
        assert base == Decimal("80.00")
        assert extras == Decimal("20.00")
        assert base + extras == Decimal("100.00")

    def test_extras_no_pueden_exceder_lo_trabajado(self):
        base, extras = pago_por_horas(60, 120, Decimal("10"))
        assert base == Decimal("0.00")
        assert extras == Decimal("10.00")

    def test_tarifa_cero(self):
        assert pago_por_horas(480, 0, Decimal("0")) == (
            Decimal("0.00"),
            Decimal("0.00"),
        )


class TestImpuesto:
    def test_salario_promedio_global(self):
        assert SALARIO_PROMEDIO == Decimal("3920.00")

    def test_por_debajo_del_promedio_no_paga(self):
        assert impuesto_sobre_promedio(Decimal("3000"), Decimal("5")) == Decimal(
            "0.00"
        )

    def test_exactamente_el_promedio_no_paga(self):
        assert impuesto_sobre_promedio(
            Decimal("3920"), Decimal("5")
        ) == Decimal("0.00")

    def test_grava_solo_el_exceso(self):
        # (5080 − 3920) × 5 % = 58.00
        assert impuesto_sobre_promedio(Decimal("5080"), Decimal("5")) == Decimal(
            "58.00"
        )

    def test_porcentaje_cero(self):
        assert impuesto_sobre_promedio(Decimal("9000"), Decimal("0")) == Decimal(
            "0.00"
        )


class TestNeto:
    def test_resta_impuesto_y_deducciones(self):
        assert neto_a_cobrar(
            Decimal("5080"), Decimal("58"), Decimal("30")
        ) == Decimal("4992.00")

    def test_nunca_negativo(self):
        assert neto_a_cobrar(
            Decimal("100"), Decimal("50"), Decimal("300")
        ) == Decimal("0.00")


# ═══════════════════════════════════════════════════════════════════════════
# Cabecera del lote
# ═══════════════════════════════════════════════════════════════════════════


def test_crear_nomina_nace_pre_nomina(client):
    nomina = _crear_nomina(client, descripcion="Enero 2098")
    try:
        assert nomina["estado"] == "pre_nomina"
        assert nomina["descripcion"] == "Enero 2098"
        assert nomina["moneda_id"] == MONEDA_ID
        assert nomina["moneda_nombre"]
        assert nomina["cantidad_empleados"] == 0
        assert nomina["empleados"] == []
        assert Decimal(str(nomina["total_neto"])) == Decimal("0.00")
    finally:
        _limpiar_nomina(nomina["id"])


def test_crear_fin_anterior_al_inicio_422(client):
    response = client.post(
        "/api/v1/rrhh/nomina",
        json={
            "descripcion": "Mal rango",
            "periodo": PERIODO_FIN,
            "inicio_periodo": PERIODO_FIN,
            "fin_periodo": PERIODO_INICIO,
            "moneda_id": MONEDA_ID,
            "tasa": 1,
            "porcentaje_impuesto": 5,
        },
    )
    assert response.status_code == 422


def test_crear_moneda_inexistente_404(client):
    response = client.post(
        "/api/v1/rrhh/nomina",
        json={
            "descripcion": "Sin moneda",
            "periodo": PERIODO_FIN,
            "inicio_periodo": PERIODO_INICIO,
            "fin_periodo": PERIODO_FIN,
            "moneda_id": 999999,
            "tasa": 1,
            "porcentaje_impuesto": 5,
        },
    )
    assert response.status_code == 404


def test_crear_porcentaje_fuera_de_rango_422(client):
    response = client.post(
        "/api/v1/rrhh/nomina",
        json={
            "descripcion": "Impuesto inválido",
            "periodo": PERIODO_FIN,
            "inicio_periodo": PERIODO_INICIO,
            "fin_periodo": PERIODO_FIN,
            "moneda_id": MONEDA_ID,
            "tasa": 1,
            "porcentaje_impuesto": 101,
        },
    )
    assert response.status_code == 422


def test_listar_filtra_por_estado_y_busca(client):
    una = _crear_nomina(client, descripcion=f"Buscar-{_sufijo()}")
    otra = _crear_nomina(client, descripcion=f"Otra-{_sufijo()}")
    try:
        response = client.get("/api/v1/rrhh/nomina?estado=pre_nomina&limit=1000")
        assert response.status_code == 200
        ids = {fila["id"] for fila in response.json()}
        assert una["id"] in ids and otra["id"] in ids

        response = client.get(f"/api/v1/rrhh/nomina?buscar={una['descripcion']}")
        assert response.status_code == 200
        filas = response.json()
        assert len(filas) == 1
        assert filas[0]["id"] == una["id"]
    finally:
        _limpiar_nomina(una["id"])
        _limpiar_nomina(otra["id"])


# ═══════════════════════════════════════════════════════════════════════════
# Candidatos y cálculos
# ═══════════════════════════════════════════════════════════════════════════


def test_candidatos_calcula_horas_y_extras(client):
    emp = _crear_empleado(
        client, salario=2400, horas_a_trabajar=8, dias_a_trabajar=30
    )
    nomina = _crear_nomina(client)
    try:
        _marcar(client, emp["id"], "2098-01-05", "08:00:00", "16:00:00")
        _marcar(client, emp["id"], "2098-01-06", "08:00:00", "18:00:00")

        fila = _candidato(client, nomina["id"], emp["id"])
        assert Decimal(str(fila["salario_base"])) == Decimal("160.00")
        assert Decimal(str(fila["horas_extras"])) == Decimal("20.00")
        assert Decimal(str(fila["devengado"])) == Decimal("180.00")
        assert Decimal(str(fila["impuesto"])) == Decimal("0.00")
        assert Decimal(str(fila["neto_a_cobrar"])) == Decimal("180.00")
        assert fila["seleccionado"] is False
    finally:
        _limpiar_nomina(nomina["id"])
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_candidatos_suma_bonificaciones_y_deducciones(client):
    emp = _crear_empleado(
        client, salario=2400, horas_a_trabajar=8, dias_a_trabajar=30
    )
    tipo_bon = _crear_tipo(client, "BON")
    tipo_ded = _crear_tipo(client, "DED")
    nomina = _crear_nomina(client)
    try:
        _marcar(client, emp["id"], "2098-01-05", "08:00:00", "16:00:00")
        _crear_movimiento(client, "bonificacion", emp["id"], tipo_bon["id_tipos_bonificaciones"], 100)
        _crear_movimiento(client, "deduccion", emp["id"], tipo_ded["id_tipos_deducciones"], 30)

        fila = _candidato(client, nomina["id"], emp["id"])
        assert Decimal(str(fila["bonificaciones"])) == Decimal("100.00")
        assert Decimal(str(fila["deducciones"])) == Decimal("30.00")
        assert Decimal(str(fila["devengado"])) == Decimal("180.00")
        assert Decimal(str(fila["neto_a_cobrar"])) == Decimal("150.00")
        assert Decimal(str(fila["salario_neto"])) == Decimal("150.00")
    finally:
        _limpiar_nomina(nomina["id"])
        _limpiar_asistencias(client, emp["id"])
        _limpiar_movimientos(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "BON", tipo_bon["id_tipos_bonificaciones"])
        _limpiar_tipo(client, "DED", tipo_ded["id_tipos_deducciones"])


def test_candidatos_porcentuales_sobre_salario(client):
    emp = _crear_empleado(
        client, salario=2400, horas_a_trabajar=8, dias_a_trabajar=30
    )
    tipo_bon = _crear_tipo(client, "BON", es_porcentaje=True)
    tipo_ded = _crear_tipo(client, "DED", es_porcentaje=True)
    nomina = _crear_nomina(client)
    try:
        _marcar(client, emp["id"], "2098-01-05", "08:00:00", "16:00:00")
        # 10 % de 2400 = 240; 5 % de 2400 = 120.
        _crear_movimiento(client, "bonificacion", emp["id"], tipo_bon["id_tipos_bonificaciones"], 10)
        _crear_movimiento(client, "deduccion", emp["id"], tipo_ded["id_tipos_deducciones"], 5)

        fila = _candidato(client, nomina["id"], emp["id"])
        assert Decimal(str(fila["bonificaciones"])) == Decimal("240.00")
        assert Decimal(str(fila["deducciones"])) == Decimal("120.00")
        assert Decimal(str(fila["neto_a_cobrar"])) == Decimal("200.00")
    finally:
        _limpiar_nomina(nomina["id"])
        _limpiar_asistencias(client, emp["id"])
        _limpiar_movimientos(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "BON", tipo_bon["id_tipos_bonificaciones"])
        _limpiar_tipo(client, "DED", tipo_ded["id_tipos_deducciones"])


def test_candidatos_impuesto_sobre_exceso(client):
    emp = _crear_empleado(
        client, salario=2400, horas_a_trabajar=8, dias_a_trabajar=30
    )
    tipo_bon = _crear_tipo(client, "BON")
    nomina = _crear_nomina(client, porcentaje_impuesto=5)
    try:
        _marcar(client, emp["id"], "2098-01-05", "08:00:00", "16:00:00")
        _crear_movimiento(client, "bonificacion", emp["id"], tipo_bon["id_tipos_bonificaciones"], 5000)

        fila = _candidato(client, nomina["id"], emp["id"])
        # 80 + 5000 = 5080; (5080 − 3920) × 5 % = 58.
        assert Decimal(str(fila["devengado"])) == Decimal("5080.00")
        assert Decimal(str(fila["impuesto"])) == Decimal("58.00")
        assert Decimal(str(fila["neto_a_cobrar"])) == Decimal("5022.00")
    finally:
        _limpiar_nomina(nomina["id"])
        _limpiar_asistencias(client, emp["id"])
        _limpiar_movimientos(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "BON", tipo_bon["id_tipos_bonificaciones"])


def test_candidatos_excluye_inactivos(client):
    emp = _crear_empleado(client, salario=2400, activo=False)
    nomina = _crear_nomina(client)
    try:
        response = client.get(f"/api/v1/rrhh/nomina/{nomina['id']}/candidatos")
        assert response.status_code == 200
        assert all(f["empleado_id"] != emp["id"] for f in response.json())
    finally:
        _limpiar_nomina(nomina["id"])
        _limpiar_empleado(client, emp["id"])


# ═══════════════════════════════════════════════════════════════════════════
# Selección de empleados
# ═══════════════════════════════════════════════════════════════════════════


def test_guardar_seleccion_y_quitar(client):
    emp_a = _crear_empleado(client, salario=2400, horas_a_trabajar=8, dias_a_trabajar=30)
    emp_b = _crear_empleado(client, salario=2400, horas_a_trabajar=8, dias_a_trabajar=30)
    nomina = _crear_nomina(client)
    try:
        _marcar(client, emp_a["id"], "2098-01-05", "08:00:00", "16:00:00")
        _marcar(client, emp_b["id"], "2098-01-05", "08:00:00", "16:00:00")

        response = _seleccionar(client, nomina["id"], [emp_a["id"], emp_b["id"]])
        assert response.status_code == 200, response.text
        detalle = response.json()
        assert len(detalle["empleados"]) == 2
        assert detalle["cantidad_empleados"] == 2
        assert Decimal(str(detalle["total_neto"])) == Decimal("160.00")

        # Quitar uno: el detalle se actualiza, no se duplica.
        response = _seleccionar(client, nomina["id"], [emp_a["id"]])
        assert response.status_code == 200, response.text
        detalle = response.json()
        assert len(detalle["empleados"]) == 1
        assert detalle["empleados"][0]["empleado_id"] == emp_a["id"]

        # Guardar de nuevo el mismo empleado actualiza su fila.
        response = _seleccionar(client, nomina["id"], [emp_a["id"]])
        assert response.status_code == 200, response.text
        assert len(response.json()["empleados"]) == 1

        candidato_b = _candidato(client, nomina["id"], emp_b["id"])
        assert candidato_b["seleccionado"] is False
        assert candidato_b["id_nomina_empleado"] is None
    finally:
        _limpiar_nomina(nomina["id"])
        _limpiar_asistencias(client, emp_a["id"])
        _limpiar_asistencias(client, emp_b["id"])
        _limpiar_empleado(client, emp_a["id"])
        _limpiar_empleado(client, emp_b["id"])


def test_guardar_empleado_inexistente_404(client):
    nomina = _crear_nomina(client)
    try:
        response = _seleccionar(client, nomina["id"], [999999])
        assert response.status_code == 404
    finally:
        _limpiar_nomina(nomina["id"])


def test_seleccionar_en_confirmada_409(client):
    emp = _crear_empleado(client, salario=2400, horas_a_trabajar=8, dias_a_trabajar=30)
    nomina = _crear_nomina(client)
    try:
        _seleccionar(client, nomina["id"], [emp["id"]])
        assert client.post(f"/api/v1/rrhh/nomina/{nomina['id']}/confirmar").status_code == 200
        response = _seleccionar(client, nomina["id"], [])
        assert response.status_code == 409
    finally:
        _limpiar_nomina(nomina["id"])
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


# ═══════════════════════════════════════════════════════════════════════════
# Edición, confirmación y borrado
# ═══════════════════════════════════════════════════════════════════════════


def test_actualizar_cabecera_recalcula_impuesto(client):
    emp = _crear_empleado(client, salario=2400, horas_a_trabajar=8, dias_a_trabajar=30)
    tipo_bon = _crear_tipo(client, "BON")
    nomina = _crear_nomina(client, porcentaje_impuesto=0)
    try:
        _marcar(client, emp["id"], "2098-01-05", "08:00:00", "16:00:00")
        _crear_movimiento(client, "bonificacion", emp["id"], tipo_bon["id_tipos_bonificaciones"], 5000)
        _seleccionar(client, nomina["id"], [emp["id"]])

        response = client.put(
            f"/api/v1/rrhh/nomina/{nomina['id']}",
            json={"porcentaje_impuesto": 5, "descripcion": "Corregida"},
        )
        assert response.status_code == 200, response.text
        detalle = response.json()
        assert detalle["descripcion"] == "Corregida"
        assert Decimal(str(detalle["empleados"][0]["impuesto"])) == Decimal("58.00")
        assert Decimal(str(detalle["empleados"][0]["neto_a_cobrar"])) == Decimal("5022.00")
    finally:
        _limpiar_nomina(nomina["id"])
        _limpiar_asistencias(client, emp["id"])
        _limpiar_movimientos(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "BON", tipo_bon["id_tipos_bonificaciones"])


def test_confirmar_sin_empleados_400(client):
    nomina = _crear_nomina(client)
    try:
        response = client.post(f"/api/v1/rrhh/nomina/{nomina['id']}/confirmar")
        assert response.status_code == 400
    finally:
        _limpiar_nomina(nomina["id"])


def test_confirmar_y_bloquear_edicion(client):
    emp = _crear_empleado(client, salario=2400, horas_a_trabajar=8, dias_a_trabajar=30)
    nomina = _crear_nomina(client)
    try:
        _seleccionar(client, nomina["id"], [emp["id"]])
        response = client.post(f"/api/v1/rrhh/nomina/{nomina['id']}/confirmar")
        assert response.status_code == 200, response.text
        assert response.json()["estado"] == "nomina"

        assert client.put(
            f"/api/v1/rrhh/nomina/{nomina['id']}", json={"descripcion": "Otra"}
        ).status_code == 409
        assert client.delete(f"/api/v1/rrhh/nomina/{nomina['id']}").status_code == 409
        assert client.post(f"/api/v1/rrhh/nomina/{nomina['id']}/confirmar").status_code == 409
    finally:
        _limpiar_nomina(nomina["id"])
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_eliminar_pre_nomina(client):
    nomina = _crear_nomina(client)
    response = client.delete(f"/api/v1/rrhh/nomina/{nomina['id']}")
    assert response.status_code == 200
    assert client.get(f"/api/v1/rrhh/nomina/{nomina['id']}").status_code == 404


def test_nomina_inexistente_404(client):
    assert client.get("/api/v1/rrhh/nomina/999999").status_code == 404
    assert client.post("/api/v1/rrhh/nomina/999999/confirmar").status_code == 404
    assert client.delete("/api/v1/rrhh/nomina/999999").status_code == 404


# ═══════════════════════════════════════════════════════════════════════════
# Pagos por empleado
# ═══════════════════════════════════════════════════════════════════════════


def _payload_pago(empleado_id, **kwargs):
    payload = {"empleado_id": empleado_id}
    payload.update(kwargs)
    return payload


def test_guardar_pagos_por_empleado(client):
    emp_a = _crear_empleado(
        client, salario=2400, horas_a_trabajar=8, dias_a_trabajar=30
    )
    emp_b = _crear_empleado(
        client, salario=2400, horas_a_trabajar=8, dias_a_trabajar=30
    )
    tipo_pago = _crear_tipo(client, "PAG")
    nomina = _crear_nomina(client)
    try:
        _marcar(client, emp_a["id"], "2098-01-05", "08:00:00", "16:00:00")
        _marcar(client, emp_b["id"], "2098-01-05", "08:00:00", "16:00:00")
        _seleccionar(client, nomina["id"], [emp_a["id"], emp_b["id"]])

        # En pre-nómina todavía no se puede pagar.
        response = client.put(
            f"/api/v1/rrhh/nomina/{nomina['id']}/pagos",
            json={
                "pagos": [
                    _payload_pago(
                        emp_a["id"],
                        metodo_id=tipo_pago["id_tipo_pago"],
                        monto=80,
                    )
                ]
            },
        )
        assert response.status_code == 409

        client.post(f"/api/v1/rrhh/nomina/{nomina['id']}/confirmar")

        # Pago libre: el monto no tiene que coincidir con el neto.
        response = client.put(
            f"/api/v1/rrhh/nomina/{nomina['id']}/pagos",
            json={
                "pagos": [
                    _payload_pago(
                        emp_a["id"],
                        fecha_pago="2098-01-31",
                        monto=80,
                        metodo_id=tipo_pago["id_tipo_pago"],
                        referencia="REF-1",
                    ),
                    _payload_pago(
                        emp_b["id"],
                        monto=40,
                        metodo_id=tipo_pago["id_tipo_pago"],
                    ),
                ]
            },
        )
        assert response.status_code == 200, response.text
        detalle = response.json()
        assert Decimal(str(detalle["total_pagado"])) == Decimal("120.00")
        assert detalle["cantidad_pagos"] == 2

        por_empleado = {f["empleado_id"]: f for f in detalle["empleados"]}
        pago_a = por_empleado[emp_a["id"]]
        assert pago_a["fecha_pago"] == "2098-01-31"
        assert Decimal(str(pago_a["monto"])) == Decimal("80.00")
        assert pago_a["metodo_nombre"] == tipo_pago["nombre"]
        assert pago_a["referencia"] == "REF-1"
        # Sin fecha explícita se usa la fecha del día.
        assert por_empleado[emp_b["id"]]["fecha_pago"] is not None

        # El listado global ahora es por empleado.
        listado = client.get(
            f"/api/v1/rrhh/nomina/pagos?nomina_id={nomina['id']}"
        )
        assert listado.status_code == 200
        filas = listado.json()
        assert len(filas) == 2
        assert {f["empleado_id"] for f in filas} == {emp_a["id"], emp_b["id"]}
        assert all(f["nomina_descripcion"] == nomina["descripcion"] for f in filas)
        assert all(f["empleado_nombre"] for f in filas)

        # El recibo incluye la tabla de pagos por empleado.
        recibo = client.get(f"/api/v1/rrhh/nomina/{nomina['id']}/recibo")
        assert recibo.status_code == 200
        assert recibo.content.startswith(b"%PDF")

        # Se puede corregir y también quitar un pago.
        response = client.put(
            f"/api/v1/rrhh/nomina/{nomina['id']}/pagos",
            json={
                "pagos": [
                    _payload_pago(
                        emp_a["id"],
                        fecha_pago="2098-02-01",
                        monto=70,
                        metodo_id=tipo_pago["id_tipo_pago"],
                        referencia="REF-2",
                    ),
                    _payload_pago(emp_b["id"]),
                ]
            },
        )
        assert response.status_code == 200, response.text
        detalle = response.json()
        assert Decimal(str(detalle["total_pagado"])) == Decimal("70.00")
        assert detalle["cantidad_pagos"] == 1
        por_empleado = {f["empleado_id"]: f for f in detalle["empleados"]}
        assert Decimal(str(por_empleado[emp_a["id"]]["monto"])) == Decimal("70.00")
        assert por_empleado[emp_a["id"]]["referencia"] == "REF-2"
        assert por_empleado[emp_b["id"]]["fecha_pago"] is None
        assert por_empleado[emp_b["id"]]["monto"] is None
        assert por_empleado[emp_b["id"]]["metodo_id"] is None

        # Quitar el último pago deja el lote sin pagos.
        response = client.put(
            f"/api/v1/rrhh/nomina/{nomina['id']}/pagos",
            json={"pagos": [_payload_pago(emp_a["id"])]},
        )
        assert response.status_code == 200, response.text
        detalle = response.json()
        assert Decimal(str(detalle["total_pagado"])) == Decimal("0.00")
        assert detalle["cantidad_pagos"] == 0
    finally:
        _limpiar_nomina(nomina["id"])
        _limpiar_asistencias(client, emp_a["id"])
        _limpiar_asistencias(client, emp_b["id"])
        _limpiar_empleado(client, emp_a["id"])
        _limpiar_empleado(client, emp_b["id"])
        _limpiar_tipo(client, "PAG", tipo_pago["id_tipo_pago"])


def test_guardar_pagos_validaciones(client):
    emp = _crear_empleado(
        client, salario=2400, horas_a_trabajar=8, dias_a_trabajar=30
    )
    ajeno = _crear_empleado(client)
    tipo_pago = _crear_tipo(client, "PAG")
    nomina = _crear_nomina(client)
    try:
        _seleccionar(client, nomina["id"], [emp["id"]])
        client.post(f"/api/v1/rrhh/nomina/{nomina['id']}/confirmar")
        url = f"/api/v1/rrhh/nomina/{nomina['id']}/pagos"

        # Monto cero lo rechaza el contrato.
        assert (
            client.put(
                url,
                json={
                    "pagos": [
                        _payload_pago(
                            emp["id"],
                            monto=0,
                            metodo_id=tipo_pago["id_tipo_pago"],
                        )
                    ]
                },
            ).status_code
            == 422
        )
        # Método inexistente.
        assert (
            client.put(
                url,
                json={
                    "pagos": [
                        _payload_pago(
                            emp["id"], monto=80, metodo_id=999999
                        )
                    ]
                },
            ).status_code
            == 404
        )
        # Empleado que no pertenece al lote.
        assert (
            client.put(
                url,
                json={
                    "pagos": [
                        _payload_pago(
                            ajeno["id"],
                            monto=80,
                            metodo_id=tipo_pago["id_tipo_pago"],
                        )
                    ]
                },
            ).status_code
            == 422
        )
        # Empleado repetido.
        payload = _payload_pago(
            emp["id"], monto=80, metodo_id=tipo_pago["id_tipo_pago"]
        )
        assert (
            client.put(url, json={"pagos": [payload, payload]}).status_code
            == 422
        )
        # Falta el método.
        assert (
            client.put(
                url,
                json={
                    "pagos": [
                        _payload_pago(
                            emp["id"], fecha_pago="2098-01-31", monto=80
                        )
                    ]
                },
            ).status_code
            == 422
        )
        # Nómina inexistente.
        assert (
            client.put(
                "/api/v1/rrhh/nomina/999999/pagos",
                json={
                    "pagos": [
                        _payload_pago(
                            emp["id"],
                            monto=80,
                            metodo_id=tipo_pago["id_tipo_pago"],
                        )
                    ]
                },
            ).status_code
            == 404
        )
    finally:
        _limpiar_nomina(nomina["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_empleado(client, ajeno["id"])
        _limpiar_tipo(client, "PAG", tipo_pago["id_tipo_pago"])


def test_listar_pagos_por_empleado_filtra_y_ordena(client):
    emp_a = _crear_empleado(client)
    emp_b = _crear_empleado(client)
    tipo_pago = _crear_tipo(client, "PAG")
    nomina = _crear_nomina(client)
    try:
        _seleccionar(client, nomina["id"], [emp_a["id"], emp_b["id"]])
        client.post(f"/api/v1/rrhh/nomina/{nomina['id']}/confirmar")
        client.put(
            f"/api/v1/rrhh/nomina/{nomina['id']}/pagos",
            json={
                "pagos": [
                    _payload_pago(
                        emp_a["id"],
                        fecha_pago="2098-01-10",
                        monto=10,
                        metodo_id=tipo_pago["id_tipo_pago"],
                    ),
                    _payload_pago(
                        emp_b["id"],
                        fecha_pago="2098-01-20",
                        monto=20,
                        metodo_id=tipo_pago["id_tipo_pago"],
                    ),
                ]
            },
        )

        response = client.get(
            "/api/v1/rrhh/nomina/pagos"
            "?desde=2098-01-01&hasta=2098-01-31"
        )
        assert response.status_code == 200
        filas = response.json()
        assert [f["empleado_id"] for f in filas] == [emp_b["id"], emp_a["id"]]

        filtrado = client.get(
            f"/api/v1/rrhh/nomina/pagos?metodo_id={tipo_pago['id_tipo_pago']}"
        )
        assert filtrado.status_code == 200
        assert {f["empleado_id"] for f in filtrado.json()} == {
            emp_a["id"],
            emp_b["id"],
        }
    finally:
        _limpiar_nomina(nomina["id"])
        _limpiar_empleado(client, emp_a["id"])
        _limpiar_empleado(client, emp_b["id"])
        _limpiar_tipo(client, "PAG", tipo_pago["id_tipo_pago"])


# ═══════════════════════════════════════════════════════════════════════════
# Reporte de costo y recibo
# ═══════════════════════════════════════════════════════════════════════════


def test_reporte_costo_solo_confirmadas(client):
    emp = _crear_empleado(client, salario=2400, horas_a_trabajar=8, dias_a_trabajar=30)
    nomina = _crear_nomina(client)
    try:
        _marcar(client, emp["id"], "2098-01-05", "08:00:00", "16:00:00")
        _seleccionar(client, nomina["id"], [emp["id"]])

        # En pre_nómina no cuenta.
        response = client.get(
            "/api/v1/rrhh/nomina/costo?desde=2098-01-01&hasta=2098-01-31"
        )
        assert response.status_code == 200
        assert Decimal(str(response.json()["total_neto"])) == Decimal("0.00")

        client.post(f"/api/v1/rrhh/nomina/{nomina['id']}/confirmar")
        response = client.get(
            "/api/v1/rrhh/nomina/costo?desde=2098-01-01&hasta=2098-01-31"
        )
        reporte = response.json()
        assert reporte["cantidad_nominas"] == 1
        assert Decimal(str(reporte["total_salario_base"])) == Decimal("80.00")
        assert Decimal(str(reporte["total_neto"])) == Decimal("80.00")
    finally:
        _limpiar_nomina(nomina["id"])
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_recibo_pdf(client):
    emp = _crear_empleado(client, salario=2400, horas_a_trabajar=8, dias_a_trabajar=30)
    nomina = _crear_nomina(client)
    try:
        _seleccionar(client, nomina["id"], [emp["id"]])
        response = client.get(f"/api/v1/rrhh/nomina/{nomina['id']}/recibo")
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("application/pdf")
        assert response.content.startswith(b"%PDF")
    finally:
        _limpiar_nomina(nomina["id"])
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
