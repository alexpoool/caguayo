"""Tests de la Fase 8 del módulo RRHH — Evaluaciones, objetivos y metas.

Usan el patrón `client` de conftest.py (TestClient contra la BD real).

Cada test crea su propio empleado y sus propias `calificaciones` (los 4
criterios son FK a ese catálogo), usa periodos en **2098-06** (libre de las
demás fases) y al final limpia: la FK de `evaluaciones.empleado_id` es
`ondelete=CASCADE`, así que las evaluaciones (y con ellas sus objetivos y
metas) se van al borrar el empleado. Las `calificaciones` se borran aparte:
su FK es `SET NULL`, así que no queda ninguna referencia colgando.
"""

import uuid
from datetime import date
from decimal import Decimal

from src.domain.rrhh_evaluacion_calc import (
    escala_a_100,
    puede_editar,
    promedio_criterios,
    promedio_objetivos,
    validar_fechas,
)

BASE = "/api/v1/rrhh/evaluaciones"
CATALOGOS = "/api/v1/rrhh/catalogos/calificaciones"
TIPOS_EVAL = "/api/v1/rrhh/catalogos/tipos-evaluacion"


def _sufijo():
    return uuid.uuid4().hex[:8]


_TIPOS_CACHE: dict = {}


def _tipo_id(client, nombre: str) -> int:
    """Id de un tipo del catálogo `tipos_evaluaciones` por su nombre visible."""
    if not _TIPOS_CACHE:
        response = client.get(TIPOS_EVAL)
        assert response.status_code == 200, response.text
        _TIPOS_CACHE.update(
            {t["nombre"]: t["id_tipos_evaluaciones"] for t in response.json()}
        )
    return _TIPOS_CACHE[nombre]


# ── Helpers ─────────────────────────────────────────────────────────────────


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


def _crear_calificacion(client, valor):
    """Crea una `calificaciones` única con el valor dado (1–5) y devuelve el id."""
    response = client.post(
        CATALOGOS,
        json={"nombre": f"EVAL-{_sufijo()}", "valor": valor},
    )
    assert response.status_code == 201, response.text
    return response.json()["id_calificaciones"]


def _limpiar_calificaciones(client, ids):
    for calif_id in ids:
        client.delete(f"{CATALOGOS}/{calif_id}")


