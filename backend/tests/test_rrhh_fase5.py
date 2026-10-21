"""Tests de la Fase 5 del módulo RRHH — Deducciones y bonificaciones.

Usan el patrón `client` de conftest.py (TestClient contra la BD real).

Cada test crea su propio empleado y sus propios tipos, y usa periodos en
2098/2099 para no colisionar con datos reales. Al final limpia todo.
"""

import uuid
from datetime import date
from decimal import Decimal

from src.domain.rrhh_nomina_calc import (
    cubre_periodo,
    monto_aplicado,
    periodos_solapan,
    redondear,
    saldo,
    validar_porcentaje,
)


def _sufijo():
    return uuid.uuid4().hex[:8]


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


def _limpiar_empleado(client, empleado_id):
    client.delete(f"/api/v1/rrhh/empleados/{empleado_id}")


def _crear_tipo(client, prefijo, **kwargs):
    payload = {"nombre": f"{prefijo}-{_sufijo()}"}
    payload.update(kwargs)
    response = client.post(
        f"/api/v1/rrhh/catalogos/{prefijos_ruta[prefijo]}", json=payload
    )
    assert response.status_code == 201, response.text
    return response.json()


prefijos_ruta = {
    "DED": "tipos-deducciones",
    "BON": "tipos-bonificaciones",
}


def _limpiar_tipo(client, prefijo, id_tipo):
    client.delete(f"/api/v1/rrhh/catalogos/{prefijos_ruta[prefijo]}/{id_tipo}")


# ═══════════════════════════════════════════════════════════════════════════
# Módulo de dominio (funciones puras, sin BD)
# ═══════════════════════════════════════════════════════════════════════════


class TestMontoAplicado:
    def test_tipo_fijo_devuelve_el_valor(self):
        assert monto_aplicado(Decimal("150.50"), False, Decimal("1000")) == Decimal("150.50")

    def test_tipo_fijo_ignora_el_salario(self):
        assert monto_aplicado(Decimal("20"), False, None) == Decimal("20.00")

    def test_porcentual_calcula_sobre_el_salario(self):
        assert monto_aplicado(Decimal("10"), True, Decimal("1000")) == Decimal("100.00")

    def test_porcentual_sin_salario_es_cero(self):
        """Sin salario no se puede convertir el porcentaje: no se descuenta a ciegas."""
        assert monto_aplicado(Decimal("10"), True, None) == Decimal("0.00")

    def test_porcentual_con_salario_nulo_es_cero(self):
        assert monto_aplicado(Decimal("5"), True, None) == Decimal("0.00")

    def test_redondea_a_dos_decimales(self):
        # 33.33 % de 1000 = 333.30 (no 333.33: el porcentaje es exacto)
        assert monto_aplicado(Decimal("33.33"), True, Decimal("1000")) == Decimal("333.30")

    def test_redondeo_con_decimales_perdidos(self):
        # 33 % de 1000 = 330 exacto
        assert monto_aplicado(Decimal("33"), True, Decimal("1000")) == Decimal("330.00")

    def test_redondeo_comercial(self):
        assert redondear(Decimal("1.005")) == Decimal("1.01")
        assert redondear(Decimal("2.675")) == Decimal("2.68")


class TestValidarPorcentaje:
    def test_cero_es_valido(self):
        assert validar_porcentaje(Decimal("0")) is True

    def test_cien_es_valido(self):
        assert validar_porcentaje(Decimal("100")) is True

    def test_ciento_uno_es_invalido(self):
        assert validar_porcentaje(Decimal("101")) is False

    def test_negativo_es_invalido(self):
        assert validar_porcentaje(Decimal("-1")) is False


class TestSolape:
    def test_solape_real(self):
        assert periodos_solapan(
            date(2099, 1, 1), date(2099, 1, 31),
            date(2099, 1, 15), date(2099, 2, 28),
        ) is True

    def test_periodos_disjuntos(self):
        assert periodos_solapan(
            date(2099, 1, 1), date(2099, 1, 31),
            date(2099, 2, 1), date(2099, 2, 28),
        ) is False

    def test_periodos_que_se_tocan_cuentan_como_solape(self):
        """El fin de uno es el inicio del otro: ese día se cobraría dos veces."""
        assert periodos_solapan(
            date(2099, 1, 1), date(2099, 1, 31),
            date(2099, 1, 31), date(2099, 2, 28),
        ) is True

    def test_uno_dentro_de_otro(self):
        assert periodos_solapan(
            date(2099, 1, 1), date(2099, 12, 31),
            date(2099, 3, 1), date(2099, 3, 31),
        ) is True


