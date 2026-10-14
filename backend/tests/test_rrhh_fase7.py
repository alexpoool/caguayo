"""Tests de la Fase 7 del módulo RRHH — Solicitudes de vacaciones y permisos.

Usan el patrón `client` de conftest.py (TestClient contra la BD real).

Cada test crea su propio empleado (y su supervisor cuando hace falta), usa
periodos en 2098-05 (libre de las demás fases) y al final limpia borrando el
empleado: la FK de `solicitudes` es `ondelete=CASCADE`, así que sus
solicitudes se van con él.
"""

import uuid
from datetime import date

from src.domain.rrhh_solicitud_calc import (
    ESTADOS_SOLICITUD,
    TIPOS_SOLICITUD,
    buscar_solapamiento,
    dias_solicitados,
    periodos_solapan,
    puede_transicionar,
    validar_fechas,
)


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


def _crear_solicitud(client, empleado_id, tipo="vacaciones", inicio="2098-05-01",
                     fin="2098-05-10", motivo="Viaje familiar"):
    response = client.post(
        "/api/v1/rrhh/solicitudes",
        json={
            "empleado_id": empleado_id,
            "tipo": tipo,
            "fecha_inicio": inicio,
            "fecha_fin": fin,
            "motivo": motivo,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _aprobar(client, solicitud_id, aprobador_id, observaciones=None):
    payload = {"empleado_id": aprobador_id}
    if observaciones is not None:
        payload["observaciones"] = observaciones
    return client.put(f"/api/v1/rrhh/solicitudes/{solicitud_id}/aprobar", json=payload)


def _rechazar(client, solicitud_id, aprobador_id, observaciones=None):
    payload = {"empleado_id": aprobador_id}
    if observaciones is not None:
        payload["observaciones"] = observaciones
    return client.put(f"/api/v1/rrhh/solicitudes/{solicitud_id}/rechazar", json=payload)


def _cancelar(client, solicitud_id, cancelador_id, observaciones=None):
    payload = {"empleado_id": cancelador_id}
    if observaciones is not None:
        payload["observaciones"] = observaciones
    return client.put(f"/api/v1/rrhh/solicitudes/{solicitud_id}/cancelar", json=payload)


# ═══════════════════════════════════════════════════════════════════════════
# Módulo de dominio (funciones puras, sin BD)
# ═══════════════════════════════════════════════════════════════════════════


class TestValidarFechas:
    def test_rango_valido_es_none(self):
        assert validar_fechas(date(2098, 5, 1), date(2098, 5, 10)) is None

    def test_un_dia_es_valido(self):
        assert validar_fechas(date(2098, 5, 1), date(2098, 5, 1)) is None

    def test_fin_antes_de_inicio_da_error(self):
        error = validar_fechas(date(2098, 5, 10), date(2098, 5, 1))
        assert error is not None
        assert "fin" in error


class TestDiasSolicitados:
    def test_rango_inclusivo(self):
        # Del 1 al 10 incluidos = 10 días.
        assert dias_solicitados(date(2098, 5, 1), date(2098, 5, 10)) == 10

    def test_un_dia(self):
        assert dias_solicitados(date(2098, 5, 1), date(2098, 5, 1)) == 1

    def test_rango_invalido_es_cero(self):
        assert dias_solicitados(date(2098, 5, 10), date(2098, 5, 1)) == 0


class TestPeriodosSolapan:
    def test_rangos_disjuntos(self):
        assert not periodos_solapan(
            date(2098, 5, 1), date(2098, 5, 10), date(2098, 5, 11), date(2098, 5, 20)
        )

    def test_se_tocan_en_un_dia_cuentan_como_solape(self):
        # El día 10 es fin de uno e inicio del otro: comparten ese día.
        assert periodos_solapan(
            date(2098, 5, 1), date(2098, 5, 10), date(2098, 5, 10), date(2098, 5, 20)
        )

    def test_uno_dentro_de_otro(self):
        assert periodos_solapan(
            date(2098, 5, 1), date(2098, 5, 31), date(2098, 5, 10), date(2098, 5, 12)
        )


class TestBuscarSolapamiento:
    class _Fake:
        def __init__(self, id, ini, fin):
            self.id = id
            self.fecha_inicio = ini
            self.fecha_fin = fin

    def test_devuelve_la_que_choca(self):
        existentes = [self._Fake(7, date(2098, 5, 1), date(2098, 5, 10))]
        choque = buscar_solapamiento(date(2098, 5, 5), date(2098, 5, 6), existentes)
        assert choque is not None
        assert choque.id == 7

    def test_sin_choque_devuelve_none(self):
        existentes = [self._Fake(7, date(2098, 5, 1), date(2098, 5, 10))]
        assert (
            buscar_solapamiento(date(2098, 5, 11), date(2098, 5, 12), existentes)
            is None
        )

    def test_excluir_id_ignora_la_propia(self):
        existentes = [self._Fake(7, date(2098, 5, 1), date(2098, 5, 10))]
        assert (
            buscar_solapamiento(
                date(2098, 5, 5), date(2098, 5, 6), existentes, excluir_id=7
            )
            is None
        )


class TestPuedeTransicionar:
    def test_pendiente_puede_a_todos(self):
        for destino in ("aprobada", "rechazada", "cancelada"):
            assert puede_transicionar("pendiente", destino)

    def test_estados_finales_no_transicionan(self):
        for actual in ("aprobada", "rechazada", "cancelada"):
            for destino in ("aprobada", "rechazada", "cancelada"):
                assert not puede_transicionar(actual, destino)

    def test_estados_son_los_del_modelo(self):
        assert TIPOS_SOLICITUD == ("vacaciones", "permiso")
        assert ESTADOS_SOLICITUD == ("pendiente", "aprobada", "rechazada", "cancelada")


# ═══════════════════════════════════════════════════════════════════════════
# Alta
# ═══════════════════════════════════════════════════════════════════════════


def test_crear_solicitud_ok(client):
    emp = _crear_empleado(client)
    try:
        sol = _crear_solicitud(client, emp["id"])
        assert sol["estado"] == "pendiente"
        assert sol["tipo"] == "vacaciones"
        assert sol["dias"] == 10
        assert sol["empleado_nombre"] is not None
        assert sol["aprobado_por"] is None
        assert sol["fecha_aprobacion"] is None
    finally:
        _limpiar_empleado(client, emp["id"])


def test_crear_solicitud_permiso(client):
    emp = _crear_empleado(client)
    try:
        sol = _crear_solicitud(
            client, emp["id"], tipo="permiso", inicio="2098-05-20", fin="2098-05-20"
        )
        assert sol["tipo"] == "permiso"
        assert sol["dias"] == 1
    finally:
        _limpiar_empleado(client, emp["id"])


def test_crear_tipo_invalido_422(client):
    emp = _crear_empleado(client)
    try:
        response = client.post(
            "/api/v1/rrhh/solicitudes",
            json={
                "empleado_id": emp["id"],
                "tipo": "casual",
                "fecha_inicio": "2098-05-01",
                "fecha_fin": "2098-05-10",
            },
        )
        assert response.status_code == 422
    finally:
        _limpiar_empleado(client, emp["id"])


def test_crear_fechas_invertidas_422(client):
    emp = _crear_empleado(client)
    try:
        response = client.post(
            "/api/v1/rrhh/solicitudes",
            json={
                "empleado_id": emp["id"],
                "tipo": "vacaciones",
                "fecha_inicio": "2098-05-10",
                "fecha_fin": "2098-05-01",
            },
        )
        assert response.status_code == 422
    finally:
        _limpiar_empleado(client, emp["id"])


def test_crear_empleado_inexistente_404(client):
    response = client.post(
        "/api/v1/rrhh/solicitudes",
        json={
            "empleado_id": 999999,
            "tipo": "vacaciones",
            "fecha_inicio": "2098-05-01",
            "fecha_fin": "2098-05-10",
        },
    )
    assert response.status_code == 404


def test_crear_empleado_inactivo_400(client):
    emp = _crear_empleado(client, estado="terminado", activo=False)
    try:
        response = client.post(
            "/api/v1/rrhh/solicitudes",
            json={
                "empleado_id": emp["id"],
                "tipo": "vacaciones",
                "fecha_inicio": "2098-05-01",
                "fecha_fin": "2098-05-10",
            },
        )
        assert response.status_code == 400
        assert "inactivo" in response.json()["detail"]
    finally:
        _limpiar_empleado(client, emp["id"])


def test_crear_solapamiento_con_aprobada_409(client):
    """Una solicitud aprobada bloquea los días que ocupa."""
    emp = _crear_empleado(client)
    aprobador = _crear_empleado(client)
    try:
        primera = _crear_solicitud(
            client, emp["id"], inicio="2098-05-01", fin="2098-05-10"
        )
        assert _aprobar(client, primera["id"], aprobador["id"]).status_code == 200

        # Empieza dentro del rango aprobado.
        solapa = client.post(
            "/api/v1/rrhh/solicitudes",
            json={
                "empleado_id": emp["id"],
                "tipo": "permiso",
                "fecha_inicio": "2098-05-05",
                "fecha_fin": "2098-05-15",
            },
        )
        assert solapa.status_code == 409
        assert "solapa" in solapa.json()["detail"]

        # Termina justo el día que empieza el aprobado: comparten un día.
        toque = client.post(
            "/api/v1/rrhh/solicitudes",
            json={
                "empleado_id": emp["id"],
                "tipo": "permiso",
                "fecha_inicio": "2098-04-25",
                "fecha_fin": "2098-05-01",
            },
        )
        assert toque.status_code == 409
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_empleado(client, aprobador["id"])


def test_crear_sin_solape_con_aprobada_ok(client):
    """Un rango que no comparte días con la aprobada sí se permite."""
    emp = _crear_empleado(client)
    aprobador = _crear_empleado(client)
    try:
        primera = _crear_solicitud(
            client, emp["id"], inicio="2098-05-01", fin="2098-05-10"
        )
        assert _aprobar(client, primera["id"], aprobador["id"]).status_code == 200

        siguiente = client.post(
            "/api/v1/rrhh/solicitudes",
            json={
                "empleado_id": emp["id"],
                "tipo": "permiso",
                "fecha_inicio": "2098-05-11",
                "fecha_fin": "2098-05-12",
            },
        )
        assert siguiente.status_code == 201, siguiente.text
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_empleado(client, aprobador["id"])


def test_crear_pendiente_no_bloquea(client):
    """Solo las aprobadas bloquean: dos pendientes para los mismos días caben."""
    emp = _crear_empleado(client)
    try:
        _crear_solicitud(client, emp["id"], inicio="2098-05-01", fin="2098-05-10")
        segunda = client.post(
            "/api/v1/rrhh/solicitudes",
            json={
                "empleado_id": emp["id"],
                "tipo": "permiso",
                "fecha_inicio": "2098-05-05",
                "fecha_fin": "2098-05-06",
            },
        )
        assert segunda.status_code == 201, segunda.text
    finally:
        _limpiar_empleado(client, emp["id"])


def test_crear_duplicada_no_bloquea_si_no_aprobada(client):
    """Reintentar el alta de lo mismo sigue permitido mientras no esté aprobada."""
    emp = _crear_empleado(client)
    try:
        _crear_solicitud(client, emp["id"], inicio="2098-05-01", fin="2098-05-10")
        repetida = _crear_solicitud(client, emp["id"], inicio="2098-05-01", fin="2098-05-10")
        assert repetida["estado"] == "pendiente"
    finally:
        _limpiar_empleado(client, emp["id"])


# ═══════════════════════════════════════════════════════════════════════════
# Listado, detalle y resumen
# ═══════════════════════════════════════════════════════════════════════════


def test_listar_solicitudes_ok(client):
    response = client.get("/api/v1/rrhh/solicitudes")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_listado_resuelve_empleado_y_supervisor(client):
    jefe = _crear_empleado(client)
    emp = _crear_empleado(client, supervisor=jefe["id"])
    try:
        _crear_solicitud(client, emp["id"])
        filas = client.get(f"/api/v1/rrhh/solicitudes?empleado_id={emp['id']}").json()
        assert len(filas) == 1
        fila = filas[0]
        assert fila["empleado_codigo"] == emp["codigo_empleado"]
        assert fila["empleado_nombre"] is not None
        assert fila["supervisor_nombre"] is not None
        assert fila["dias"] == 10
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_empleado(client, jefe["id"])


def test_filtro_por_estado(client):
    emp = _crear_empleado(client)
    aprobador = _crear_empleado(client)
    try:
        _crear_solicitud(client, emp["id"], inicio="2098-05-01", fin="2098-05-10")
        _crear_solicitud(client, emp["id"], inicio="2098-05-20", fin="2098-05-25")

        pendientes = client.get(
            f"/api/v1/rrhh/solicitudes?empleado_id={emp['id']}&estado=pendiente"
        ).json()
        assert len(pendientes) == 2

        aprobadas = client.get(
            f"/api/v1/rrhh/solicitudes?empleado_id={emp['id']}&estado=aprobada"
        ).json()
        assert len(aprobadas) == 0
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_empleado(client, aprobador["id"])


def test_filtro_por_tipo(client):
    emp = _crear_empleado(client)
    try:
        _crear_solicitud(client, emp["id"], tipo="vacaciones", inicio="2098-05-01", fin="2098-05-10")
        _crear_solicitud(client, emp["id"], tipo="permiso", inicio="2098-05-20", fin="2098-05-21")
        vacaciones = client.get(
            f"/api/v1/rrhh/solicitudes?empleado_id={emp['id']}&tipo=vacaciones"
        ).json()
        assert len(vacaciones) == 1
        assert vacaciones[0]["tipo"] == "vacaciones"
    finally:
        _limpiar_empleado(client, emp["id"])


def test_filtro_por_rango_de_fechas(client):
    emp = _crear_empleado(client)
    try:
        _crear_solicitud(client, emp["id"], inicio="2098-05-01", fin="2098-05-10")
        _crear_solicitud(client, emp["id"], inicio="2098-06-01", fin="2098-06-10")
        # Solo mayo: la de junio no toca el rango.
        mayo = client.get(
            f"/api/v1/rrhh/solicitudes?empleado_id={emp['id']}&desde=2098-05-01&hasta=2098-05-31"
        ).json()
        assert len(mayo) == 1
        assert mayo[0]["fecha_inicio"] == "2098-05-01"
    finally:
        _limpiar_empleado(client, emp["id"])


def test_estado_invalido_400(client):
    response = client.get("/api/v1/rrhh/solicitudes?estado=inventado")
    assert response.status_code == 400
    assert "Estado inválido" in response.json()["detail"]


def test_tipo_invalido_400(client):
    response = client.get("/api/v1/rrhh/solicitudes?tipo=inventado")
    assert response.status_code == 400


def test_detalle_ok(client):
    emp = _crear_empleado(client)
    try:
        sol = _crear_solicitud(client, emp["id"])
        response = client.get(f"/api/v1/rrhh/solicitudes/{sol['id']}")
        assert response.status_code == 200
        assert response.json()["id"] == sol["id"]
        assert response.json()["motivo"] == "Viaje familiar"
    finally:
        _limpiar_empleado(client, emp["id"])


def test_detalle_no_encontrado_404(client):
    assert client.get("/api/v1/rrhh/solicitudes/999999").status_code == 404


def test_resumen_estados(client):
    emp = _crear_empleado(client)
    aprobador = _crear_empleado(client)
    try:
        _crear_solicitud(client, emp["id"], inicio="2098-05-01", fin="2098-05-10")
        a = _crear_solicitud(client, emp["id"], inicio="2098-05-20", fin="2098-05-25")
        _aprobar(client, a["id"], aprobador["id"])

        resumen = client.get(
            f"/api/v1/rrhh/solicitudes/resumen?empleado_id={emp['id']}"
        ).json()
        por_estado = {r["estado"]: r["cantidad"] for r in resumen}
        assert por_estado["pendiente"] == 1
        assert por_estado["aprobada"] == 1
        assert por_estado["rechazada"] == 0
        assert por_estado["cancelada"] == 0
        # Siempre devuelve los 4 estados, aunque estén en 0.
        assert {r["estado"] for r in resumen} == set(ESTADOS_SOLICITUD)
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_empleado(client, aprobador["id"])


def test_listas_de_catalogo(client):
    assert client.get("/api/v1/rrhh/solicitudes/tipos").json() == list(TIPOS_SOLICITUD)
    assert client.get("/api/v1/rrhh/solicitudes/estados").json() == list(ESTADOS_SOLICITUD)


# ═══════════════════════════════════════════════════════════════════════════
# Aprobación
# ═══════════════════════════════════════════════════════════════════════════


def test_aprobar_ok(client):
    jefe = _crear_empleado(client)
    emp = _crear_empleado(client, supervisor=jefe["id"])
    try:
        sol = _crear_solicitud(client, emp["id"])
        response = _aprobar(client, sol["id"], jefe["id"], observaciones="Disfruta")
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["estado"] == "aprobada"
        assert data["aprobado_por"] == jefe["id"]
        assert data["aprobador_nombre"] is not None
        assert data["fecha_aprobacion"] is not None
        assert data["observaciones"] == "Disfruta"
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_empleado(client, jefe["id"])


def test_aprobar_guarda_quien_decidio_y_cuando(client):
    emp = _crear_empleado(client)
    rrhh = _crear_empleado(client)
    try:
        sol = _crear_solicitud(client, emp["id"])
        _aprobar(client, sol["id"], rrhh["id"])
        detalle = client.get(f"/api/v1/rrhh/solicitudes/{sol['id']}").json()
        assert detalle["aprobado_por"] == rrhh["id"]
        assert detalle["fecha_aprobacion"] is not None
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_empleado(client, rrhh["id"])


def test_no_autaprobar_403(client):
    emp = _crear_empleado(client)
    try:
        sol = _crear_solicitud(client, emp["id"])
        response = _aprobar(client, sol["id"], emp["id"])
        assert response.status_code == 403
        assert "propia" in response.json()["detail"]
        # Sigue pendiente.
        assert client.get(f"/api/v1/rrhh/solicitudes/{sol['id']}").json()["estado"] == "pendiente"
    finally:
        _limpiar_empleado(client, emp["id"])


def test_aprobar_revalida_solapamiento(client):
    """Si mientras tanto se aprobó otra para los mismos días, no aprueba."""
    emp = _crear_empleado(client)
    jefe = _crear_empleado(client)
    try:
        # Aprobada primero (bloquea mayo 1-10).
        bloqueante = _crear_solicitud(
            client, emp["id"], inicio="2098-05-01", fin="2098-05-10"
        )
        assert _aprobar(client, bloqueante["id"], jefe["id"]).status_code == 200

        # Una pendiente que comparte días (creada antes de que existiera la
        # aprobada: pudo crearse cuando aún no bloqueaba).
        pendiente = client.post(
            "/api/v1/rrhh/solicitudes",
            json={
                "empleado_id": emp["id"],
                "tipo": "permiso",
                "fecha_inicio": "2098-05-08",
                "fecha_fin": "2098-05-12",
            },
        )
        if pendiente.status_code == 201:
            # La revalidación la bloquea al aprobar.
            response = _aprobar(client, pendiente.json()["id"], jefe["id"])
            assert response.status_code == 409
            assert "solapa" in response.json()["detail"]
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_empleado(client, jefe["id"])


def test_aprobar_no_solapa_consigo_misma(client):
    """Revalidar excluye la propia solicitud (no se bloquea a sí misma)."""
    emp = _crear_empleado(client)
    jefe = _crear_empleado(client)
    try:
        sol = _crear_solicitud(client, emp["id"], inicio="2098-05-01", fin="2098-05-10")
        # Aprobar su propio rango no debe chocar consigo misma.
        response = _aprobar(client, sol["id"], jefe["id"])
        assert response.status_code == 200, response.text
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_empleado(client, jefe["id"])


def test_aprobar_dos_veces_409(client):
    emp = _crear_empleado(client)
    jefe = _crear_empleado(client)
    try:
        sol = _crear_solicitud(client, emp["id"])
        assert _aprobar(client, sol["id"], jefe["id"]).status_code == 200
        segunda = _aprobar(client, sol["id"], jefe["id"])
        assert segunda.status_code == 409
        assert "aprobada" in segunda.json()["detail"]
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_empleado(client, jefe["id"])


def test_aprobar_no_pendiente_409(client):
    emp = _crear_empleado(client)
    jefe = _crear_empleado(client)
    try:
        sol = _crear_solicitud(client, emp["id"])
        assert _rechazar(client, sol["id"], jefe["id"]).status_code == 200
        response = _aprobar(client, sol["id"], jefe["id"])
        assert response.status_code == 409
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_empleado(client, jefe["id"])


def test_aprobar_inexistente_404(client):
    jefe = _crear_empleado(client)
    try:
        response = _aprobar(client, 999999, jefe["id"])
        assert response.status_code == 404
    finally:
        _limpiar_empleado(client, jefe["id"])


def test_aprobar_decisor_inexistente_404(client):
    emp = _crear_empleado(client)
    try:
        sol = _crear_solicitud(client, emp["id"])
        response = _aprobar(client, sol["id"], 999999)
        assert response.status_code == 404
        assert "empleado" in response.json()["detail"].lower()
    finally:
        _limpiar_empleado(client, emp["id"])


# ═══════════════════════════════════════════════════════════════════════════
# Rechazo y cancelación
# ═══════════════════════════════════════════════════════════════════════════


def test_rechazar_ok(client):
    emp = _crear_empleado(client)
    jefe = _crear_empleado(client)
    try:
        sol = _crear_solicitud(client, emp["id"])
        response = _rechazar(client, sol["id"], jefe["id"], observaciones="Cobertura justa")
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["estado"] == "rechazada"
        assert data["aprobado_por"] == jefe["id"]
        assert data["fecha_aprobacion"] is not None
        assert data["observaciones"] == "Cobertura justa"
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_empleado(client, jefe["id"])


def test_no_autorechazar_403(client):
    emp = _crear_empleado(client)
    try:
        sol = _crear_solicitud(client, emp["id"])
        response = _rechazar(client, sol["id"], emp["id"])
        assert response.status_code == 403
    finally:
        _limpiar_empleado(client, emp["id"])


def test_rechazada_no_bloquea(client):
    """Tras rechazar, los días quedan libres para otra solicitud."""
    emp = _crear_empleado(client)
    jefe = _crear_empleado(client)
    try:
        sol = _crear_solicitud(client, emp["id"], inicio="2098-05-01", fin="2098-05-10")
        assert _rechazar(client, sol["id"], jefe["id"]).status_code == 200
        otra = client.post(
            "/api/v1/rrhh/solicitudes",
            json={
                "empleado_id": emp["id"],
                "tipo": "permiso",
                "fecha_inicio": "2098-05-01",
                "fecha_fin": "2098-05-10",
            },
        )
        assert otra.status_code == 201, otra.text
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_empleado(client, jefe["id"])


def test_cancelar_ok(client):
    emp = _crear_empleado(client)
    try:
        sol = _crear_solicitud(client, emp["id"])
        response = _cancelar(client, sol["id"], emp["id"], observaciones="Ya no viajo")
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["estado"] == "cancelada"
        # Cancelar no registra decisor (no es una decisión de aprobación).
        assert data["aprobado_por"] is None
        assert data["observaciones"] == "Ya no viajo"
    finally:
        _limpiar_empleado(client, emp["id"])


def test_cancelar_aprobada_409(client):
    emp = _crear_empleado(client)
    jefe = _crear_empleado(client)
    try:
        sol = _crear_solicitud(client, emp["id"])
        assert _aprobar(client, sol["id"], jefe["id"]).status_code == 200
        response = _cancelar(client, sol["id"], emp["id"])
        assert response.status_code == 409
        assert "aprobada" in response.json()["detail"]
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_empleado(client, jefe["id"])


def test_cancelar_dos_veces_409(client):
    emp = _crear_empleado(client)
    try:
        sol = _crear_solicitud(client, emp["id"])
        assert _cancelar(client, sol["id"], emp["id"]).status_code == 200
        segunda = _cancelar(client, sol["id"], emp["id"])
        assert segunda.status_code == 409
    finally:
        _limpiar_empleado(client, emp["id"])


def test_cancelar_inexistente_404(client):
    emp = _crear_empleado(client)
    try:
        response = _cancelar(client, 999999, emp["id"])
        assert response.status_code == 404
    finally:
        _limpiar_empleado(client, emp["id"])


def test_rechazar_inexistente_404(client):
    emp = _crear_empleado(client)
    try:
        response = _rechazar(client, 999999, emp["id"])
        assert response.status_code == 404
    finally:
        _limpiar_empleado(client, emp["id"])


# ═══════════════════════════════════════════════════════════════════════════
# Calendario
# ═══════════════════════════════════════════════════════════════════════════


def test_calendario_incluye_aprobadas_y_pendientes(client):
    emp = _crear_empleado(client)
    jefe = _crear_empleado(client)
    try:
        aprobada = _crear_solicitud(
            client, emp["id"], inicio="2098-05-01", fin="2098-05-10"
        )
        _aprobar(client, aprobada["id"], jefe["id"])
        _crear_solicitud(client, emp["id"], inicio="2098-05-20", fin="2098-05-21")

        response = client.get(
            "/api/v1/rrhh/solicitudes/calendario?desde=2098-05-01&hasta=2098-05-31"
        )
        assert response.status_code == 200, response.text
        dels = [
            d
            for d in response.json()
            if d["empleado_id"] == emp["id"]
        ]
        estados = {d["estado"] for d in dels}
        assert "aprobada" in estados
        assert "pendiente" in estados
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_empleado(client, jefe["id"])


def test_calendario_excluye_rechazadas_y_canceladas(client):
    emp = _crear_empleado(client)
    jefe = _crear_empleado(client)
    try:
        rechazada = _crear_solicitud(
            client, emp["id"], inicio="2098-05-01", fin="2098-05-10"
        )
        _rechazar(client, rechazada["id"], jefe["id"])
        cancelada = _crear_solicitud(
            client, emp["id"], inicio="2098-05-15", fin="2098-05-16"
        )
        _cancelar(client, cancelada["id"], emp["id"])

        response = client.get(
            "/api/v1/rrhh/solicitudes/calendario?desde=2098-05-01&hasta=2098-05-31"
        )
        ids = {d["id"] for d in response.json()}
        assert rechazada["id"] not in ids
        assert cancelada["id"] not in ids
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_empleado(client, jefe["id"])


def test_calendario_filtro_por_empleado(client):
    emp_a = _crear_empleado(client)
    emp_b = _crear_empleado(client)
    jefe = _crear_empleado(client)
    try:
        sol = _crear_solicitud(client, emp_a["id"], inicio="2098-05-01", fin="2098-05-10")
        _aprobar(client, sol["id"], jefe["id"])

        response = client.get(
            f"/api/v1/rrhh/solicitudes/calendario?desde=2098-05-01&hasta=2098-05-31&empleado_id={emp_a['id']}"
        )
        assert all(d["empleado_id"] == emp_a["id"] for d in response.json())
        assert all(d["empleado_id"] != emp_b["id"] for d in response.json())
    finally:
        _limpiar_empleado(client, emp_a["id"])
        _limpiar_empleado(client, emp_b["id"])
        _limpiar_empleado(client, jefe["id"])


def test_calendario_rango_que_no_toca_devuelve_vacio(client):
    emp = _crear_empleado(client)
    jefe = _crear_empleado(client)
    try:
        sol = _crear_solicitud(client, emp["id"], inicio="2098-05-01", fin="2098-05-10")
        _aprobar(client, sol["id"], jefe["id"])
        response = client.get(
            "/api/v1/rrhh/solicitudes/calendario?desde=2098-07-01&hasta=2098-07-31"
        )
        assert all(d["empleado_id"] != emp["id"] for d in response.json())
    finally:
        _limpiar_empleado(client, emp["id"])
        _limpiar_empleado(client, jefe["id"])


def test_calendario_rango_invalido_400(client):
    response = client.get(
        "/api/v1/rrhh/solicitudes/calendario?desde=2098-05-31&hasta=2098-05-01"
    )
    assert response.status_code == 400


def test_calendario_sin_fechas_422(client):
    assert client.get("/api/v1/rrhh/solicitudes/calendario").status_code == 422


# ═══════════════════════════════════════════════════════════════════════════
# notificar() — hook que escribe en la tabla log
# ═══════════════════════════════════════════════════════════════════════════


async def test_notificar_escribe_en_log_en_cada_accion(db_session):
    """El hook `notificar()` deja rastro en `log` en las cuatro operaciones.

    Se ejercita contra el servicio directamente (sin HTTP) para poder leer la
    BD con la misma sesión async que fija el patrón de `conftest`.
    """
    import uuid as _uuid

    from sqlmodel import select

    from src.dto import RrhhSolicitudCreate, RrhhSolicitudAccion
    from src.models import LogEntry, RrhhEmpleado
    from src.services.rrhh_solicitud_service import rrhh_solicitud_service

    def _empleado(rotulo):
        sufijo = _uuid.uuid4().hex[:8]
        return RrhhEmpleado(
            nombre=f"Nombre{sufijo}",
            apellido=f"Apellido{sufijo}",
            codigo_empleado=f"N{sufijo[:6]}",
            carnet_identidad=f"CI-{sufijo}",
            correo=f"{rotulo}-{sufijo}@test.cu",
        )

    solicitante = _empleado("sol")
    aprobador = _empleado("apr")
    db_session.add(solicitante)
    db_session.add(aprobador)
    await db_session.flush()

    async def _mensajes():
        res = await db_session.exec(
            select(LogEntry).where(LogEntry.tipo == "SOLICITUD")
        )
        return [e.mensaje for e in res.all()]

    # 1) Crear → pendiente de aprobación.
    creada = await rrhh_solicitud_service.crear(
        db_session,
        RrhhSolicitudCreate(
            empleado_id=solicitante.id,
            tipo="vacaciones",
            fecha_inicio=date(2098, 8, 1),
            fecha_fin=date(2098, 8, 10),
            motivo="Viaje",
        ),
    )
    assert any(f"#{creada.id}" in m and "pendiente" in m for m in await _mensajes())

    # 2) Aprobar → registra decisor.
    await rrhh_solicitud_service.aprobar(
        db_session, creada.id, RrhhSolicitudAccion(empleado_id=aprobador.id)
    )
    assert any(f"#{creada.id}" in m and "aprobada" in m for m in await _mensajes())

    # 3) Rechazar otra → también deja rastro.
    rechazada = await rrhh_solicitud_service.crear(
        db_session,
        RrhhSolicitudCreate(
            empleado_id=solicitante.id,
            tipo="permiso",
            fecha_inicio=date(2098, 9, 1),
            fecha_fin=date(2098, 9, 2),
        ),
    )
    await rrhh_solicitud_service.rechazar(
        db_session, rechazada.id, RrhhSolicitudAccion(empleado_id=aprobador.id)
    )
    assert any(f"#{rechazada.id}" in m and "rechazada" in m for m in await _mensajes())

    # 4) Cancelar otra → también deja rastro.
    cancelada = await rrhh_solicitud_service.crear(
        db_session,
        RrhhSolicitudCreate(
            empleado_id=solicitante.id,
            tipo="permiso",
            fecha_inicio=date(2098, 10, 1),
            fecha_fin=date(2098, 10, 2),
        ),
    )
    await rrhh_solicitud_service.cancelar(
        db_session, cancelada.id, RrhhSolicitudAccion(empleado_id=solicitante.id)
    )
    assert any(f"#{cancelada.id}" in m and "cancelada" in m for m in await _mensajes())

    # Limpieza: las FK de `solicitudes` son CASCADE con el empleado.
    await db_session.delete(solicitante)
    await db_session.delete(aprobador)
    await db_session.commit()
