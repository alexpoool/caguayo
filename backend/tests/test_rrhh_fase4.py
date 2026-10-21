"""Tests de la Fase 4 del módulo RRHH — Asistencia.

Usan el patrón `client` de conftest.py (TestClient contra la BD real).

La tabla `asistencia` tiene `UNIQUE (empleado_id, fecha)`, así que cada test
crea su propio empleado y usa una fecha futura (año 2099) para no colisionar
con datos reales. Al final se limpia la marcación y el empleado.
"""

import uuid
from datetime import time

from src.domain.rrhh_asistencia_calc import (
    ESTADOS_ASISTENCIA,
    calcular_horas_extras,
    calcular_horas_trabajadas,
    calcular_tardanza,
    duracion_minutos,
    estado_derivado,
    minutos_a_horas_minutos,
    resumen_jornada,
    validar_marcacion,
)


def _sufijo():
    return uuid.uuid4().hex[:8]


def _fecha_unica(dia: int = 1) -> str:
    """Fecha futura y poco común, para no chocar con datos reales."""
    return f"2099-01-{dia:02d}"


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


def _limpiar_asistencias(client, empleado_id):
    """Borra todas las marcaciones de un empleado (para no dejar residuos)."""
    response = client.get(f"/api/v1/rrhh/asistencia?empleado_id={empleado_id}&limit=1000")
    if response.status_code == 200:
        for fila in response.json():
            client.delete(f"/api/v1/rrhh/asistencia/{fila['id']}")


def _marcar(client, empleado_id, fecha, hora, **kwargs):
    payload = {"empleado_id": empleado_id, "fecha": fecha, "hora": hora}
    payload.update(kwargs)
    return client.post("/api/v1/rrhh/asistencia/marcar", json=payload)


# ═══════════════════════════════════════════════════════════════════════════
# Módulo de dominio (funciones puras, sin BD)
# ═══════════════════════════════════════════════════════════════════════════


class TestCalculoTardanza:
    def test_puntual_no_tardanza(self):
        assert calcular_tardanza(time(8, 0), time(8, 0)) == 0

    def test_antes_del_horario_no_tardanza(self):
        assert calcular_tardanza(time(7, 30), time(8, 0)) == 0

    def test_treinta_minutos_de_tardanza(self):
        assert calcular_tardanza(time(8, 30), time(8, 0)) == 30

    def test_sin_entrada_no_tardanza(self):
        assert calcular_tardanza(None, time(8, 0)) == 0

    def test_sin_horario_no_tardanza(self):
        """Empleado con asistencia LIBRE: no hay horario pactado."""
        assert calcular_tardanza(time(11, 0), None) == 0


class TestCalculoHorasTrabajadas:
    def test_jornada_completa(self):
        assert calcular_horas_trabajadas(time(8, 0), time(16, 0)) == 480

    def test_jornada_incompleta(self):
        assert calcular_horas_trabajadas(time(8, 0), time(12, 30)) == 270

    def test_sin_salida(self):
        assert calcular_horas_trabajadas(time(8, 0), None) == 0

    def test_sin_entrada(self):
        assert calcular_horas_trabajadas(None, time(16, 0)) == 0

    def test_turno_que_cruza_medianoche(self):
        """Un turno de noche suma 24h cuando la salida es anterior."""
        assert duracion_minutos(time(22, 0), time(6, 0)) == 480
        assert calcular_horas_trabajadas(time(22, 0), time(6, 0)) == 480


class TestCalculoHorasExtras:
    def test_sin_pactadas_no_hay_extras(self):
        assert calcular_horas_extras(time(8, 0), time(18, 0), None) == 0

    def test_dentro_de_lo_pactado(self):
        assert calcular_horas_extras(time(8, 0), time(16, 0), 8) == 0

    def test_dos_horas_extra(self):
        assert calcular_horas_extras(time(8, 0), time(18, 0), 8) == 120

    def test_sin_salida_no_hay_extras(self):
        assert calcular_horas_extras(time(8, 0), None, 8) == 0