class TestCubrePeriodo:
    def test_dentro_del_rango(self):
        assert cubre_periodo(date(2099, 1, 10), date(2099, 1, 20), date(2099, 1, 1), date(2099, 1, 31)) is True

    def test_anterior_al_desde(self):
        assert cubre_periodo(date(2099, 1, 1), date(2099, 1, 5), date(2099, 2, 1), None) is False

    def test_posterior_al_hasta(self):
        assert cubre_periodo(date(2099, 5, 1), date(2099, 5, 31), None, date(2099, 1, 31)) is False

    def test_rango_abierto_por_la_izquierda(self):
        assert cubre_periodo(date(2099, 5, 1), date(2099, 5, 31), None, date(2099, 1, 31)) is False
        assert cubre_periodo(date(2099, 1, 1), date(2099, 1, 31), None, date(2099, 6, 30)) is True

    def test_rango_totalmente_abierto(self):
        assert cubre_periodo(date(2099, 1, 1), date(2099, 1, 31), None, None) is True


class TestSaldo:
    def test_bonificaciones_mayores(self):
        assert saldo(Decimal("500"), Decimal("200")) == Decimal("300.00")

    def test_deducciones_mayores_da_negativo(self):
        assert saldo(Decimal("100"), Decimal("250")) == Decimal("-150.00")


# ═══════════════════════════════════════════════════════════════════════════
# Deducciones — alta
# ═══════════════════════════════════════════════════════════════════════════


def test_crear_deduccion_fija_ok(client):
    emp = _crear_empleado(client, salario=1000)
    tipo = _crear_tipo(client, "DED")
    try:
        response = client.post(
            "/api/v1/rrhh/deducciones",
            json={
                "empleado_id": emp["id"],
                "tipo_deducciones_id": tipo["id_tipos_deducciones"],
                "valor": 150,
                "inicio_periodo": "2099-01-01",
                "fin_periodo": "2099-01-31",
            },
        )
        assert response.status_code == 201, response.text
        assert response.json()["valor"] == "150.00"
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "DED", tipo["id_tipos_deducciones"])


def test_crear_deduccion_porcentual_ok(client):
    emp = _crear_empleado(client, salario=1000)
    tipo = _crear_tipo(client, "DED", es_porcentaje=True)
    try:
        response = client.post(
            "/api/v1/rrhh/deducciones",
            json={
                "empleado_id": emp["id"],
                "tipo_deducciones_id": tipo["id_tipos_deducciones"],
                "valor": 10,
                "inicio_periodo": "2099-01-01",
                "fin_periodo": "2099-01-31",
            },
        )
        assert response.status_code == 201, response.text
        # El listado convierte el 10 % de 1000 en 100.00
        listado = client.get(f"/api/v1/rrhh/deducciones?empleado_id={emp['id']}")
        fila = listado.json()[0]
        assert fila["es_porcentaje"] is True
        assert fila["monto"] == "100.00"
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "DED", tipo["id_tipos_deducciones"])


def test_deduccion_porcentual_sin_salario_es_cero(client):
    emp = _crear_empleado(client)
    tipo = _crear_tipo(client, "DED", es_porcentaje=True)
    try:
        client.post(
            "/api/v1/rrhh/deducciones",
            json={
                "empleado_id": emp["id"],
                "tipo_deducciones_id": tipo["id_tipos_deducciones"],
                "valor": 10,
                "inicio_periodo": "2099-01-01",
                "fin_periodo": "2099-01-31",
            },
        )
        listado = client.get(f"/api/v1/rrhh/deducciones?empleado_id={emp['id']}")
        assert listado.json()[0]["monto"] == "0.00"
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "DED", tipo["id_tipos_deducciones"])