def _crear_evaluacion(client, empleado_id, **kwargs):
    payload = {
        "empleado_id": empleado_id,
        "periodo": "2098-06",
        "tipo_evaluacion_id": _tipo_id(client, "Formal"),
        "inicio_periodo": "2098-06-01",
        "fin_periodo": "2098-06-30",
    }
    payload.update(kwargs)
    response = client.post(BASE, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def _crear_objetivo(client, evaluacion_id, **kwargs):
    payload = {"nombre": f"Objetivo {_sufijo()}"}
    payload.update(kwargs)
    response = client.post(f"{BASE}/{evaluacion_id}/objetivos", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def _crear_meta(client, objetivo_id, **kwargs):
    payload = {"nombre": f"Meta {_sufijo()}"}
    payload.update(kwargs)
    response = client.post(
        f"{BASE}/objetivos/{objetivo_id}/metas", json=payload
    )
    assert response.status_code == 201, response.text
    return response.json()


# ── Dominio (funciones puras) ───────────────────────────────────────────────


class TestDominioEvaluacion:
    def test_promedio_criterios_de_los_cuatro(self):
        assert promedio_criterios([1, 2, 3, 4]) == Decimal("2.50")

    def test_promedio_criterios_ignora_los_vacios(self):
        # Dos puntuados de cuatro: solo entran esos dos.
        assert promedio_criterios([3, None, 5, None]) == Decimal("4.00")

    def test_promedio_criterios_sin_ninguno_devuelve_none(self):
        assert promedio_criterios([None, None, None, None]) is None

    def test_promedio_criterios_redondea_a_dos_decimales(self):
        assert promedio_criterios([1, 2, 2]) == Decimal("1.67")

    def test_promedio_objetivos_convierte_a_escala_100(self):
        # valoraciones [4, 2] → media 3 → 3/5×100 = 60
        assert promedio_objetivos([4, 2]) == Decimal("60.00")

    def test_promedio_objetivos_sin_valoraciones_devuelve_none(self):
        assert promedio_objetivos([]) is None
        assert promedio_objetivos([None, None]) is None

    def test_promedio_objetivos_maximo(self):
        assert promedio_objetivos([5, 5, 5]) == Decimal("100.00")

    def test_escala_a_100(self):
        assert escala_a_100(3) == Decimal("60.00")
        assert escala_a_100(None) is None

    def test_validar_fechas(self):
        assert validar_fechas(date(2098, 6, 1), date(2098, 6, 30)) is None
        assert validar_fechas(date(2098, 6, 1), date(2098, 6, 1)) is None
        assert validar_fechas(date(2098, 6, 30), date(2098, 6, 1)) is not None

    def test_puede_editar(self):
        assert puede_editar("borrador") is True
        assert puede_editar("finalizada") is False


# ── Ciclo de vida de la evaluación ──────────────────────────────────────────


class TestCicloEvaluacion:
    def test_crear_nace_en_borrador(self, client):
        empleado = _crear_empleado(client)
        try:
            data = _crear_evaluacion(client, empleado["id"])
            assert data["estado"] == "borrador"
            assert data["promedio_criterios"] is None
            assert data["promedio_objetivos"] is None
            assert data["cantidad_objetivos"] == 0
            assert data["cantidad_metas"] == 0
            assert data["empleado_nombre"] == (
                f"{empleado['nombre']} {empleado['apellido']}"
            )
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_finalizar_pasa_a_finalizada(self, client):
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            response = client.post(f"{BASE}/{evaluacion['id']}/finalizar")
            assert response.status_code == 200, response.text
            assert response.json()["estado"] == "finalizada"

            # Finalizar dos veces es conflicto.
            response = client.post(f"{BASE}/{evaluacion['id']}/finalizar")
            assert response.status_code == 409
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_no_editar_ni_eliminar_finalizada(self, client):
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            client.post(f"{BASE}/{evaluacion['id']}/finalizar")

            response = client.put(
                f"{BASE}/{evaluacion['id']}", json={"comentarios": "Nuevo"}
            )
            assert response.status_code == 409
            assert "borrador" in response.json()["detail"]

            response = client.delete(f"{BASE}/{evaluacion['id']}")
            assert response.status_code == 409
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_eliminar_borrador(self, client):
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            response = client.delete(f"{BASE}/{evaluacion['id']}")
            assert response.status_code == 200

            response = client.get(f"{BASE}/{evaluacion['id']}")
            assert response.status_code == 404
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_editar_borrador(self, client):
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            response = client.put(
                f"{BASE}/{evaluacion['id']}",
                json={"comentarios": "Ajuste de periodo", "periodo": "2098-06B"},
            )
            assert response.status_code == 200, response.text
            assert response.json()["periodo"] == "2098-06B"
            assert response.json()["comentarios"] == "Ajuste de periodo"
        finally:
            _limpiar_empleado(client, empleado["id"])


# ── Validaciones de alta ────────────────────────────────────────────────────


class TestValidacionesAlta:
    def test_empleado_inexistente(self, client):
        response = client.post(
            BASE,
            json={
                "empleado_id": 999999,
                "periodo": "2098-06",
                "inicio_periodo": "2098-06-01",
                "fin_periodo": "2098-06-30",
            },
        )
        assert response.status_code == 404

    def test_periodo_invertido_es_422(self, client):
        empleado = _crear_empleado(client)
        try:
            response = client.post(
                BASE,
                json={
                    "empleado_id": empleado["id"],
                    "periodo": "2098-06",
                    "inicio_periodo": "2098-06-30",
                    "fin_periodo": "2098-06-01",
                },
            )
            assert response.status_code == 422
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_tipo_invalido_es_422(self, client):
        empleado = _crear_empleado(client)
        try:
            response = client.post(
                BASE,
                json={
                    "empleado_id": empleado["id"],
                    "periodo": "2098-06",
                    "tipo_evaluacion_id": "inventado",
                    "inicio_periodo": "2098-06-01",
                    "fin_periodo": "2098-06-30",
                },
            )
            assert response.status_code == 422
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_tipo_id_inexistente_es_404(self, client):
        empleado = _crear_empleado(client)
        try:
            response = client.post(
                BASE,
                json={
                    "empleado_id": empleado["id"],
                    "periodo": "2098-06",
                    "tipo_evaluacion_id": 999999,
                    "inicio_periodo": "2098-06-01",
                    "fin_periodo": "2098-06-30",
                },
            )
            assert response.status_code == 404
            assert "tipo de evaluación" in response.json()["detail"]
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_criterio_que_no_existe(self, client):
        empleado = _crear_empleado(client)
        try:
            response = client.post(
                BASE,
                json={
                    "empleado_id": empleado["id"],
                    "periodo": "2098-06",
                    "inicio_periodo": "2098-06-01",
                    "fin_periodo": "2098-06-30",
                    "puntualidad": 999999,
                },
            )
            assert response.status_code == 404
            assert "puntualidad" in response.json()["detail"]
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_empleado_inactivo_no_se_evalua(self, client):
        empleado = _crear_empleado(client)
        try:
            response = client.put(
                f"/api/v1/rrhh/empleados/{empleado['id']}", json={"activo": False}
            )
            assert response.status_code == 200, response.text

            response = client.post(
                BASE,
                json={
                    "empleado_id": empleado["id"],
                    "periodo": "2098-06",
                    "inicio_periodo": "2098-06-01",
                    "fin_periodo": "2098-06-30",
                },
            )
            assert response.status_code == 400
            assert "inactivo" in response.json()["detail"]
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_duplicada_empleado_periodo_tipo(self, client):
        empleado = _crear_empleado(client)
        try:
            _crear_evaluacion(client, empleado["id"])
            response = client.post(
                BASE,
                json={
                    "empleado_id": empleado["id"],
                    "periodo": "2098-06",
                    "tipo_evaluacion_id": _tipo_id(client, "Formal"),
                    "inicio_periodo": "2098-06-01",
                    "fin_periodo": "2098-06-30",
                },
            )
            assert response.status_code == 409
            assert "ya tiene" in response.json()["detail"]
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_mismo_periodo_pero_otro_tipo_si_cabe(self, client):
        empleado = _crear_empleado(client)
        try:
            _crear_evaluacion(
                client, empleado["id"], tipo_evaluacion_id=_tipo_id(client, "Formal")
            )
            data = _crear_evaluacion(
                client,
                empleado["id"],
                tipo_evaluacion_id=_tipo_id(client, "Autoevaluación"),
            )
            assert data["tipo_evaluacion"] == "Autoevaluación"
        finally:
            _limpiar_empleado(client, empleado["id"])


# ── Promedio de criterios (se calcula al leer) ──────────────────────────────


class TestPromedioCriterios:
    def test_promedio_de_los_cuatro_criterios(self, client):
        empleado = _crear_empleado(client)
        calificaciones = []
        try:
            valores = [1, 2, 3, 4]
            ids = []
            for valor in valores:
                calif_id = _crear_calificacion(client, valor)
                calificaciones.append(calif_id)
                ids.append(calif_id)

            data = _crear_evaluacion(
                client,
                empleado["id"],
                puntualidad=ids[0],
                productividad=ids[1],
                trabajo_equipo=ids[2],
                calidad=ids[3],
            )
            # (1+2+3+4)/4 = 2.50
            assert Decimal(data["promedio_criterios"]) == Decimal("2.50")

            detalle = client.get(f"{BASE}/{data['id']}").json()
            assert Decimal(detalle["promedio_criterios"]) == Decimal("2.50")

            # El radar trae los 4 criterios con la etiqueta y el valor resuelto.
            assert [c["etiqueta"] for c in detalle["criterios"]] == [
                "Puntualidad",
                "Productividad",
                "Trabajo en equipo",
                "Calidad",
            ]
            assert [c["valor"] for c in detalle["criterios"]] == [1, 2, 3, 4]
            assert all(c["calificacion_nombre"] for c in detalle["criterios"])
        finally:
            _limpiar_empleado(client, empleado["id"])
            _limpiar_calificaciones(client, calificaciones)

    def test_criterios_parciales(self, client):
        empleado = _crear_empleado(client)
        calificaciones = []
        try:
            uno = _crear_calificacion(client, 3)
            dos = _crear_calificacion(client, 5)
            calificaciones += [uno, dos]

            data = _crear_evaluacion(
                client, empleado["id"], puntualidad=uno, calidad=dos
            )
            # Solo dos puntuados: (3+5)/2 = 4.00
            assert Decimal(data["promedio_criterios"]) == Decimal("4.00")

            detalle = client.get(f"{BASE}/{data['id']}").json()
            # Los dos sin puntuar quedan en 0 para el radar.
            valores = {c["criterio"]: c["valor"] for c in detalle["criterios"]}
            assert valores["puntualidad"] == 3
            assert valores["calidad"] == 5
            assert valores["productividad"] == 0
            assert valores["trabajo_equipo"] == 0
        finally:
            _limpiar_empleado(client, empleado["id"])
            _limpiar_calificaciones(client, calificaciones)

    def test_criterios_sin_puntuar(self, client):
        empleado = _crear_empleado(client)
        try:
            data = _crear_evaluacion(client, empleado["id"])
            assert data["promedio_criterios"] is None

            detalle = client.get(f"{BASE}/{data['id']}").json()
            assert detalle["promedio_criterios"] is None
            assert all(c["valor"] == 0 for c in detalle["criterios"])
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_cambio_de_criterio_se_refleja_al_leer(self, client):
        empleado = _crear_empleado(client)
        calificaciones = []
        try:
            tres = _crear_calificacion(client, 3)
            cinco = _crear_calificacion(client, 5)
            calificaciones += [tres, cinco]

            data = _crear_evaluacion(client, empleado["id"], puntualidad=tres)
            assert Decimal(data["promedio_criterios"]) == Decimal("3.00")

            response = client.put(
                f"{BASE}/{data['id']}", json={"puntualidad": cinco}
            )
            assert response.status_code == 200
            assert Decimal(response.json()["promedio_criterios"]) == Decimal("5.00")
        finally:
            _limpiar_empleado(client, empleado["id"])
            _limpiar_calificaciones(client, calificaciones)


# ── Objetivos y metas anidados ──────────────────────────────────────────────


class TestObjetivosYMetas:
    def test_objetivo_y_meta_anidados(self, client):
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            objetivo = _crear_objetivo(
                client, evaluacion["id"], valoracion=4,
                resultado_objetivo="Logrado al 90%",
            )
            assert Decimal(objetivo["aporte"]) == Decimal("80.00")  # 4/5×100
            assert objetivo["metas"] == []

            meta = _crear_meta(
                client, objetivo["id_objetivos"], valoracion=2,
                resultado_meta=75,
            )
            assert meta["objetivo_id"] == objetivo["id_objetivos"]

            # promedio_objetivos = (4+2)/2 = 3 → 60.00
            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert Decimal(detalle["promedio_objetivos"]) == Decimal("60.00")
            assert Decimal(detalle["promedio_valoracion_1a5"]) == Decimal("3.00")
            assert len(detalle["objetivos"]) == 1
            assert len(detalle["objetivos"][0]["metas"]) == 1
            assert detalle["cantidad_objetivos"] == 1
            assert detalle["cantidad_metas"] == 1
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_promedio_ignora_sin_valorar(self, client):
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            # Uno valorado, otro sin valorar: solo entra el valorado.
            _crear_objetivo(client, evaluacion["id"], valoracion=5)
            _crear_objetivo(client, evaluacion["id"])  # valoracion None

            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert Decimal(detalle["promedio_objetivos"]) == Decimal("100.00")

            # Sin ninguna valoración el promedio es nulo.
            evaluacion2 = _crear_evaluacion(
                client, empleado["id"], tipo_evaluacion_id=_tipo_id(client, "Parcial")
            )
            _crear_objetivo(client, evaluacion2["id"])
            detalle2 = client.get(f"{BASE}/{evaluacion2['id']}").json()
            assert detalle2["promedio_objetivos"] is None
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_editar_y_eliminar_meta_recalcula(self, client):
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            objetivo = _crear_objetivo(client, evaluacion["id"], valoracion=5)
            meta = _crear_meta(client, objetivo["id_objetivos"], valoracion=1)

            # (5+1)/2 = 3 → 60.00
            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert Decimal(detalle["promedio_objetivos"]) == Decimal("60.00")

            # Subir la meta a 5: (5+5)/2 = 5 → 100.00
            response = client.put(
                f"{BASE}/metas/{meta['id_metas']}", json={"valoracion": 5}
            )
            assert response.status_code == 200, response.text
            assert response.json()["valoracion"] == 5

            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert Decimal(detalle["promedio_objetivos"]) == Decimal("100.00")
            assert detalle["cantidad_metas"] == 1

            # Quitar la meta: solo queda el objetivo valorado en 5 → 100.00
            response = client.delete(f"{BASE}/metas/{meta['id_metas']}")
            assert response.status_code == 200

            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert detalle["cantidad_metas"] == 0
            assert Decimal(detalle["promedio_objetivos"]) == Decimal("100.00")
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_eliminar_objetivo_arrastra_sus_metas(self, client):
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            objetivo = _crear_objetivo(client, evaluacion["id"], valoracion=4)
            _crear_meta(client, objetivo["id_objetivos"], valoracion=5)

            response = client.delete(
                f"{BASE}/objetivos/{objetivo['id_objetivos']}"
            )
            assert response.status_code == 200

            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert detalle["objetivos"] == []
            assert detalle["cantidad_objetivos"] == 0
            assert detalle["cantidad_metas"] == 0
            assert detalle["promedio_objetivos"] is None
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_valoracion_fuera_de_rango_es_422(self, client):
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])

            response = client.post(
                f"{BASE}/{evaluacion['id']}/objetivos",
                json={"nombre": "Malo", "valoracion": 6},
            )
            assert response.status_code == 422

            objetivo = _crear_objetivo(client, evaluacion["id"])
            response = client.post(
                f"{BASE}/objetivos/{objetivo['id_objetivos']}/metas",
                json={"nombre": "Mala", "valoracion": 0},
            )
            assert response.status_code == 422
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_objetivos_no_se_tocan_en_finalizada(self, client):
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            objetivo = _crear_objetivo(client, evaluacion["id"], valoracion=3)
            meta = _crear_meta(client, objetivo["id_objetivos"], valoracion=3)
            client.post(f"{BASE}/{evaluacion['id']}/finalizar")

            response = client.post(
                f"{BASE}/{evaluacion['id']}/objetivos",
                json={"nombre": "Nuevo"},
            )
            assert response.status_code == 409

            response = client.put(
                f"{BASE}/objetivos/{objetivo['id_objetivos']}",
                json={"valoracion": 5},
            )
            assert response.status_code == 409

            response = client.put(
                f"{BASE}/metas/{meta['id_metas']}", json={"valoracion": 5}
            )
            assert response.status_code == 409

            response = client.delete(f"{BASE}/objetivos/{objetivo['id_objetivos']}")
            assert response.status_code == 409

            # El promedio se congeló con lo que había al finalizar.
            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert Decimal(detalle["promedio_objetivos"]) == Decimal("60.00")
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_finalizar_recalcula_promedio(self, client):
        """Al finalizar se recalcula `promedio_objetivos` desde los hijos."""
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            objetivo = _crear_objetivo(client, evaluacion["id"], valoracion=4)
            _crear_meta(client, objetivo["id_objetivos"], valoracion=3)

            # (4+3)/2 = 3.5 → 70.00 antes de finalizar.
            antes = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert Decimal(antes["promedio_objetivos"]) == Decimal("70.00")

            response = client.post(f"{BASE}/{evaluacion['id']}/finalizar")
            assert response.status_code == 200, response.text
            assert response.json()["estado"] == "finalizada"

            despues = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert Decimal(despues["promedio_objetivos"]) == Decimal("70.00")
            assert Decimal(despues["promedio_valoracion_1a5"]) == Decimal("3.50")
        finally:
            _limpiar_empleado(client, empleado["id"])