class TestEstadoDerivado:
    def test_sin_entrada_es_ausente(self):
        assert estado_derivado(None, time(8, 0)) == "ausente"

    def test_entrada_puntual_es_presente(self):
        assert estado_derivado(time(8, 0), time(8, 0)) == "presente"

    def test_entrada_tardia_es_tardanza(self):
        assert estado_derivado(time(8, 15), time(8, 0)) == "tardanza"


class TestValidarMarcacion:
    def test_valida(self):
        assert validar_marcacion("presente", time(8, 0), time(16, 0)) is None

    def test_estado_invalido(self):
        error = validar_marcacion("inventado", time(8, 0), time(16, 0))
        assert error is not None
        assert "Estado inválido" in error

    def test_presente_requiere_entrada(self):
        error = validar_marcacion("presente", None, time(16, 0))
        assert error is not None
        assert "requiere hora de entrada" in error

    def test_tardanza_requiere_entrada(self):
        assert validar_marcacion("tardanza", None, None) is not None

    def test_ausente_no_requiere_entrada(self):
        assert validar_marcacion("ausente", None, None) is None

    def test_salida_anterior_a_entrada(self):
        error = validar_marcacion("presente", time(16, 0), time(8, 0))
        assert error is not None
        assert "salida debe ser posterior" in error

    def test_permiso_sin_horas(self):
        assert validar_marcacion("permiso", None, None) is None


class TestResumenJornada:
    def test_devuelve_las_tres_magnitudes(self):
        resumen = resumen_jornada(time(8, 15), time(18, 0), time(8, 0), 8)
        assert resumen["tardanza_minutos"] == 15
        assert resumen["horas_trabajadas_minutos"] == 585
        assert resumen["horas_extras_minutos"] == 105

    def test_formato_horas_minutos(self):
        assert minutos_a_horas_minutos(150) == "2:30"
        assert minutos_a_horas_minutos(0) == "0:00"
        assert minutos_a_horas_minutos(-30) == "-0:30"


class TestCatalogoEstados:
    def test_estados_coinciden_con_el_check_de_bd(self):
        esperados = {
            "presente",
            "ausente",
            "tardanza",
            "permiso",
            "vacaciones",
            "feriado",
            "incapacidad",
        }
        assert set(ESTADOS_ASISTENCIA) == esperados


# ═══════════════════════════════════════════════════════════════════════════
# Endpoint de catálogo
# ═══════════════════════════════════════════════════════════════════════════


def test_endpoint_estados(client):
    response = client.get("/api/v1/rrhh/asistencia/estados")
    assert response.status_code == 200
    assert "presente" in response.json()
    assert "tardanza" in response.json()


# ═══════════════════════════════════════════════════════════════════════════
# Marcación rápida (entrada / salida)
# ═══════════════════════════════════════════════════════════════════════════


def test_marcar_entrada(client):
    emp = _crear_empleado(client, horario_inicio="08:00", horario_final="16:00")
    fecha = _fecha_unica()
    try:
        response = _marcar(client, emp["id"], fecha, "08:00")
        assert response.status_code == 201, response.text
        data = response.json()
        assert data["hora_entrada"] == "08:00:00"
        assert data["hora_salida"] is None
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_marcar_entrada_luego_salida(client):
    emp = _crear_empleado(client, horario_inicio="08:00", horario_final="16:00")
    fecha = _fecha_unica()
    try:
        entrada = _marcar(client, emp["id"], fecha, "08:00")
        assert entrada.status_code == 201
        salida = _marcar(client, emp["id"], fecha, "16:00")
        assert salida.status_code == 201
        data = salida.json()
        assert data["hora_entrada"] == "08:00:00"
        assert data["hora_salida"] == "16:00:00"
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_marcar_tres_veces_conflict(client):
    emp = _crear_empleado(client, horario_inicio="08:00", horario_final="16:00")
    fecha = _fecha_unica()
    try:
        assert _marcar(client, emp["id"], fecha, "08:00").status_code == 201
        assert _marcar(client, emp["id"], fecha, "16:00").status_code == 201
        tercera = _marcar(client, emp["id"], fecha, "18:00")
        assert tercera.status_code == 409
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_marcar_salida_anterior_a_entrada_400(client):
    emp = _crear_empleado(client, horario_inicio="08:00", horario_final="16:00")
    fecha = _fecha_unica()
    try:
        assert _marcar(client, emp["id"], fecha, "16:00").status_code == 201
        mala = _marcar(client, emp["id"], fecha, "08:00")
        assert mala.status_code == 400
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_marcar_empleado_inexistente_404(client):
    response = _marcar(client, 999999, _fecha_unica(), "08:00")
    assert response.status_code == 404