def test_crear_deduccion_empleado_inexistente_404(client):
    tipo = _crear_tipo(client, "DED")
    try:
        response = client.post(
            "/api/v1/rrhh/deducciones",
            json={
                "empleado_id": 999999,
                "tipo_deducciones_id": tipo["id_tipos_deducciones"],
                "valor": 10,
                "inicio_periodo": "2099-01-01",
                "fin_periodo": "2099-01-31",
            },
        )
        assert response.status_code == 404
    finally:
        _limpiar_tipo(client, "DED", tipo["id_tipos_deducciones"])


def test_crear_deduccion_tipo_inexistente_404(client):
    emp = _crear_empleado(client)
    try:
        response = client.post(
            "/api/v1/rrhh/deducciones",
            json={
                "empleado_id": emp["id"],
                "tipo_deducciones_id": 999999,
                "valor": 10,
                "inicio_periodo": "2099-01-01",
                "fin_periodo": "2099-01-31",
            },
        )
        assert response.status_code == 404
    finally:
        _limpiar_empleado(client, emp["id"])


def test_crear_deduccion_valor_negativo_422(client):
    emp = _crear_empleado(client)
    tipo = _crear_tipo(client, "DED")
    try:
        response = client.post(
            "/api/v1/rrhh/deducciones",
            json={
                "empleado_id": emp["id"],
                "tipo_deducciones_id": tipo["id_tipos_deducciones"],
                "valor": -10,
                "inicio_periodo": "2099-01-01",
                "fin_periodo": "2099-01-31",
            },
        )
        assert response.status_code == 422
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "DED", tipo["id_tipos_deducciones"])


def test_crear_deduccion_periodo_invertido_400(client):
    emp = _crear_empleado(client)
    tipo = _crear_tipo(client, "DED")
    try:
        response = client.post(
            "/api/v1/rrhh/deducciones",
            json={
                "empleado_id": emp["id"],
                "tipo_deducciones_id": tipo["id_tipos_deducciones"],
                "valor": 10,
                "inicio_periodo": "2099-01-31",
                "fin_periodo": "2099-01-01",
            },
        )
        assert response.status_code == 400
        assert "fin del periodo" in response.json()["detail"]
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "DED", tipo["id_tipos_deducciones"])


def test_crear_deduccion_porcentual_mayor_100_400(client):
    emp = _crear_empleado(client, salario=1000)
    tipo = _crear_tipo(client, "DED", es_porcentaje=True)
    try:
        response = client.post(
            "/api/v1/rrhh/deducciones",
            json={
                "empleado_id": emp["id"],
                "tipo_deducciones_id": tipo["id_tipos_deducciones"],
                "valor": 150,
                "inicio_periodo": "2099-01-01",
                "fin_periodo": "2099-01-31",
            },
        )
        assert response.status_code == 400
        assert "porcentual" in response.json()["detail"]
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "DED", tipo["id_tipos_deducciones"])


# ═══════════════════════════════════════════════════════════════════════════
# Solape de periodos
# ═══════════════════════════════════════════════════════════════════════════


def test_solape_del_mismo_tipo_conflict(client):
    emp = _crear_empleado(client)
    tipo = _crear_tipo(client, "DED")
    try:
        primero = client.post(
            "/api/v1/rrhh/deducciones",
            json={
                "empleado_id": emp["id"],
                "tipo_deducciones_id": tipo["id_tipos_deducciones"],
                "valor": 10,
                "inicio_periodo": "2099-01-01",
                "fin_periodo": "2099-01-31",
            },
        )
        assert primero.status_code == 201
        segundo = client.post(
            "/api/v1/rrhh/deducciones",
            json={
                "empleado_id": emp["id"],
                "tipo_deducciones_id": tipo["id_tipos_deducciones"],
                "valor": 20,
                "inicio_periodo": "2099-01-15",
                "fin_periodo": "2099-02-28",
            },
        )
        assert segundo.status_code == 409
        assert "Ya existe" in segundo.json()["detail"]
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "DED", tipo["id_tipos_deducciones"])


def test_periodos_que_se_tocan_conflict(client):
    emp = _crear_empleado(client)
    tipo = _crear_tipo(client, "DED")
    try:
        client.post(
            "/api/v1/rrhh/deducciones",
            json={
                "empleado_id": emp["id"],
                "tipo_deducciones_id": tipo["id_tipos_deducciones"],
                "valor": 10,
                "inicio_periodo": "2099-01-01",
                "fin_periodo": "2099-01-31",
            },
        )
        siguiente = client.post(
            "/api/v1/rrhh/deducciones",
            json={
                "empleado_id": emp["id"],
                "tipo_deducciones_id": tipo["id_tipos_deducciones"],
                "valor": 10,
                "inicio_periodo": "2099-01-31",
                "fin_periodo": "2099-02-28",
            },
        )
        assert siguiente.status_code == 409
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "DED", tipo["id_tipos_deducciones"])


