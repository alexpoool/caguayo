"""Tests de la Fase 6 del módulo RRHH — Nómina y pagos.

Usan el patrón `client` de conftest.py (TestClient contra la BD real).

Cada test crea su propio empleado, sus tipos y sus movimientos, y usa
periodos en 2098 para no colisionar con datos reales. Al final limpia todo.
"""

import uuid
from decimal import Decimal

from src.domain.rrhh_nomina_calc import (
    cota_deducciones,
    monto_horas_extras,
    neto,
    tarifa_hora,
)

PERIODO_INICIO = "2098-01-01"
PERIODO_FIN = "2098-01-31"


def _sufijo():
    return uuid.uuid4().hex[:8]


def _crear_empleado(client, **kwargs):
    payload = {
        "nombre": f"Nombre{_sufijo()}",
        "apellido": f"Apellido{_sufijo()}",
        "carnet_identidad": f"CI-{uuid.uuid4().hex[:10]}",
        "correo": f"emp-{uuid.uuid4().hex[:8]}@test.cu",
    }
    payload.update(kwargs)
    response = client.post("/api/v1/rrhh/empleados", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def _limpiar_empleado(client, empleado_id):
    client.delete(f"/api/v1/rrhh/empleados/{empleado_id}")


def _crear_tipo_pago(client):
    payload = {"nombre": f"Transferencia-{_sufijo()}"}
    response = client.post("/api/v1/rrhh/catalogos/tipos-pago", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def _limpiar_tipo_pago(client, id_tipo):
    client.delete(f"/api/v1/rrhh/catalogos/tipos-pago/{id_tipo}")


def _crear_tipo_bonificacion(client, **kwargs):
    payload = {"nombre": f"Bonificacion-{_sufijo()}"}
    payload.update(kwargs)
    response = client.post(
        "/api/v1/rrhh/catalogos/tipos-bonificaciones", json=payload
    )
    assert response.status_code == 201, response.text
    return response.json()


def _limpiar_tipo_bonificacion(client, id_tipo):
    client.delete(f"/api/v1/rrhh/catalogos/tipos-bonificaciones/{id_tipo}")


def _crear_tipo_deduccion(client, **kwargs):
    payload = {"nombre": f"Deduccion-{_sufijo()}"}
    payload.update(kwargs)
    response = client.post(
        "/api/v1/rrhh/catalogos/tipos-deducciones", json=payload
    )
    assert response.status_code == 201, response.text
    return response.json()


def _limpiar_tipo_deduccion(client, id_tipo):
    client.delete(f"/api/v1/rrhh/catalogos/tipos-deducciones/{id_tipo}")


def _crear_deduccion(client, empleado_id, tipo_id, valor, inicio=PERIODO_INICIO, fin=PERIODO_FIN):
    response = client.post(
        "/api/v1/rrhh/deducciones",
        json={
            "empleado_id": empleado_id,
            "tipo_deducciones_id": tipo_id,
            "valor": valor,
            "inicio_periodo": inicio,
            "fin_periodo": fin,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _marcar_asistencia(client, empleado_id, fecha, entrada, salida):
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


def _generar(client, inicio=PERIODO_INICIO, fin=PERIODO_FIN, **extra):
    payload = {"inicio_periodo": inicio, "fin_periodo": fin}
    payload.update(extra)
    return client.post("/api/v1/rrhh/nomina/generar", json=payload)


def _limpiar_nominas_de(client, empleado_id):
    """Anula las nóminas del empleado para poder reutilizar el periodo."""
    response = client.get(f"/api/v1/rrhh/nomina?empleado_id={empleado_id}")
    for fila in response.json():
        client.post(f"/api/v1/rrhh/nomina/{fila['id']}/anular")


def _nomina_de(client, empleado_id):
    """Devuelve la primera nómina del empleado (su fila del listado)."""
    filas = client.get(f"/api/v1/rrhh/nomina?empleado_id={empleado_id}").json()
    assert filas, f"El empleado {empleado_id} no tiene nómina"
    return filas[0]


# ═══════════════════════════════════════════════════════════════════════════
# Módulo de dominio (funciones puras, sin BD)
# ═══════════════════════════════════════════════════════════════════════════


class TestTarifaHora:
    def test_deriva_del_salario_mensual(self):
        # 1000 / (30 días × 8 h) = 4.166... → 4.17
        assert tarifa_hora(Decimal("1000"), 8, 30) == Decimal("4.17")

    def test_sin_salario_es_cero(self):
        assert tarifa_hora(None, 8, 30) == Decimal("0.00")

    def test_sin_horas_pactadas_es_cero(self):
        assert tarifa_hora(Decimal("1000"), None, 30) == Decimal("0.00")

    def test_sin_dias_pactados_es_cero(self):
        assert tarifa_hora(Decimal("1000"), 8, None) == Decimal("0.00")

    def test_salario_cero_es_cero(self):
        assert tarifa_hora(Decimal("0"), 8, 30) == Decimal("0.00")


class TestMontoHorasExtras:
    def test_una_hora_a_la_tarifa(self):
        assert monto_horas_extras(60, Decimal("4.17")) == Decimal("4.17")

    def test_media_hora(self):
        # 30 min a 4.17 → 2.085 → 2.09
        assert monto_horas_extras(30, Decimal("4.17")) == Decimal("2.09")

    def test_minutos_negativos_son_cero(self):
        assert monto_horas_extras(-30, Decimal("4.17")) == Decimal("0.00")

    def test_tarifa_cero_es_cero(self):
        assert monto_horas_extras(120, Decimal("0.00")) == Decimal("0.00")

    def test_cero_minutos_es_cero(self):
        assert monto_horas_extras(0, Decimal("4.17")) == Decimal("0.00")


class TestCotaDeducciones:
    def test_sin_exceso_no_modifica(self):
        assert cota_deducciones([Decimal("100"), Decimal("200")], Decimal("1000")) == [
            Decimal("100.00"),
            Decimal("200.00"),
        ]

    def test_exceso_prorratea_y_cuadra_con_el_bruto(self):
        resultado = cota_deducciones(
            [Decimal("800"), Decimal("400")], Decimal("1000")
        )
        assert sum(resultado) == Decimal("1000.00")
        # Cada deducción se reduce proporcionalmente (2/3 y 1/3 del bruto).
        assert resultado[0] == Decimal("666.67")
        assert resultado[1] == Decimal("333.33")

    def test_lista_vacia(self):
        assert cota_deducciones([], Decimal("1000")) == []

    def test_total_cero(self):
        assert cota_deducciones([Decimal("0")], Decimal("1000")) == [Decimal("0.00")]


class TestNeto:
    def test_resta_normal(self):
        assert neto(Decimal("1000"), Decimal("300")) == Decimal("700.00")

    def test_nunca_negativo(self):
        assert neto(Decimal("100"), Decimal("300")) == Decimal("0.00")

    def test_exactamente_cero(self):
        assert neto(Decimal("300"), Decimal("300")) == Decimal("0.00")


# ═══════════════════════════════════════════════════════════════════════════
# Generación
# ═══════════════════════════════════════════════════════════════════════════


def test_generar_nomina_individual_ok(client):
    emp = _crear_empleado(client, salario=1000)
    try:
        response = _generar(client, empleado_id=emp["id"])
        assert response.status_code == 201, response.text
        data = response.json()
        assert data["creadas"] == 1
        # Sin deducciones ni extras: el neto es el salario base.
        listado = client.get(f"/api/v1/rrhh/nomina?empleado_id={emp['id']}").json()[0]
        assert Decimal(listado["salario_base"]) == Decimal("1000.00")
        assert Decimal(listado["salario_neto"]) == Decimal("1000.00")
        assert listado["estado"] == "pendiente"
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_generar_nomina_empleado_sin_salario(client):
    emp = _crear_empleado(client)
    try:
        response = _generar(client, empleado_id=emp["id"])
        assert response.status_code == 201
        listado = client.get(f"/api/v1/rrhh/nomina?empleado_id={emp['id']}").json()[0]
        assert Decimal(listado["salario_base"]) == Decimal("0.00")
        assert Decimal(listado["salario_neto"]) == Decimal("0.00")
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_generar_duplicada_se_omite(client):
    emp = _crear_empleado(client, salario=1000)
    try:
        primera = _generar(client, empleado_id=emp["id"])
        assert primera.json()["creadas"] == 1
        segunda = _generar(client, empleado_id=emp["id"])
        assert segunda.json()["creadas"] == 0
        assert segunda.json()["omitidas"] == 1
        # Solo hay una nómina para ese periodo.
        filas = client.get(f"/api/v1/rrhh/nomina?empleado_id={emp['id']}").json()
        assert len(filas) == 1
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_generar_masiva(client):
    emp_a = _crear_empleado(client, salario=1000)
    emp_b = _crear_empleado(client, salario=2000)
    try:
        response = _generar(client)
        assert response.status_code == 201
        data = response.json()
        assert data["creadas"] >= 2
        # A cada uno le corresponde su propio salario.
        nomina_a = client.get(f"/api/v1/rrhh/nomina?empleado_id={emp_a['id']}").json()[0]
        nomina_b = client.get(f"/api/v1/rrhh/nomina?empleado_id={emp_b['id']}").json()[0]
        assert Decimal(nomina_a["salario_neto"]) == Decimal("1000.00")
        assert Decimal(nomina_b["salario_neto"]) == Decimal("2000.00")
    finally:
        _limpiar_nominas_de(client, emp_a["id"])
        _limpiar_nominas_de(client, emp_b["id"])
        _limpiar_empleado(client, emp_a["id"])
        _limpiar_empleado(client, emp_b["id"])


def test_generar_paga_horas_extras(client):
    emp = _crear_empleado(client, salario=2400, horas_a_trabajar=8, dias_a_trabajar=30)
    try:
        # Tarifa: 2400 / 240 = 10.00 la hora. Jornada de 10 h con 8 pactadas
        # → 2 h extras = 20.00.
        _marcar_asistencia(client, emp["id"], "2098-01-10", "08:00", "18:00")
        _generar(client, empleado_id=emp["id"])
        nomina = _nomina_de(client, emp["id"])
        assert Decimal(nomina["horas_extras"]) == Decimal("20.00")
        assert Decimal(nomina["salario_neto"]) == Decimal("2420.00")
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_empleado_libre_sin_extras(client):
    emp = _crear_empleado(
        client, salario=2400, horas_a_trabajar=8, dias_a_trabajar=30, tipo_asistencia="LIBRE"
    )
    try:
        _marcar_asistencia(client, emp["id"], "2098-01-10", "08:00", "10:00")
        _generar(client, empleado_id=emp["id"])
        nomina = client.get(f"/api/v1/rrhh/nomina?empleado_id={emp['id']}").json()[0]
        assert Decimal(nomina["horas_extras"]) == Decimal("0.00")
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_generar_congela_deducciones(client):
    emp = _crear_empleado(client, salario=1000)
    tipo = _crear_tipo_deduccion(client)
    try:
        _crear_deduccion(client, emp["id"], tipo["id_tipos_deducciones"], 200)
        _generar(client, empleado_id=emp["id"])
        detalle = client.get(f"/api/v1/rrhh/nomina?empleado_id={emp['id']}").json()[0]
        assert Decimal(detalle["deducciones"]) == Decimal("200.00")
        assert Decimal(detalle["salario_neto"]) == Decimal("800.00")
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo_deduccion(client, tipo["id_tipos_deducciones"])


def test_deducciones_no_pueden_dejar_neto_negativo(client):
    """Un préstamo mayor que el salario se cotan al bruto: neto nunca baja de 0."""
    emp = _crear_empleado(client, salario=1000)
    tipo = _crear_tipo_deduccion(client)
    try:
        _crear_deduccion(client, emp["id"], tipo["id_tipos_deducciones"], 1500)
        response = _generar(client, empleado_id=emp["id"])
        assert response.status_code == 201
        detalle = client.get(
            f"/api/v1/rrhh/nomina/{_nomina_de(client, emp['id'])['id']}"
        ).json()
        assert Decimal(detalle["deducciones"]) == Decimal("1000.00")
        assert Decimal(detalle["salario_neto"]) == Decimal("0.00")
        # El detalle congelado coincide con el total (consistencia).
        assert sum(
            Decimal(d["monto_aplicado"]) for d in detalle["deducciones_aplicadas"]
        ) == Decimal("1000.00")
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo_deduccion(client, tipo["id_tipos_deducciones"])


def test_generar_congela_deducciones_porcentuales(client):
    emp = _crear_empleado(client, salario=1000)
    tipo = _crear_tipo_deduccion(client, es_porcentaje=True)
    try:
        _crear_deduccion(client, emp["id"], tipo["id_tipos_deducciones"], 10)
        _generar(client, empleado_id=emp["id"])
        detalle = client.get(f"/api/v1/rrhh/nomina?empleado_id={emp['id']}").json()[0]
        # 10 % de 1000 = 100, congelado aunque cambie el salario luego.
        assert Decimal(detalle["deducciones"]) == Decimal("100.00")
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo_deduccion(client, tipo["id_tipos_deducciones"])


def test_generar_sin_empleados(client):
    response = _generar(
        client, empleado_id=999999
    )
    assert response.status_code == 201
    assert response.json()["creadas"] == 0


# ═══════════════════════════════════════════════════════════════════════════
# Listado y detalle
# ═══════════════════════════════════════════════════════════════════════════


def test_listar_nominas_ok(client):
    response = client.get("/api/v1/rrhh/nomina")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_listado_resuelve_empleado(client):
    emp = _crear_empleado(client, salario=1000)
    try:
        _generar(client, empleado_id=emp["id"])
        fila = client.get(f"/api/v1/rrhh/nomina?empleado_id={emp['id']}").json()[0]
        assert fila["empleado_codigo"] == emp["codigo_empleado"]
        assert fila["empleado_nombre"] is not None
        assert fila["total_pagado"] == "0.00"
        assert fila["cantidad_pagos"] == 0
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_filtro_por_estado(client):
    emp = _crear_empleado(client, salario=1000)
    tipo_pago = _crear_tipo_pago(client)
    try:
        _generar(client, empleado_id=emp["id"])
        nomina = client.get(f"/api/v1/rrhh/nomina?empleado_id={emp['id']}").json()[0]
        # Pendientes sí.
        pendientes = client.get(
            f"/api/v1/rrhh/nomina?empleado_id={emp['id']}&estado=pendiente"
        ).json()
        assert any(n["id"] == nomina["id"] for n in pendientes)
        # Pagadas no, todavía.
        pagadas = client.get(
            f"/api/v1/rrhh/nomina?empleado_id={emp['id']}&estado=pagada"
        ).json()
        assert not any(n["id"] == nomina["id"] for n in pagadas)
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo_pago(client, tipo_pago["id_tipo_pago"])


def test_detalle_incluye_movimientos_congelados(client):
    emp = _crear_empleado(client, salario=1000)
    tipo = _crear_tipo_deduccion(client)
    try:
        _crear_deduccion(client, emp["id"], tipo["id_tipos_deducciones"], 200)
        _generar(client, empleado_id=emp["id"])
        detalle = client.get(
            f"/api/v1/rrhh/nomina/{_nomina_de(client, emp['id'])['id']}"
        ).json()
        assert len(detalle["deducciones_aplicadas"]) == 1
        assert Decimal(detalle["deducciones_aplicadas"][0]["monto_aplicado"]) == Decimal("200.00")
        assert detalle["deducciones_aplicadas"][0]["tipo_nombre"] == tipo["nombre"]
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo_deduccion(client, tipo["id_tipos_deducciones"])


def test_detalle_no_encontrado_404(client):
    assert client.get("/api/v1/rrhh/nomina/999999").status_code == 404


# ═══════════════════════════════════════════════════════════════════════════
# Pagos
# ═══════════════════════════════════════════════════════════════════════════


def test_pagar_nomina_ok(client):
    emp = _crear_empleado(client, salario=1000)
    tipo_pago = _crear_tipo_pago(client)
    try:
        _generar(client, empleado_id=emp["id"])
        nomina = client.get(f"/api/v1/rrhh/nomina?empleado_id={emp['id']}").json()[0]
        response = client.post(
            f"/api/v1/rrhh/nomina/{nomina['id']}/pagar",
            json={
                "metodo_id": tipo_pago["id_tipo_pago"],
                "monto": nomina["salario_neto"],
                "fecha_pago": "2098-02-01",
                "referencia": "REF-001",
            },
        )
        assert response.status_code == 200, response.text
        detalle = response.json()
        assert detalle["estado"] == "pagada"
        assert len(detalle["pagos"]) == 1
        assert detalle["pagos"][0]["metodo_nombre"] == tipo_pago["nombre"]
        assert detalle["total_pagado"] == "1000.00"
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo_pago(client, tipo_pago["id_tipo_pago"])


def test_pagar_monto_incorrecto_400(client):
    emp = _crear_empleado(client, salario=1000)
    tipo_pago = _crear_tipo_pago(client)
    try:
        _generar(client, empleado_id=emp["id"])
        nomina = client.get(f"/api/v1/rrhh/nomina?empleado_id={emp['id']}").json()[0]
        response = client.post(
            f"/api/v1/rrhh/nomina/{nomina['id']}/pagar",
            json={"metodo_id": tipo_pago["id_tipo_pago"], "monto": 500},
        )
        assert response.status_code == 400
        assert "neto" in response.json()["detail"]
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo_pago(client, tipo_pago["id_tipo_pago"])


def test_pagar_dos_veces_409(client):
    emp = _crear_empleado(client, salario=1000)
    tipo_pago = _crear_tipo_pago(client)
    try:
        _generar(client, empleado_id=emp["id"])
        nomina = client.get(f"/api/v1/rrhh/nomina?empleado_id={emp['id']}").json()[0]
        payload = {"metodo_id": tipo_pago["id_tipo_pago"], "monto": nomina["salario_neto"]}
        assert client.post(f"/api/v1/rrhh/nomina/{nomina['id']}/pagar", json=payload).status_code == 200
        segunda = client.post(f"/api/v1/rrhh/nomina/{nomina['id']}/pagar", json=payload)
        assert segunda.status_code == 409
        assert "ya está pagada" in segunda.json()["detail"]
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo_pago(client, tipo_pago["id_tipo_pago"])


def test_pagar_metodo_inexistente_404(client):
    emp = _crear_empleado(client, salario=1000)
    try:
        _generar(client, empleado_id=emp["id"])
        nomina = client.get(f"/api/v1/rrhh/nomina?empleado_id={emp['id']}").json()[0]
        response = client.post(
            f"/api/v1/rrhh/nomina/{nomina['id']}/pagar",
            json={"metodo_id": 999999, "monto": nomina["salario_neto"]},
        )
        assert response.status_code == 404
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_pagar_nomina_inexistente_404(client):
    response = client.post(
        "/api/v1/rrhh/nomina/999999/pagar",
        json={"metodo_id": 1, "monto": 100},
    )
    assert response.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════
# Anulación
# ═══════════════════════════════════════════════════════════════════════════


def test_anular_nomina_pendiente(client):
    emp = _crear_empleado(client, salario=1000)
    try:
        _generar(client, empleado_id=emp["id"])
        nomina = client.get(f"/api/v1/rrhh/nomina?empleado_id={emp['id']}").json()[0]
        response = client.post(f"/api/v1/rrhh/nomina/{nomina['id']}/anular")
        assert response.status_code == 200, response.text
        assert response.json()["era_pagada"] is False
        assert (
            client.get(f"/api/v1/rrhh/nomina/{nomina['id']}").json()["estado"] == "anulada"
        )
    finally:
        _limpiar_empleado(client, emp["id"])


def test_anular_nomina_pagada(client):
    emp = _crear_empleado(client, salario=1000)
    tipo_pago = _crear_tipo_pago(client)
    try:
        _generar(client, empleado_id=emp["id"])
        nomina = client.get(f"/api/v1/rrhh/nomina?empleado_id={emp['id']}").json()[0]
        client.post(
            f"/api/v1/rrhh/nomina/{nomina['id']}/pagar",
            json={"metodo_id": tipo_pago["id_tipo_pago"], "monto": nomina["salario_neto"]},
        )
        response = client.post(f"/api/v1/rrhh/nomina/{nomina['id']}/anular")
        assert response.status_code == 200
        data = response.json()
        assert data["era_pagada"] is True
        assert data["motivo"] is not None
        assert (
            client.get(f"/api/v1/rrhh/nomina/{nomina['id']}").json()["estado"] == "anulada"
        )
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo_pago(client, tipo_pago["id_tipo_pago"])


def test_anular_dos_veces_409(client):
    emp = _crear_empleado(client, salario=1000)
    try:
        _generar(client, empleado_id=emp["id"])
        nomina = client.get(f"/api/v1/rrhh/nomina?empleado_id={emp['id']}").json()[0]
        assert client.post(f"/api/v1/rrhh/nomina/{nomina['id']}/anular").status_code == 200
        segunda = client.post(f"/api/v1/rrhh/nomina/{nomina['id']}/anular")
        assert segunda.status_code == 409
        assert "ya está anulada" in segunda.json()["detail"]
    finally:
        _limpiar_empleado(client, emp["id"])


def test_anular_nomina_inexistente_404(client):
    assert client.post("/api/v1/rrhh/nomina/999999/anular").status_code == 404


def test_no_pagar_nomina_anulada(client):
    emp = _crear_empleado(client, salario=1000)
    tipo_pago = _crear_tipo_pago(client)
    try:
        _generar(client, empleado_id=emp["id"])
        nomina = client.get(f"/api/v1/rrhh/nomina?empleado_id={emp['id']}").json()[0]
        client.post(f"/api/v1/rrhh/nomina/{nomina['id']}/anular")
        response = client.post(
            f"/api/v1/rrhh/nomina/{nomina['id']}/pagar",
            json={"metodo_id": tipo_pago["id_tipo_pago"], "monto": nomina["salario_neto"]},
        )
        assert response.status_code == 409
        assert "anulada" in response.json()["detail"]
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo_pago(client, tipo_pago["id_tipo_pago"])


# ═══════════════════════════════════════════════════════════════════════════
# Recibo PDF
# ═══════════════════════════════════════════════════════════════════════════


def test_recibo_pdf_ok(client):
    emp = _crear_empleado(client, salario=1000)
    try:
        _generar(client, empleado_id=emp["id"])
        nomina = client.get(f"/api/v1/rrhh/nomina?empleado_id={emp['id']}").json()[0]
        response = client.get(f"/api/v1/rrhh/nomina/{nomina['id']}/recibo")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert response.content[:4] == b"%PDF"
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_recibo_pdf_inexistente_404(client):
    assert client.get("/api/v1/rrhh/nomina/999999/recibo").status_code == 404


# ═══════════════════════════════════════════════════════════════════════════
# Reporte de costo
# ═══════════════════════════════════════════════════════════════════════════


def test_reporte_costo_ok(client):
    emp = _crear_empleado(client, salario=1000)
    try:
        _generar(client, empleado_id=emp["id"])
        response = client.get(
            "/api/v1/rrhh/nomina/costo?desde=2098-01-01&hasta=2098-01-31"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["cantidad_nominas"] >= 1
        assert Decimal(data["total_salario_base"]) >= Decimal("1000.00")
        assert Decimal(data["total_neto"]) >= Decimal("1000.00")
        assert isinstance(data["departamentos"], list)
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_reporte_costo_excluye_anuladas(client):
    """Tras anular, la nómina deja de contar en el costo del periodo."""
    emp = _crear_empleado(client, salario=1000)
    try:
        _generar(client, empleado_id=emp["id"])
        antes = client.get(
            "/api/v1/rrhh/nomina/costo?desde=2098-01-01&hasta=2098-01-31"
        ).json()
        nomina = _nomina_de(client, emp["id"])
        client.post(f"/api/v1/rrhh/nomina/{nomina['id']}/anular")
        despues = client.get(
            "/api/v1/rrhh/nomina/costo?desde=2098-01-01&hasta=2098-01-31"
        ).json()
        # El costo baja exactamente el neto de la nómina anulada (1000.00),
        # lo que demuestra que las anuladas quedan fuera del reporte.
        assert (
            Decimal(antes["total_neto"]) - Decimal(despues["total_neto"])
            == Decimal("1000.00")
        )
        assert antes["cantidad_nominas"] - despues["cantidad_nominas"] == 1
    finally:
        _limpiar_empleado(client, emp["id"])


# ═══════════════════════════════════════════════════════════════════════════
# Conceptos definidos en el formulario de generación
# ═══════════════════════════════════════════════════════════════════════════


def test_generar_concepto_deduccion(client):
    """El concepto se materializa como movimiento y se congela en la nómina."""
    emp = _crear_empleado(client, salario=1000)
    tipo = _crear_tipo_deduccion(client)
    try:
        response = _generar(
            client,
            empleado_id=emp["id"],
            deducciones=[{"tipo_id": tipo["id_tipos_deducciones"], "valor": 150}],
        )
        assert response.status_code == 201, response.text

        nomina = _nomina_de(client, emp["id"])
        assert Decimal(nomina["deducciones"]) == Decimal("150.00")
        assert Decimal(nomina["salario_neto"]) == Decimal("850.00")

        # Opción 1: existe el registro real en `deducciones`.
        movimientos = client.get(
            f"/api/v1/rrhh/deducciones?empleado_id={emp['id']}"
        ).json()
        assert len(movimientos) == 1
        assert movimientos[0]["tipo_deducciones_id"] == tipo["id_tipos_deducciones"]
        assert Decimal(movimientos[0]["valor"]) == Decimal("150.00")
        assert movimientos[0]["inicio_periodo"] == PERIODO_INICIO

        # Y quedó congelado en el detalle de la nómina.
        detalle = client.get(f"/api/v1/rrhh/nomina/{nomina['id']}").json()
        assert len(detalle["deducciones_aplicadas"]) == 1
        assert detalle["deducciones_aplicadas"][0]["tipo_nombre"] == tipo["nombre"]
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo_deduccion(client, tipo["id_tipos_deducciones"])


def test_generar_concepto_bonificacion_porcentual(client):
    """Los conceptos repetibles se aplican a todo el lote (aquí, uno solo)."""
    emp = _crear_empleado(client, salario=1000)
    tipo = _crear_tipo_bonificacion(client, es_porcentaje=True)
    try:
        response = _generar(
            client,
            empleado_id=emp["id"],
            bonificaciones=[{"tipo_id": tipo["id_tipos_bonificaciones"], "valor": 10}],
        )
        assert response.status_code == 201, response.text
        nomina = _nomina_de(client, emp["id"])
        # 10 % de 1000 = 100, aplicado sobre el salario del empleado.
        assert Decimal(nomina["bonificaciones"]) == Decimal("100.00")
        assert Decimal(nomina["salario_neto"]) == Decimal("1100.00")

        movimientos = client.get(
            f"/api/v1/rrhh/bonificaciones?empleado_id={emp['id']}"
        ).json()
        assert len(movimientos) == 1
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo_bonificacion(client, tipo["id_tipos_bonificaciones"])


def test_generar_varios_conceptos(client):
    emp = _crear_empleado(client, salario=1000)
    tipo_d = _crear_tipo_deduccion(client)
    tipo_b = _crear_tipo_bonificacion(client)
    try:
        response = _generar(
            client,
            empleado_id=emp["id"],
            deducciones=[
                {"tipo_id": tipo_d["id_tipos_deducciones"], "valor": 100},
                {"tipo_id": tipo_d["id_tipos_deducciones"], "valor": 50},
            ],
            bonificaciones=[{"tipo_id": tipo_b["id_tipos_bonificaciones"], "valor": 300}],
        )
        assert response.status_code == 201, response.text
        nomina = _nomina_de(client, emp["id"])
        assert Decimal(nomina["deducciones"]) == Decimal("150.00")
        assert Decimal(nomina["bonificaciones"]) == Decimal("300.00")
        # 1000 + 300 - 150
        assert Decimal(nomina["salario_neto"]) == Decimal("1150.00")
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo_deduccion(client, tipo_d["id_tipos_deducciones"])
        _limpiar_tipo_bonificacion(client, tipo_b["id_tipos_bonificaciones"])


def test_concepto_reutiliza_movimiento_existente(client):
    """Mismo tipo, valor y periodo → no se duplica el cobro."""
    emp = _crear_empleado(client, salario=1000)
    tipo = _crear_tipo_deduccion(client)
    try:
        _crear_deduccion(client, emp["id"], tipo["id_tipos_deducciones"], 200)
        response = _generar(
            client,
            empleado_id=emp["id"],
            deducciones=[{"tipo_id": tipo["id_tipos_deducciones"], "valor": 200}],
        )
        assert response.status_code == 201, response.text

        movimientos = client.get(
            f"/api/v1/rrhh/deducciones?empleado_id={emp['id']}"
        ).json()
        assert len(movimientos) == 1
        assert Decimal(_nomina_de(client, emp["id"])["deducciones"]) == Decimal("200.00")
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo_deduccion(client, tipo["id_tipos_deducciones"])


def test_conceptos_identicos_no_se_duplican(client):
    """Dos conceptos idénticos en la misma generación cobran una sola vez."""
    emp = _crear_empleado(client, salario=1000)
    tipo = _crear_tipo_deduccion(client)
    try:
        response = _generar(
            client,
            empleado_id=emp["id"],
            deducciones=[
                {"tipo_id": tipo["id_tipos_deducciones"], "valor": 200},
                {"tipo_id": tipo["id_tipos_deducciones"], "valor": 200},
            ],
        )
        assert response.status_code == 201, response.text
        detalle = client.get(
            f"/api/v1/rrhh/nomina/{_nomina_de(client, emp['id'])['id']}"
        ).json()
        assert len(detalle["deducciones_aplicadas"]) == 1
        assert Decimal(detalle["deducciones"]) == Decimal("200.00")
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo_deduccion(client, tipo["id_tipos_deducciones"])


def test_generar_sin_movimientos_existentes(client):
    """La casilla apagada deja fuera los movimientos ya registrados."""
    emp = _crear_empleado(client, salario=1000)
    tipo_d = _crear_tipo_deduccion(client)
    tipo_b = _crear_tipo_bonificacion(client)
    try:
        _crear_deduccion(client, emp["id"], tipo_d["id_tipos_deducciones"], 200)
        response = _generar(
            client,
            empleado_id=emp["id"],
            bonificaciones=[{"tipo_id": tipo_b["id_tipos_bonificaciones"], "valor": 50}],
            incluir_movimientos_existentes=False,
        )
        assert response.status_code == 201, response.text
        nomina = _nomina_de(client, emp["id"])
        assert Decimal(nomina["deducciones"]) == Decimal("0.00")
        assert Decimal(nomina["bonificaciones"]) == Decimal("50.00")
        assert Decimal(nomina["salario_neto"]) == Decimal("1050.00")
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo_deduccion(client, tipo_d["id_tipos_deducciones"])
        _limpiar_tipo_bonificacion(client, tipo_b["id_tipos_bonificaciones"])


def test_concepto_tipo_inexistente_404(client):
    """La validación ocurre antes de crear nóminas o movimientos."""
    emp = _crear_empleado(client, salario=1000)
    try:
        response = _generar(
            client,
            empleado_id=emp["id"],
            deducciones=[{"tipo_id": 999999, "valor": 100}],
        )
        assert response.status_code == 404
        assert client.get(f"/api/v1/rrhh/nomina?empleado_id={emp['id']}").json() == []
        assert (
            client.get(f"/api/v1/rrhh/deducciones?empleado_id={emp['id']}").json() == []
        )
    finally:
        _limpiar_empleado(client, emp["id"])


def test_concepto_valor_negativo_422(client):
    emp = _crear_empleado(client, salario=1000)
    tipo = _crear_tipo_deduccion(client)
    try:
        response = _generar(
            client,
            empleado_id=emp["id"],
            deducciones=[{"tipo_id": tipo["id_tipos_deducciones"], "valor": -10}],
        )
        assert response.status_code == 422
        assert client.get(f"/api/v1/rrhh/nomina?empleado_id={emp['id']}").json() == []
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo_deduccion(client, tipo["id_tipos_deducciones"])


def test_concepto_no_se_crea_en_empleado_omitido(client):
    """Quien ya tiene nómina para el periodo no acumula movimientos del lote."""
    emp = _crear_empleado(client, salario=1000)
    tipo = _crear_tipo_deduccion(client)
    try:
        assert _generar(client, empleado_id=emp["id"]).json()["creadas"] == 1
        response = _generar(
            client,
            empleado_id=emp["id"],
            deducciones=[{"tipo_id": tipo["id_tipos_deducciones"], "valor": 100}],
        )
        assert response.status_code == 201
        assert response.json()["omitidas"] == 1
        assert (
            client.get(f"/api/v1/rrhh/deducciones?empleado_id={emp['id']}").json() == []
        )
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo_deduccion(client, tipo["id_tipos_deducciones"])


# ═══════════════════════════════════════════════════════════════════════════
# Listado de pagos
# ═══════════════════════════════════════════════════════════════════════════


def test_listar_pagos_ok(client):
    """`GET /nomina/pagos` no lo captura `/{nomina_id}` (orden de rutas)."""
    response = client.get("/api/v1/rrhh/nomina/pagos")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_pagos_resuelve_nomina_y_empleado(client):
    emp = _crear_empleado(client, salario=1000)
    tipo_pago = _crear_tipo_pago(client)
    try:
        _generar(client, empleado_id=emp["id"])
        nomina = _nomina_de(client, emp["id"])
        client.post(
            f"/api/v1/rrhh/nomina/{nomina['id']}/pagar",
            json={
                "metodo_id": tipo_pago["id_tipo_pago"],
                "monto": nomina["salario_neto"],
                "fecha_pago": "2098-02-01",
                "referencia": "REF-LISTADO",
            },
        )
        pagos = client.get(
            f"/api/v1/rrhh/nomina/pagos?nomina_id={nomina['id']}"
        ).json()
        assert len(pagos) == 1
        fila = pagos[0]
        assert fila["empleado_id"] == emp["id"]
        assert fila["empleado_codigo"] == emp["codigo_empleado"]
        assert fila["metodo_nombre"] == tipo_pago["nombre"]
        assert fila["referencia"] == "REF-LISTADO"
        assert fila["estado_nomina"] == "pagada"
        assert fila["inicio_periodo"] == PERIODO_INICIO
        assert Decimal(fila["monto"]) == Decimal("1000.00")
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo_pago(client, tipo_pago["id_tipo_pago"])


def test_pagos_filtro_por_empleado(client):
    emp_a = _crear_empleado(client, salario=1000)
    emp_b = _crear_empleado(client, salario=2000)
    tipo_pago = _crear_tipo_pago(client)
    try:
        for emp in (emp_a, emp_b):
            _generar(client, empleado_id=emp["id"])
            nomina = _nomina_de(client, emp["id"])
            client.post(
                f"/api/v1/rrhh/nomina/{nomina['id']}/pagar",
                json={
                    "metodo_id": tipo_pago["id_tipo_pago"],
                    "monto": nomina["salario_neto"],
                },
            )
        pagos = client.get(
            f"/api/v1/rrhh/nomina/pagos?empleado_id={emp_a['id']}"
        ).json()
        assert pagos
        assert all(p["empleado_id"] == emp_a["id"] for p in pagos)
        assert not any(p["empleado_id"] == emp_b["id"] for p in pagos)
    finally:
        for emp in (emp_a, emp_b):
            _limpiar_nominas_de(client, emp["id"])
            _limpiar_empleado(client, emp["id"])
        _limpiar_tipo_pago(client, tipo_pago["id_tipo_pago"])


def test_pagos_rango_de_fecha(client):
    emp = _crear_empleado(client, salario=1000)
    tipo_pago = _crear_tipo_pago(client)
    try:
        _generar(client, empleado_id=emp["id"])
        nomina = _nomina_de(client, emp["id"])
        client.post(
            f"/api/v1/rrhh/nomina/{nomina['id']}/pagar",
            json={
                "metodo_id": tipo_pago["id_tipo_pago"],
                "monto": nomina["salario_neto"],
                "fecha_pago": "2098-02-01",
            },
        )
        # Rango anterior al pago: no lo encuentra.
        antes = client.get(
            "/api/v1/rrhh/nomina/pagos?hasta=2098-01-31"
        ).json()
        assert not any(p["nomina_id"] == nomina["id"] for p in antes)
        # Rango que lo incluye: sí.
        dentro = client.get(
            "/api/v1/rrhh/nomina/pagos?desde=2098-02-01&hasta=2098-02-28"
        ).json()
        assert any(p["nomina_id"] == nomina["id"] for p in dentro)
    finally:
        _limpiar_nominas_de(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo_pago(client, tipo_pago["id_tipo_pago"])


def test_pagos_filtro_nomina_sin_resultados(client):
    response = client.get("/api/v1/rrhh/nomina/pagos?nomina_id=999999")
    assert response.status_code == 200
    assert response.json() == []