def test_marcar_empleado_inactivo_400(client):
    emp = _crear_empleado(client, activo=False)
    try:
        response = _marcar(client, emp["id"], _fecha_unica(), "08:00")
        assert response.status_code == 400
        assert "inactivo" in response.json()["detail"]
    finally:
        _limpiar_empleado(client, emp["id"])


def test_marcar_detecta_tardanza(client):
    emp = _crear_empleado(client, horario_inicio="08:00", horario_final="16:00")
    fecha = _fecha_unica()
    try:
        response = _marcar(client, emp["id"], fecha, "08:45")
        assert response.status_code == 201
        assert response.json()["estado"] == "tardanza"
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_marcar_puntual_es_presente(client):
    emp = _crear_empleado(client, horario_inicio="08:00", horario_final="16:00")
    fecha = _fecha_unica()
    try:
        response = _marcar(client, emp["id"], fecha, "07:55")
        assert response.status_code == 201
        assert response.json()["estado"] == "presente"
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_marcar_empleado_libre_no_calcula_tardanza(client):
    """Un empleado con asistencia LIBRE no tiene horario pactado."""
    emp = _crear_empleado(client, tipo_asistencia="LIBRE")
    fecha = _fecha_unica()
    try:
        response = _marcar(client, emp["id"], fecha, "23:30")
        assert response.status_code == 201
        # Sin horario no hay tardanza posible.
        assert response.json()["estado"] == "presente"
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


# ═══════════════════════════════════════════════════════════════════════════
# Alta o corrección (upsert por empleado + fecha)
# ═══════════════════════════════════════════════════════════════════════════


def test_crear_asistencia_ok(client):
    emp = _crear_empleado(client, horario_inicio="08:00", horario_final="16:00")
    fecha = _fecha_unica()
    try:
        response = client.post(
            "/api/v1/rrhh/asistencia",
            json={
                "empleado_id": emp["id"],
                "fecha": fecha,
                "hora_entrada": "08:00",
                "hora_salida": "16:00",
            },
        )
        assert response.status_code == 201, response.text
        assert response.json()["hora_entrada"] == "08:00:00"
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_crear_asistencia_sobrescribe_existente(client):
    """El UNIQUE (empleado, fecha) hace que el alta corrija el registro."""
    emp = _crear_empleado(client, horario_inicio="08:00", horario_final="16:00")
    fecha = _fecha_unica()
    try:
        primero = client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp["id"], "fecha": fecha, "hora_entrada": "08:00"},
        )
        assert primero.status_code == 201
        segundo = client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp["id"], "fecha": fecha, "hora_entrada": "09:30"},
        )
        assert segundo.status_code == 201
        assert segundo.json()["hora_entrada"] == "09:30:00"
        # Solo debe existir una marcación para ese día.
        listado = client.get(f"/api/v1/rrhh/asistencia?empleado_id={emp['id']}")
        assert len(listado.json()) == 1
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_crear_asistencia_estado_invalido_400(client):
    emp = _crear_empleado(client)
    try:
        response = client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp["id"], "fecha": _fecha_unica(), "estado": "inventado"},
        )
        assert response.status_code == 400
    finally:
        _limpiar_empleado(client, emp["id"])