def test_tipos_distintos_no_solapan(client):
    emp = _crear_empleado(client)
    tipo_a = _crear_tipo(client, "DED")
    tipo_b = _crear_tipo(client, "DED")
    try:
        payload = {
            "empleado_id": emp["id"],
            "valor": 10,
            "inicio_periodo": "2099-01-01",
            "fin_periodo": "2099-01-31",
        }
        primero = client.post(
            "/api/v1/rrhh/deducciones",
            json={**payload, "tipo_deducciones_id": tipo_a["id_tipos_deducciones"]},
        )
        segundo = client.post(
            "/api/v1/rrhh/deducciones",
            json={**payload, "tipo_deducciones_id": tipo_b["id_tipos_deducciones"]},
        )
        assert primero.status_code == 201
        assert segundo.status_code == 201
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "DED", tipo_a["id_tipos_deducciones"])
        _limpiar_tipo(client, "DED", tipo_b["id_tipos_deducciones"])


def test_empleados_distintos_no_solapan(client):
    emp_a = _crear_empleado(client)
    emp_b = _crear_empleado(client)
    tipo = _crear_tipo(client, "DED")
    try:
        payload = {
            "tipo_deducciones_id": tipo["id_tipos_deducciones"],
            "valor": 10,
            "inicio_periodo": "2099-01-01",
            "fin_periodo": "2099-01-31",
        }
        primero = client.post(
            "/api/v1/rrhh/deducciones", json={**payload, "empleado_id": emp_a["id"]}
        )
        segundo = client.post(
            "/api/v1/rrhh/deducciones", json={**payload, "empleado_id": emp_b["id"]}
        )
        assert primero.status_code == 201
        assert segundo.status_code == 201
    finally:
        _limpiar_empleado(client, emp_a["id"])
        _limpiar_empleado(client, emp_b["id"])
        _limpiar_tipo(client, "DED", tipo["id_tipos_deducciones"])


# ═══════════════════════════════════════════════════════════════════════════
# Listado, filtros y detalle
# ═══════════════════════════════════════════════════════════════════════════


def test_listar_deducciones_ok(client):
    response = client.get("/api/v1/rrhh/deducciones")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_listado_incluye_nombres_y_monto(client):
    emp = _crear_empleado(client, salario=2000)
    tipo = _crear_tipo(client, "DED", nombre=f"Seguro{_sufijo()}", es_porcentaje=True)
    try:
        client.post(
            "/api/v1/rrhh/deducciones",
            json={
                "empleado_id": emp["id"],
                "tipo_deducciones_id": tipo["id_tipos_deducciones"],
                "valor": 5,
                "inicio_periodo": "2099-01-01",
                "fin_periodo": "2099-01-31",
            },
        )
        response = client.get(f"/api/v1/rrhh/deducciones?empleado_id={emp['id']}")
        fila = response.json()[0]
        assert fila["empleado_nombre"] is not None
        assert fila["empleado_codigo"] == emp["codigo_empleado"]
        assert fila["tipo_nombre"] == tipo["nombre"]
        assert fila["es_porcentaje"] is True
        # 5 % de 2000 = 100
        assert fila["monto"] == "100.00"
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "DED", tipo["id_tipos_deducciones"])


def test_filtro_por_rango_de_fechas(client):
    emp = _crear_empleado(client)
    tipo = _crear_tipo(client, "DED")
    try:
        client.post(
            "/api/v1/rrhh/deducciones",
            json={
                "empleado_id": emp["id"],
                "tipo_deducciones_id": tipo["id_tipos_deducciones"],
                "valor": 10,
                "inicio_periodo": "2099-03-01",
                "fin_periodo": "2099-03-31",
            },
        )
        # Un rango que no toca marzo no debe devolverla.
        fuera = client.get(
            f"/api/v1/rrhh/deducciones?empleado_id={emp['id']}"
            "&desde=2099-01-01&hasta=2099-01-31"
        )
        assert fuera.json() == []
        # Un rango que la contiene sí.
        dentro = client.get(
            f"/api/v1/rrhh/deducciones?empleado_id={emp['id']}"
            "&desde=2099-03-01&hasta=2099-03-31"
        )
        assert len(dentro.json()) == 1
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "DED", tipo["id_tipos_deducciones"])