# ── Listado y filtros ───────────────────────────────────────────────────────


class TestListado:
    def test_listar_y_filtros(self, client):
        empleado = _crear_empleado(client)
        otro = _crear_empleado(client)
        try:
            primera = _crear_evaluacion(client, empleado["id"])
            parcial = _tipo_id(client, "Parcial")
            _crear_evaluacion(client, otro["id"], tipo_evaluacion_id=parcial)

            # `limit` alto: la BD acumula residuo de tests y el límite por
            # defecto (100) truncaría el listado por orden de id ascendente.
            response = client.get(f"{BASE}?limit=1000")
            assert response.status_code == 200
            ids = {e["id"] for e in response.json()}
            assert {primera["id"]} <= ids

            response = client.get(f"{BASE}?empleado_id={empleado['id']}")
            assert response.status_code == 200
            assert {e["empleado_id"] for e in response.json()} == {empleado["id"]}

            response = client.get(f"{BASE}?tipo_evaluacion_id={parcial}")
            assert response.status_code == 200
            assert {e["tipo_evaluacion"] for e in response.json()} == {"Parcial"}

            # Un id fuera del catálogo es 400 (paridad con `tipo=<texto>`).
            response = client.get(f"{BASE}?tipo_evaluacion_id=999999")
            assert response.status_code == 400

            response = client.get(f"{BASE}?estado=no_existe")
            assert response.status_code == 400

            response = client.get(f"{BASE}?buscar={empleado['apellido']}")
            assert response.status_code == 200
            assert {e["id"] for e in response.json()} == {primera["id"]}
        finally:
            _limpiar_empleado(client, empleado["id"])
            _limpiar_empleado(client, otro["id"])

    def test_listar_incluye_conteos_y_departamento(self, client):
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            objetivo = _crear_objetivo(client, evaluacion["id"])
            _crear_meta(client, objetivo["id_objetivos"])

            response = client.get(f"{BASE}?empleado_id={empleado['id']}")
            fila = response.json()[0]
            assert fila["cantidad_objetivos"] == 1
            assert fila["cantidad_metas"] == 1
            assert fila["empleado_codigo"] == empleado["codigo_empleado"]
            assert fila["empleado_nombre"] == (
                f"{empleado['nombre']} {empleado['apellido']}"
            )
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_listado_incluye_criterios_para_el_radar(self, client):
        """La fila del listado trae los 4 criterios resueltos (columna
        «Desempeño»): valor 0 cuando el criterio aún no está puntuado."""
        empleado = _crear_empleado(client)
        calificaciones = []
        try:
            ids = [_crear_calificacion(client, v) for v in (1, 5)]
            calificaciones += ids
            evaluacion = _crear_evaluacion(
                client, empleado["id"], puntualidad=ids[0], calidad=ids[1]
            )

            response = client.get(f"{BASE}?empleado_id={empleado['id']}")
            assert response.status_code == 200
            fila = next(
                e for e in response.json() if e["id"] == evaluacion["id"]
            )
            assert [c["criterio"] for c in fila["criterios"]] == [
                "puntualidad",
                "productividad",
                "trabajo_equipo",
                "calidad",
            ]
            assert [c["valor"] for c in fila["criterios"]] == [1, 0, 0, 5]
        finally:
            _limpiar_empleado(client, empleado["id"])
            _limpiar_calificaciones(client, calificaciones)

    def test_listado_vacio(self, client):
        response = client.get(f"{BASE}?empleado_id=999999")
        assert response.status_code == 200
        assert response.json() == []

    def test_404_al_no_encontrar(self, client):
        assert client.get(f"{BASE}/999999").status_code == 404
        assert client.put(f"{BASE}/999999", json={}).status_code == 404
        assert client.delete(f"{BASE}/999999").status_code == 404
        assert client.post(f"{BASE}/999999/finalizar").status_code == 404
        assert client.post(f"{BASE}/999999/objetivos", json={"nombre": "X"}).status_code == 404
        assert client.put(f"{BASE}/objetivos/999999", json={}).status_code == 404
        assert client.delete(f"{BASE}/objetivos/999999").status_code == 404
        assert client.put(f"{BASE}/metas/999999", json={}).status_code == 404
        assert client.delete(f"{BASE}/metas/999999").status_code == 404
        assert client.post(f"{BASE}/objetivos/999999/metas", json={"nombre": "X"}).status_code == 404