def test_crear_asistencia_presente_sin_entrada_400(client):
    emp = _crear_empleado(client)
    try:
        response = client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp["id"], "fecha": _fecha_unica(), "estado": "presente"},
        )
        assert response.status_code == 400
    finally:
        _limpiar_empleado(client, emp["id"])


def test_crear_asistencia_ausente_sin_horas_ok(client):
    emp = _crear_empleado(client)
    try:
        response = client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp["id"], "fecha": _fecha_unica(), "estado": "ausente"},
        )
        assert response.status_code == 201, response.text
        assert response.json()["estado"] == "ausente"
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_crear_asistencia_vacaciones_ok(client):
    emp = _crear_empleado(client)
    try:
        response = client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp["id"], "fecha": _fecha_unica(), "estado": "vacaciones"},
        )
        assert response.status_code == 201
        assert response.json()["estado"] == "vacaciones"
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_crear_asistencia_salida_anterior_400(client):
    emp = _crear_empleado(client)
    try:
        response = client.post(
            "/api/v1/rrhh/asistencia",
            json={
                "empleado_id": emp["id"],
                "fecha": _fecha_unica(),
                "hora_entrada": "16:00",
                "hora_salida": "08:00",
            },
        )
        assert response.status_code == 400
    finally:
        _limpiar_empleado(client, emp["id"])


def test_crear_asistencia_empleado_inexistente_404(client):
    response = client.post(
        "/api/v1/rrhh/asistencia",
        json={"empleado_id": 999999, "fecha": _fecha_unica(), "estado": "ausente"},
    )
    assert response.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════
# Listado, filtros y cálculos derivados
# ═══════════════════════════════════════════════════════════════════════════


def test_listar_ok(client):
    response = client.get("/api/v1/rrhh/asistencia")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_listado_incluye_calculos_derivados(client):
    emp = _crear_empleado(
        client, horario_inicio="08:00", horario_final="16:00", horas_a_trabajar=8
    )
    fecha = _fecha_unica()
    try:
        client.post(
            "/api/v1/rrhh/asistencia",
            json={
                "empleado_id": emp["id"],
                "fecha": fecha,
                "hora_entrada": "08:30",
                "hora_salida": "18:00",
            },
        )
        response = client.get(f"/api/v1/rrhh/asistencia?empleado_id={emp['id']}")
        assert response.status_code == 200
        fila = response.json()[0]
        assert fila["tardanza_minutos"] == 30
        assert fila["horas_trabajadas_minutos"] == 570
        # 570 trabajados − 480 pactadas (8 h) = 90 minutos extra.
        assert fila["horas_extras_minutos"] == 90
        # El nombre del empleado y su horario se resuelven en el listado.
        assert fila["empleado_codigo"] is not None
        assert fila["empleado_nombre"] is not None
        assert fila["horario_inicio"] == "08:00:00"
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_listado_empleado_libre_sin_calculos(client):
    emp = _crear_empleado(client, tipo_asistencia="LIBRE")
    fecha = _fecha_unica()
    try:
        client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp["id"], "fecha": fecha, "hora_entrada": "08:00"},
        )
        response = client.get(f"/api/v1/rrhh/asistencia?empleado_id={emp['id']}")
        fila = response.json()[0]
        assert fila["tardanza_minutos"] == 0
        assert fila["horas_extras_minutos"] == 0
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_listado_orden_descendente(client):
    """La tabla muestra primero lo más reciente (fecha y, en el día, id)."""
    emp_a = _crear_empleado(client)
    emp_b = _crear_empleado(client)
    try:
        client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp_a["id"], "fecha": "2099-03-01", "estado": "ausente"},
        )
        client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp_b["id"], "fecha": "2099-03-02", "estado": "ausente"},
        )
        response = client.get(
            "/api/v1/rrhh/asistencia?desde=2099-03-01&hasta=2099-03-02"
        )
        assert response.status_code == 200
        fechas = [fila["fecha"] for fila in response.json()]
        assert fechas == ["2099-03-02", "2099-03-01"]

        # Mismo día: la marcación creada después (id mayor) va primero.
        client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp_a["id"], "fecha": "2099-03-03", "estado": "permiso"},
        )
        client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp_b["id"], "fecha": "2099-03-03", "estado": "vacaciones"},
        )
        mismo_dia = client.get(
            "/api/v1/rrhh/asistencia?desde=2099-03-03&hasta=2099-03-03"
        )
        ids = [fila["id"] for fila in mismo_dia.json()]
        assert ids == sorted(ids, reverse=True)
    finally:
        _limpiar_asistencias(client, emp_a["id"])
        _limpiar_asistencias(client, emp_b["id"])
        _limpiar_empleado(client, emp_a["id"])
        _limpiar_empleado(client, emp_b["id"])