def test_buscar_por_nombre(client):
    emp = _crear_empleado(client)
    tipo = _crear_tipo(client, "DED")
    try:
        client.post(
            "/api/v1/rrhh/deducciones",
            json={
                "empleado_id": emp["id"],
                "tipo_deducciones_id": tipo["id_tipos_deducciones"],
                "valor": 10,
                "inicio_periodo": "2099-01-01",
                "fin_periodo": "2099-01-31",
            },
        )
        response = client.get(f"/api/v1/rrhh/deducciones?buscar={emp['nombre']}")
        assert any(f["empleado_codigo"] == emp["codigo_empleado"] for f in response.json())
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "DED", tipo["id_tipos_deducciones"])


def test_detalle_deduccion_ok(client):
    emp = _crear_empleado(client)
    tipo = _crear_tipo(client, "DED")
    try:
        creado = client.post(
            "/api/v1/rrhh/deducciones",
            json={
                "empleado_id": emp["id"],
                "tipo_deducciones_id": tipo["id_tipos_deducciones"],
                "valor": 10,
                "inicio_periodo": "2099-01-01",
                "fin_periodo": "2099-01-31",
            },
        )
        id_ded = creado.json()["id_deducciones"]
        response = client.get(f"/api/v1/rrhh/deducciones/{id_ded}")
        assert response.status_code == 200
        assert response.json()["id_deducciones"] == id_ded
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "DED", tipo["id_tipos_deducciones"])


def test_detalle_no_encontrado_404(client):
    assert client.get("/api/v1/rrhh/deducciones/999999").status_code == 404


# ═══════════════════════════════════════════════════════════════════════════
# Edición
# ═══════════════════════════════════════════════════════════════════════════


def test_actualizar_deduccion_ok(client):
    emp = _crear_empleado(client)
    tipo = _crear_tipo(client, "DED")
    try:
        creado = client.post(
            "/api/v1/rrhh/deducciones",
            json={
                "empleado_id": emp["id"],
                "tipo_deducciones_id": tipo["id_tipos_deducciones"],
                "valor": 10,
                "inicio_periodo": "2099-01-01",
                "fin_periodo": "2099-01-31",
            },
        )
        id_ded = creado.json()["id_deducciones"]
        response = client.put(
            f"/api/v1/rrhh/deducciones/{id_ded}",
            json={"valor": 25, "observaciones": "Ajustado"},
        )
        assert response.status_code == 200
        assert response.json()["valor"] == "25.00"
        assert response.json()["observaciones"] == "Ajustado"
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "DED", tipo["id_tipos_deducciones"])


def test_actualizar_no_encontrado_404(client):
    response = client.put("/api/v1/rrhh/deducciones/999999", json={"valor": 10})
    assert response.status_code == 404


def test_actualizar_a_periodo_solapado_409(client):
    emp = _crear_empleado(client)
    tipo_a = _crear_tipo(client, "DED")
    tipo_b = _crear_tipo(client, "DED")
    try:
        payload = {
            "empleado_id": emp["id"],
            "valor": 10,
            "inicio_periodo": "2099-01-01",
            "fin_periodo": "2099-01-31",
        }
        client.post(
            "/api/v1/rrhh/deducciones",
            json={**payload, "tipo_deducciones_id": tipo_a["id_tipos_deducciones"]},
        )
        otro = client.post(
            "/api/v1/rrhh/deducciones",
            json={**payload, "tipo_deducciones_id": tipo_b["id_tipos_deducciones"]},
        )
        id_otro = otro.json()["id_deducciones"]
        # Mover el segundo al periodo del primero, con el mismo tipo → 409.
        response = client.put(
            f"/api/v1/rrhh/deducciones/{id_otro}",
            json={"tipo_deducciones_id": tipo_a["id_tipos_deducciones"]},
        )
        assert response.status_code == 409
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "DED", tipo_a["id_tipos_deducciones"])
        _limpiar_tipo(client, "DED", tipo_b["id_tipos_deducciones"])