# ── Sub-recurso de objetivos y reporte ──────────────────────────────────────


class TestSubRecursosYReporte:
    def test_listar_objetivos_de_la_evaluacion(self, client):
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            objetivo = _crear_objetivo(client, evaluacion["id"], valoracion=2)
            _crear_meta(client, objetivo["id_objetivos"])

            response = client.get(f"{BASE}/{evaluacion['id']}/objetivos")
            assert response.status_code == 200
            objetivos = response.json()
            assert len(objetivos) == 1
            assert objetivos[0]["id_objetivos"] == objetivo["id_objetivos"]
            assert len(objetivos[0]["metas"]) == 1
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_get_objetivo_detalle_con_metas_y_evaluacion(self, client):
        """Detalle de un objetivo: metas anidadas + resumen de la evaluación."""
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            objetivo = _crear_objetivo(
                client, evaluacion["id"], valoracion=4, resultado_objetivo="90 %"
            )
            _crear_meta(client, objetivo["id_objetivos"], valoracion=3)

            response = client.get(
                f"{BASE}/objetivos/{objetivo['id_objetivos']}"
            )
            assert response.status_code == 200, response.text
            data = response.json()
            assert data["id_objetivos"] == objetivo["id_objetivos"]
            assert data["evaluacion_id"] == evaluacion["id"]
            assert data["nombre"] == objetivo["nombre"]
            assert len(data["metas"]) == 1
            assert data["metas"][0]["valoracion"] == 3
            # Contexto para la página de metas.
            assert data["evaluacion_estado"] == "borrador"
            assert data["periodo"] == "2098-06"
            assert data["empleado_nombre"] is not None
            # Aporte del objetivo (4/5 → 80) y promedio de la evaluación.
            assert Decimal(data["aporte"]) == Decimal("80.00")
            assert data["promedio_objetivos"] is not None
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_get_objetivo_inexistente_404(self, client):
        assert client.get(f"{BASE}/objetivos/999999").status_code == 404

    def test_ruta_reporte_no_captura_get_id(self, client):
        # `/reporte` debe resolverse antes que `/{evaluacion_id}` (orden de rutas).
        response = client.get(f"{BASE}/reporte")
        assert response.status_code == 200
        assert response.json()["cantidad_evaluaciones"] >= 0
        assert "empleados" in response.json()

    def test_reporte_con_datos(self, client):
        empleado = _crear_empleado(client)
        otro = _crear_empleado(client)
        calificaciones = []
        try:
            uno = _crear_calificacion(client, 2)
            dos = _crear_calificacion(client, 4)
            calificaciones += [uno, dos]

            primera = _crear_evaluacion(
                client, empleado["id"], puntualidad=uno, productividad=dos
            )
            _crear_objetivo(client, primera["id"], valoracion=5)
            client.post(f"{BASE}/{primera['id']}/finalizar")

            _crear_evaluacion(
                client, otro["id"], tipo_evaluacion_id=_tipo_id(client, "Parcial"),
                inicio_periodo="2098-07-01", fin_periodo="2098-07-31",
            )

            # El reporte global ve también registros de otros tests (el DELETE
            # de empleados con historial es baja lógica, así que hay residuo en
            # esta BD): por eso se afirma sobre LOS empleados de esta prueba y
            # con cotas `>=`, nunca con conteos globales exactos.
            response = client.get(f"{BASE}/reporte")
            assert response.status_code == 200
            reporte = response.json()
            assert reporte["cantidad_evaluaciones"] >= 2
            assert reporte["cantidad_finalizadas"] >= 1
            por_id = {e["empleado_id"]: e for e in reporte["empleados"]}
            assert empleado["id"] in por_id
            assert otro["id"] in por_id

            # Empleado 1: criterios (2+4)/2 = 3.00, objetivos 5 → 100.00
            primero = por_id[empleado["id"]]
            assert Decimal(primero["promedio_criterios"]) == Decimal("3.00")
            assert Decimal(primero["promedio_objetivos"]) == Decimal("100.00")
            assert primero["cantidad_evaluaciones"] == 1
            assert por_id[otro["id"]]["cantidad_evaluaciones"] == 1

            # Filtro por empleado: alcance exacto, sin residuo posible.
            response = client.get(f"{BASE}/reporte?empleado_id={empleado['id']}")
            reporte = response.json()
            assert reporte["cantidad_evaluaciones"] == 1
            assert len(reporte["empleados"]) == 1

            # Filtro por rango que toca solo julio: `otro` está, con su evaluación.
            response = client.get(
                f"{BASE}/reporte?desde=2098-07-01&hasta=2098-07-31"
            )
            reporte = response.json()
            assert reporte["cantidad_evaluaciones"] >= 1
            assert reporte["cantidad_borradores"] >= 1
            julio = next(
                e for e in reporte["empleados"]
                if e["empleado_id"] == otro["id"]
            )
            assert julio["cantidad_evaluaciones"] >= 1
            assert empleado["id"] not in {
                e["empleado_id"] for e in reporte["empleados"]
            }
        finally:
            _limpiar_empleado(client, empleado["id"])
            _limpiar_empleado(client, otro["id"])
            _limpiar_calificaciones(client, calificaciones)

    def test_reporte_sin_datos(self, client):
        response = client.get(f"{BASE}/reporte?empleado_id=999999")
        assert response.status_code == 200
        reporte = response.json()
        assert reporte["cantidad_evaluaciones"] == 0
        assert reporte["cantidad_borradores"] == 0
        assert reporte["promedio_criterios"] is None
        assert reporte["promedio_objetivos"] is None
        assert reporte["empleados"] == []


# ── Catálogo de tipos de evaluación ─────────────────────────────────────────


def test_tipo_en_uso_no_se_elimina(client):
    """DELETE de un tipo en uso da baja lógica (la FK es `ON DELETE RESTRICT`)."""
    creado = client.post(
        TIPOS_EVAL,
        json={"nombre": f"EVAL-TIPO-{_sufijo()}", "descripcion": "de prueba"},
    )
    assert creado.status_code == 201, creado.text
    id_tipo = creado.json()["id_tipos_evaluaciones"]
    empleado = _crear_empleado(client)
    try:
        _crear_evaluacion(client, empleado["id"], tipo_evaluacion_id=id_tipo)

        r_del = client.delete(f"{TIPOS_EVAL}/{id_tipo}")
        assert r_del.status_code == 200
        assert r_del.json()["accion"] == "desactivado"

        r_det = client.get(f"{TIPOS_EVAL}/{id_tipo}")
        assert r_det.status_code == 200
        assert r_det.json()["activo"] is False
    finally:
        _limpiar_empleado(client, empleado["id"])
        # Con la evaluación fuera (CASCADE), ya se puede borrar de verdad.
        client.delete(f"{TIPOS_EVAL}/{id_tipo}")