def test_filtro_por_fechas(client):
    emp = _crear_empleado(client)
    try:
        client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp["id"], "fecha": _fecha_unica(5), "estado": "ausente"},
        )
        response = client.get(
            f"/api/v1/rrhh/asistencia?empleado_id={emp['id']}"
            f"&desde={_fecha_unica(5)}&hasta={_fecha_unica(5)}"
        )
        assert response.status_code == 200
        assert len(response.json()) >= 1
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_filtro_por_estado(client):
    emp = _crear_empleado(client)
    fecha = _fecha_unica()
    try:
        client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp["id"], "fecha": fecha, "estado": "permiso"},
        )
        response = client.get(
            f"/api/v1/rrhh/asistencia?empleado_id={emp['id']}&estado=permiso"
        )
        assert response.status_code == 200
        assert all(f["estado"] == "permiso" for f in response.json())
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_filtro_estado_invalido_400(client):
    response = client.get("/api/v1/rrhh/asistencia?estado=inventado")
    assert response.status_code == 400


def test_filtro_por_departamento(client):
    dep = client.post("/api/v1/rrhh/departamentos", json={"nombre": f"DEP-{_sufijo()}"})
    id_dep = dep.json()["id_departamento"]
    emp = _crear_empleado(client, departamento_id=id_dep)
    try:
        client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp["id"], "fecha": _fecha_unica(), "estado": "ausente"},
        )
        response = client.get(f"/api/v1/rrhh/asistencia?departamento_id={id_dep}")
        assert response.status_code == 200
        assert any(f["empleado_codigo"] == emp["codigo_empleado"] for f in response.json())
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        client.delete(f"/api/v1/rrhh/departamentos/{id_dep}")


def test_buscar_por_nombre(client):
    emp = _crear_empleado(client)
    try:
        client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp["id"], "fecha": _fecha_unica(), "estado": "ausente"},
        )
        response = client.get(f"/api/v1/rrhh/asistencia?buscar={emp['nombre']}")
        assert response.status_code == 200
        assert any(f["empleado_codigo"] == emp["codigo_empleado"] for f in response.json())
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


# ═══════════════════════════════════════════════════════════════════════════
# Detalle, corrección y borrado
# ═══════════════════════════════════════════════════════════════════════════


def test_detalle_ok(client):
    emp = _crear_empleado(client, horario_inicio="08:00", horario_final="16:00")
    fecha = _fecha_unica()
    try:
        creado = client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp["id"], "fecha": fecha, "hora_entrada": "08:00"},
        )
        id_asist = creado.json()["id"]
        response = client.get(f"/api/v1/rrhh/asistencia/{id_asist}")
        assert response.status_code == 200
        assert response.json()["id"] == id_asist
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_detalle_no_encontrado_404(client):
    response = client.get("/api/v1/rrhh/asistencia/999999")
    assert response.status_code == 404