# ═══════════════════════════════════════════════════════════════════════════
# Eliminación
# ═══════════════════════════════════════════════════════════════════════════


def test_eliminar_deduccion_ok(client):
    emp = _crear_empleado(client)
    tipo = _crear_tipo(client, "DED")
    creado = client.post(
        "/api/v1/rrhh/deducciones",
        json={
            "empleado_id": emp["id"],
            "tipo_deducciones_id": tipo["id_tipos_deducciones"],
            "valor": 10,
            "inicio_periodo": "2099-01-01",
            "fin_periodo": "2099-01-31",
        },
    )
    id_ded = creado.json()["id_deducciones"]
    response = client.delete(f"/api/v1/rrhh/deducciones/{id_ded}")
    assert response.status_code == 200
    assert response.json()["accion"] == "eliminado"
    assert client.get(f"/api/v1/rrhh/deducciones/{id_ded}").status_code == 404
    _limpiar_empleado(client, emp["id"])
    _limpiar_tipo(client, "DED", tipo["id_tipos_deducciones"])


def test_eliminar_no_encontrado_404(client):
    assert client.delete("/api/v1/rrhh/deducciones/999999").status_code == 404


# ═══════════════════════════════════════════════════════════════════════════
# Bonificaciones (misma lógica, otra tabla)
# ═══════════════════════════════════════════════════════════════════════════


def test_crear_bonificacion_ok(client):
    emp = _crear_empleado(client, salario=1000)
    tipo = _crear_tipo(client, "BON")
    try:
        response = client.post(
            "/api/v1/rrhh/bonificaciones",
            json={
                "empleado_id": emp["id"],
                "tipo_bonificaciones_id": tipo["id_tipos_bonificaciones"],
                "valor": 300,
                "inicio_periodo": "2099-01-01",
                "fin_periodo": "2099-01-31",
            },
        )
        assert response.status_code == 201, response.text
        assert response.json()["valor"] == "300.00"
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "BON", tipo["id_tipos_bonificaciones"])


def test_bonificacion_porcentual_calcula_monto(client):
    emp = _crear_empleado(client, salario=2000)
    tipo = _crear_tipo(client, "BON", es_porcentaje=True)
    try:
        client.post(
            "/api/v1/rrhh/bonificaciones",
            json={
                "empleado_id": emp["id"],
                "tipo_bonificaciones_id": tipo["id_tipos_bonificaciones"],
                "valor": 5,
                "inicio_periodo": "2099-01-01",
                "fin_periodo": "2099-01-31",
            },
        )
        listado = client.get(f"/api/v1/rrhh/bonificaciones?empleado_id={emp['id']}")
        assert listado.json()[0]["monto"] == "100.00"
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "BON", tipo["id_tipos_bonificaciones"])


def test_bonificacion_solape_conflict(client):
    emp = _crear_empleado(client)
    tipo = _crear_tipo(client, "BON")
    try:
        payload = {
            "empleado_id": emp["id"],
            "tipo_bonificaciones_id": tipo["id_tipos_bonificaciones"],
            "valor": 100,
            "inicio_periodo": "2099-01-01",
            "fin_periodo": "2099-01-31",
        }
        assert client.post("/api/v1/rrhh/bonificaciones", json=payload).status_code == 201
        assert client.post("/api/v1/rrhh/bonificaciones", json=payload).status_code == 409
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "BON", tipo["id_tipos_bonificaciones"])


def test_bonificacion_periodo_invertido_400(client):
    emp = _crear_empleado(client)
    tipo = _crear_tipo(client, "BON")
    try:
        response = client.post(
            "/api/v1/rrhh/bonificaciones",
            json={
                "empleado_id": emp["id"],
                "tipo_bonificaciones_id": tipo["id_tipos_bonificaciones"],
                "valor": 100,
                "inicio_periodo": "2099-01-31",
                "fin_periodo": "2099-01-01",
            },
        )
        assert response.status_code == 400
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "BON", tipo["id_tipos_bonificaciones"])


def test_listar_bonificaciones_ok(client):
    response = client.get("/api/v1/rrhh/bonificaciones")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