def test_correccion_por_id_ok(client):
    emp = _crear_empleado(client, horario_inicio="08:00", horario_final="16:00")
    fecha = _fecha_unica()
    try:
        creado = client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp["id"], "fecha": fecha, "hora_entrada": "08:00"},
        )
        id_asist = creado.json()["id"]
        response = client.put(
            f"/api/v1/rrhh/asistencia/{id_asist}",
            json={"hora_entrada": "09:00", "hora_salida": "17:00", "observaciones": "Corregido"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["hora_entrada"] == "09:00:00"
        assert data["hora_salida"] == "17:00:00"
        assert data["observaciones"] == "Corregido"
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_correccion_reevalua_tardanza(client):
    """Al cambiar la hora de entrada se reevalúa presente/tardanza."""
    emp = _crear_empleado(client, horario_inicio="08:00", horario_final="16:00")
    fecha = _fecha_unica()
    try:
        creado = client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp["id"], "fecha": fecha, "hora_entrada": "08:00"},
        )
        id_asist = creado.json()["id"]
        response = client.put(
            f"/api/v1/rrhh/asistencia/{id_asist}", json={"hora_entrada": "09:00"}
        )
        assert response.json()["estado"] == "tardanza"
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_correccion_no_encontrado_404(client):
    response = client.put("/api/v1/rrhh/asistencia/999999", json={"estado": "ausente"})
    assert response.status_code == 404


def test_correccion_inconsistente_400(client):
    emp = _crear_empleado(client)
    fecha = _fecha_unica()
    try:
        creado = client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp["id"], "fecha": fecha, "hora_entrada": "08:00"},
        )
        id_asist = creado.json()["id"]
        response = client.put(
            f"/api/v1/rrhh/asistencia/{id_asist}",
            json={"hora_entrada": "16:00", "hora_salida": "08:00"},
        )
        assert response.status_code == 400
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_eliminar_ok(client):
    emp = _crear_empleado(client)
    fecha = _fecha_unica()
    creado = client.post(
        "/api/v1/rrhh/asistencia",
        json={"empleado_id": emp["id"], "fecha": fecha, "estado": "ausente"},
    )
    id_asist = creado.json()["id"]
    response = client.delete(f"/api/v1/rrhh/asistencia/{id_asist}")
    assert response.status_code == 200
    assert response.json()["accion"] == "eliminado"
    assert client.get(f"/api/v1/rrhh/asistencia/{id_asist}").status_code == 404
    _limpiar_empleado(client, emp["id"])


def test_eliminar_no_encontrado_404(client):
    response = client.delete("/api/v1/rrhh/asistencia/999999")
    assert response.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════
# Resumen del día
# ═══════════════════════════════════════════════════════════════════════════


def test_resumen_dia_ok(client):
    emp_a = _crear_empleado(client, horario_inicio="08:00", horario_final="16:00")
    emp_b = _crear_empleado(client)
    fecha = _fecha_unica()
    try:
        client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp_a["id"], "fecha": fecha, "hora_entrada": "08:00"},
        )
        client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp_b["id"], "fecha": fecha, "estado": "ausente"},
        )
        response = client.get(f"/api/v1/rrhh/asistencia/resumen?fecha={fecha}")
        assert response.status_code == 200
        data = response.json()
        assert data["fecha"] == fecha
        assert data["presentes"] >= 1
        assert data["ausentes"] >= 1
        assert data["total_empleados"] >= 2
    finally:
        _limpiar_asistencias(client, emp_a["id"])
        _limpiar_asistencias(client, emp_b["id"])
        _limpiar_empleado(client, emp_a["id"])
        _limpiar_empleado(client, emp_b["id"])