# ═══════════════════════════════════════════════════════════════════════════
# Vista consolidada
# ═══════════════════════════════════════════════════════════════════════════


def test_consolidado_ok(client):
    emp = _crear_empleado(client, salario=1000)
    tipo_d = _crear_tipo(client, "DED")
    tipo_b = _crear_tipo(client, "BON")
    try:
        client.post(
            "/api/v1/rrhh/deducciones",
            json={
                "empleado_id": emp["id"],
                "tipo_deducciones_id": tipo_d["id_tipos_deducciones"],
                "valor": 200,
                "inicio_periodo": "2099-01-01",
                "fin_periodo": "2099-01-31",
            },
        )
        client.post(
            "/api/v1/rrhh/bonificaciones",
            json={
                "empleado_id": emp["id"],
                "tipo_bonificaciones_id": tipo_b["id_tipos_bonificaciones"],
                "valor": 500,
                "inicio_periodo": "2099-01-01",
                "fin_periodo": "2099-01-31",
            },
        )
        response = client.get(
            "/api/v1/rrhh/movimientos/consolidado?desde=2099-01-01&hasta=2099-01-31"
        )
        assert response.status_code == 200
        data = response.json()
        # Solo se afirma sobre la fila de este empleado: la BD es compartida
        # con otros tests, así que los totales globales no son deterministas.
        fila = next(f for f in data["empleados"] if f["empleado_id"] == emp["id"])
        assert fila["total_deducciones"] == "200.00"
        assert fila["total_bonificaciones"] == "500.00"
        assert fila["saldo"] == "300.00"
        assert fila["cantidad_deducciones"] == 1
        assert fila["cantidad_bonificaciones"] == 1
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "DED", tipo_d["id_tipos_deducciones"])
        _limpiar_tipo(client, "BON", tipo_b["id_tipos_bonificaciones"])


def test_consolidado_con_porcentaje(client):
    emp = _crear_empleado(client, salario=1000)
    tipo = _crear_tipo(client, "BON", es_porcentaje=True)
    try:
        client.post(
            "/api/v1/rrhh/bonificaciones",
            json={
                "empleado_id": emp["id"],
                "tipo_bonificaciones_id": tipo["id_tipos_bonificaciones"],
                "valor": 10,
                "inicio_periodo": "2099-01-01",
                "fin_periodo": "2099-01-31",
            },
        )
        response = client.get(
            "/api/v1/rrhh/movimientos/consolidado?desde=2099-01-01&hasta=2099-01-31"
        )
        fila = next(f for f in response.json()["empleados"] if f["empleado_id"] == emp["id"])
        # 10 % de 1000 = 100
        assert fila["total_bonificaciones"] == "100.00"
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "BON", tipo["id_tipos_bonificaciones"])


def test_consolidado_respeta_el_rango(client):
    emp = _crear_empleado(client, salario=1000)
    tipo = _crear_tipo(client, "DED")
    try:
        client.post(
            "/api/v1/rrhh/deducciones",
            json={
                "empleado_id": emp["id"],
                "tipo_deducciones_id": tipo["id_tipos_deducciones"],
                "valor": 100,
                "inicio_periodo": "2099-01-01",
                "fin_periodo": "2099-01-31",
            },
        )
        # Rango que no toca enero: no debe contar.
        fuera = client.get(
            "/api/v1/rrhh/movimientos/consolidado?desde=2099-05-01&hasta=2099-05-31"
        )
        assert all(f["empleado_id"] != emp["id"] for f in fuera.json()["empleados"])
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_tipo(client, "DED", tipo["id_tipos_deducciones"])


def test_consolidado_sin_datos(client):
    """La BD es compartida, así que se comprueba la forma, no un cero absoluto."""
    response = client.get(
        "/api/v1/rrhh/movimientos/consolidado?desde=2099-12-01&hasta=2099-12-31"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["desde"] == "2099-12-01"
    assert data["hasta"] == "2099-12-31"
    assert isinstance(data["empleados"], list)
    assert data["cantidad_empleados"] == len(data["empleados"])
    # Ningún movimiento de 2099-12 cubre ese rango.
    assert all(
        f["total_deducciones"] == "0.00" and f["total_bonificaciones"] == "0.00"
        for f in data["empleados"]
    )