def test_resumen_dia_suma_tardanzas(client):
    emp = _crear_empleado(client, horario_inicio="08:00", horario_final="16:00")
    fecha = _fecha_unica()
    try:
        client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp["id"], "fecha": fecha, "hora_entrada": "08:30"},
        )
        response = client.get(f"/api/v1/rrhh/asistencia/resumen?fecha={fecha}")
        assert response.status_code == 200
        assert response.json()["total_tardanza_minutos"] >= 30
        assert response.json()["tardanzas"] >= 1
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_resumen_dia_con_departamento(client):
    dep = client.post("/api/v1/rrhh/departamentos", json={"nombre": f"DEP-{_sufijo()}"})
    id_dep = dep.json()["id_departamento"]
    emp = _crear_empleado(client, departamento_id=id_dep)
    fecha = _fecha_unica()
    try:
        client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp["id"], "fecha": fecha, "estado": "ausente"},
        )
        response = client.get(
            f"/api/v1/rrhh/asistencia/resumen?fecha={fecha}&departamento_id={id_dep}"
        )
        assert response.status_code == 200
        assert response.json()["ausentes"] >= 1
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
        client.delete(f"/api/v1/rrhh/departamentos/{id_dep}")


def test_resumen_dia_sin_datos(client):
    """Una fecha sin marcaciones devuelve ceros, no un error."""
    response = client.get("/api/v1/rrhh/asistencia/resumen?fecha=2099-12-31")
    assert response.status_code == 200
    data = response.json()
    assert data["total_empleados"] == 0
    assert data["presentes"] == 0


def test_resumen_rango_de_fechas(client):
    """`desde`/`hasta` acotan el conteo y `fecha` sigue sirviendo para un día."""
    emp = _crear_empleado(client)
    try:
        client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp["id"], "fecha": "2099-02-11", "hora_entrada": "08:00"},
        )
        client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp["id"], "fecha": "2099-02-12", "estado": "ausente"},
        )
        rango = client.get(
            "/api/v1/rrhh/asistencia/resumen?desde=2099-02-11&hasta=2099-02-12"
        )
        assert rango.status_code == 200
        datos = rango.json()
        assert datos["fecha"] == "2099-02-11"
        assert datos["presentes"] >= 1
        assert datos["ausentes"] >= 1
        assert datos["total_empleados"] >= 2

        un_dia = client.get("/api/v1/rrhh/asistencia/resumen?fecha=2099-02-12")
        assert un_dia.status_code == 200
        assert un_dia.json()["ausentes"] >= 1
        assert un_dia.json()["presentes"] == 0

        solo_hasta = client.get("/api/v1/rrhh/asistencia/resumen?hasta=2099-02-12")
        assert solo_hasta.status_code == 200
        assert solo_hasta.json()["ausentes"] >= 1
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_resumen_filtra_por_estado(client):
    emp = _crear_empleado(client)
    try:
        client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp["id"], "fecha": "2099-02-13", "estado": "ausente"},
        )
        response = client.get(
            "/api/v1/rrhh/asistencia/resumen?fecha=2099-02-13&estado=ausente"
        )
        assert response.status_code == 200
        datos = response.json()
        assert datos["ausentes"] >= 1
        # Al filtrar por estado, los demás contadores quedan a cero.
        assert datos["presentes"] == 0
        assert datos["total_empleados"] == datos["ausentes"]
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])


def test_resumen_filtra_por_busqueda(client):
    """El resumen acepta el mismo `buscar` que el listado (nombre/código)."""
    marca = f"Resumen{_sufijo()}"
    emp = _crear_empleado(client, nombre=marca)
    try:
        client.post(
            "/api/v1/rrhh/asistencia",
            json={"empleado_id": emp["id"], "fecha": "2099-02-14", "estado": "permiso"},
        )
        response = client.get(
            f"/api/v1/rrhh/asistencia/resumen?desde=2099-02-14&hasta=2099-02-14&buscar={marca}"
        )
        assert response.status_code == 200
        datos = response.json()
        assert datos["total_empleados"] == 1
        assert datos["permisos"] == 1
    finally:
        _limpiar_asistencias(client, emp["id"])
        _limpiar_empleado(client, emp["id"])
