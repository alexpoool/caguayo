"""Tests de la Fase 8 (v2 — «Evaluaciones v2») del módulo RRHH.

Rediseño: la evaluación se compone **solo de objetivos** seleccionados en la
relación N:M `evaluaciones_objetivos` (peso, estrellas 0–5, valoración y
recomendaciones); su nota es el **promedio ponderado** 0–5
(Σ estrellas×peso / Σ pesos de las filas puntuadas), persistido en
`evaluaciones.promedio_objetivos`. Desaparecen `metas`, los 4 criterios y la
escala de `calificaciones`; los objetivos tienen periodo obligatorio y peso
fijo que se copia al seleccionarlos.

Usan el patrón `client` de conftest.py (TestClient contra la BD real).

Cada test crea su propio empleado, usa periodos en **2098-06** (libre de las
demás fases) y al final limpia: al borrar de verdad el empleado se van sus
evaluaciones, sus objetivos y las filas del N:M (todas las FK son
`CASCADE`), así que los asertos nunca cuentan filas globales.
"""

import uuid
from datetime import date
from decimal import Decimal

from src.domain.rrhh_evaluacion_calc import (
    ESTRELLAS_MAX,
    promedio_ponderado,
    solapa_fechas,
    validar_fechas,
)

BASE = "/api/v1/rrhh/evaluaciones"
OBJETIVOS = "/api/v1/rrhh/objetivos"
TIPOS_EVAL = "/api/v1/rrhh/catalogos/tipos-evaluacion"

# Periodo por defecto de los objetivos de prueba (solapa el de las
# evaluaciones por defecto).
JUNIO = ("2098-06-01", "2098-06-30")
JULIO = ("2098-07-01", "2098-07-31")


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


def _crear_evaluacion(client, empleado_id, **kwargs):
    payload = {
        "empleado_id": empleado_id,
        "periodo": "2098-06",
        "tipo_evaluacion_id": _tipo_id(client, "Formal"),
        "inicio_periodo": JUNIO[0],
        "fin_periodo": JUNIO[1],
    }
    payload.update(kwargs)
    response = client.post(BASE, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def _crear_objetivo(client, empleado_id, **kwargs):
    payload = {
        "empleado_id": empleado_id,
        "nombre": f"Objetivo {_sufijo()}",
        "periodo_inicio": JUNIO[0],
        "periodo_fin": JUNIO[1],
    }
    payload.update(kwargs)
    response = client.post(OBJETIVOS, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def _seleccionar(client, evaluacion_id, objetivo_ids):
    """Adjunta objetivos a la evaluación (solo `borrador`)."""
    response = client.post(
        f"{BASE}/{evaluacion_id}/objetivos",
        json={"objetivo_ids": objetivo_ids},
    )
    assert response.status_code == 201, response.text
    return response.json()


def _puntuar(client, evaluacion_id, fila_id, **kwargs):
    """Puntúa/ajusta una fila seleccionada (solo `borrador`)."""
    response = client.put(
        f"{BASE}/{evaluacion_id}/objetivos/{fila_id}",
        json=kwargs,
    )
    assert response.status_code == 200, response.text
    return response.json()


def _fila_de(detalle, objetivo_id):
    """La fila del detalle correspondiente a un objetivo (o None)."""
    for fila in detalle["objetivos"]:
        if fila["id_objetivo"] == objetivo_id:
            return fila
    return None


# ── Dominio (funciones puras) ───────────────────────────────────────────────


class TestDominioEvaluacion:
    def test_las_estrellas_son_cinco(self):
        assert ESTRELLAS_MAX == 5

    def test_promedio_ponderado_con_pesos_distintos(self):
        # (5×3 + 4×1) / (3+1) = 4.75
        assert promedio_ponderado([(5, 3), (4, 1)]) == Decimal("4.75")

    def test_promedio_ponderado_pesos_iguales_es_la_media(self):
        assert promedio_ponderado([(4, 1), (2, 1)]) == Decimal("3.00")

    def test_promedio_ponderado_ignora_filas_sin_puntuar(self):
        # La fila sin estrellas no aporta ni pesa: (5×1 + 3×1)/(1+1) = 4.
        assert promedio_ponderado([(5, 1), (None, 2), (3, 1)]) == Decimal("4.00")

    def test_promedio_ponderado_sin_puntuadas_devuelve_none(self):
        assert promedio_ponderado([]) is None
        assert promedio_ponderado([(None, 1), (None, 5)]) is None

    def test_promedio_ponderado_redondea_a_dos_decimales(self):
        # 10/3 = 3.333… → 3.33 (medio hacia arriba).
        assert promedio_ponderado([(3, 2), (4, 1)]) == Decimal("3.33")
        assert promedio_ponderado([(1, 1), (2, 1), (2, 1)]) == Decimal("1.67")

    def test_promedio_ponderado_maximo_y_cero(self):
        assert promedio_ponderado([(5, 2), (5, 3)]) == Decimal("5.00")
        assert promedio_ponderado([(0, 1), (4, 1)]) == Decimal("2.00")

    def test_promedio_ponderado_acepta_decimales(self):
        assert promedio_ponderado([(Decimal("4.50"), Decimal("1.00"))]) == Decimal(
            "4.50"
        )

    def test_solapa_fechas(self):
        junio = (date(2098, 6, 1), date(2098, 6, 30))
        julio = (date(2098, 7, 1), date(2098, 7, 31))

        # Solape completo, solape a medias y extremos abiertos (defensivo).
        assert solapa_fechas(*junio, *junio)
        assert solapa_fechas(date(2098, 6, 15), date(2098, 7, 5), *junio)
        assert solapa_fechas(date(2098, 6, 15), None, *junio)
        # Fuera de rango.
        assert not solapa_fechas(*julio, *junio)
        assert not solapa_fechas(date(2098, 5, 1), date(2098, 5, 31), *junio)

    def test_validar_fechas(self):
        assert validar_fechas(date(2098, 6, 1), date(2098, 6, 30)) is None
        assert validar_fechas(date(2098, 6, 1), date(2098, 6, 1)) is None
        assert validar_fechas(date(2098, 6, 30), date(2098, 6, 1)) is not None


# ── Ciclo de vida de la evaluación ──────────────────────────────────────────


class TestCicloEvaluacion:
    def test_crear_nace_en_borrador(self, client):
        empleado = _crear_empleado(client)
        try:
            data = _crear_evaluacion(client, empleado["id"])
            assert data["estado"] == "borrador"
            assert data["promedio_objetivos"] is None
            assert data["cantidad_objetivos"] == 0
            assert data["cantidad_seleccionados"] == 0
            assert data["empleado_nombre"] == (
                f"{empleado['nombre']} {empleado['apellido']}"
            )
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_crear_con_recomendaciones_y_editarlas(self, client):
        empleado = _crear_empleado(client)
        try:
            data = _crear_evaluacion(
                client,
                empleado["id"],
                comentarios="Todo bien",
                recomendaciones="Mantener el ritmo",
            )
            assert data["comentarios"] == "Todo bien"
            assert data["recomendaciones"] == "Mantener el ritmo"

            response = client.put(
                f"{BASE}/{data['id']}",
                json={"recomendaciones": "Revisar la puntualidad"},
            )
            assert response.status_code == 200, response.text
            assert response.json()["recomendaciones"] == "Revisar la puntualidad"
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

    def test_editar_y_eliminar_finalizada(self, client):
        """La finalizada es editable igual que un borrador (decisión de usuario)."""
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            client.post(f"{BASE}/{evaluacion['id']}/finalizar")

            response = client.put(
                f"{BASE}/{evaluacion['id']}", json={"comentarios": "Nuevo"}
            )
            assert response.status_code == 200, response.text
            assert response.json()["comentarios"] == "Nuevo"
            assert response.json()["estado"] == "finalizada"

            response = client.delete(f"{BASE}/{evaluacion['id']}")
            assert response.status_code == 200, response.text
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_eliminar_borrador(self, client):
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            response = client.delete(f"{BASE}/{evaluacion['id']}")
            assert response.status_code == 200, response.text

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
                json={
                    "periodo": "2098-S2",
                    "comentarios": "Editada",
                    "fecha": "2098-06-15",
                },
            )
            assert response.status_code == 200, response.text
            data = response.json()
            assert data["periodo"] == "2098-S2"
            assert data["comentarios"] == "Editada"
            assert data["fecha"] == "2098-06-15"
        finally:
            _limpiar_empleado(client, empleado["id"])


# ── Validaciones de alta ────────────────────────────────────────────────────


class TestValidacionesAlta:
    def test_empleado_inexistente(self, client):
        response = client.post(
            BASE,
            json={
                "empleado_id": 99999999,
                "periodo": "2098-06",
                "inicio_periodo": JUNIO[0],
                "fin_periodo": JUNIO[1],
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
                    "inicio_periodo": JUNIO[1],
                    "fin_periodo": JUNIO[0],
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
                    "inicio_periodo": JUNIO[0],
                    "fin_periodo": JUNIO[1],
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
                    "inicio_periodo": JUNIO[0],
                    "fin_periodo": JUNIO[1],
                },
            )
            assert response.status_code == 404
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
                    "inicio_periodo": JUNIO[0],
                    "fin_periodo": JUNIO[1],
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
                    "inicio_periodo": JUNIO[0],
                    "fin_periodo": JUNIO[1],
                },
            )
            assert response.status_code == 409
            assert "ya tiene" in response.json()["detail"]
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_mismo_periodo_pero_otro_tipo_si_cabe(self, client):
        empleado = _crear_empleado(client)
        try:
            _crear_evaluacion(client, empleado["id"])
            data = _crear_evaluacion(
                client,
                empleado["id"],
                tipo_evaluacion_id=_tipo_id(client, "Autoevaluación"),
            )
            assert data["tipo_evaluacion"] == "Autoevaluación"
        finally:
            _limpiar_empleado(client, empleado["id"])


# ── Objetivos (definición en el empleado) ───────────────────────────────────


class TestObjetivos:
    def test_crear_requiere_periodo(self, client):
        empleado = _crear_empleado(client)
        try:
            # Sin periodo_inicio.
            response = client.post(
                OBJETIVOS,
                json={
                    "empleado_id": empleado["id"],
                    "nombre": "Sin fechas",
                    "periodo_fin": JUNIO[1],
                },
            )
            assert response.status_code == 422

            # Sin periodo_fin.
            response = client.post(
                OBJETIVOS,
                json={
                    "empleado_id": empleado["id"],
                    "nombre": "Sin fechas",
                    "periodo_inicio": JUNIO[0],
                },
            )
            assert response.status_code == 422
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_peso_por_defecto_y_explicito(self, client):
        """Peso = número natural 1–100 (decisión de usuario)."""
        empleado = _crear_empleado(client)
        try:
            por_defecto = _crear_objetivo(client, empleado["id"])
            assert Decimal(por_defecto["peso"]) == Decimal("1")

            con_peso = _crear_objetivo(client, empleado["id"], peso=7)
            assert Decimal(con_peso["peso"]) == Decimal("7")

            limite = _crear_objetivo(client, empleado["id"], peso=100)
            assert Decimal(limite["peso"]) == Decimal("100")
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_peso_invalido_es_422(self, client):
        """Fuera del rango natural 1–100 (0, negativo, decimal o > 100)."""
        empleado = _crear_empleado(client)
        try:
            for peso in (0, -1, 0.5, 2.5, 101, 9999):
                response = client.post(
                    OBJETIVOS,
                    json={
                        "empleado_id": empleado["id"],
                        "nombre": "Peso malo",
                        "periodo_inicio": JUNIO[0],
                        "periodo_fin": JUNIO[1],
                        "peso": peso,
                    },
                )
                assert response.status_code == 422, f"peso={peso}"
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_periodo_invertido_es_422(self, client):
        empleado = _crear_empleado(client)
        try:
            response = client.post(
                OBJETIVOS,
                json={
                    "empleado_id": empleado["id"],
                    "nombre": "Al revés",
                    "periodo_inicio": JUNIO[1],
                    "periodo_fin": JUNIO[0],
                },
            )
            assert response.status_code == 422
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_alta_requiere_empleado_valido(self, client):
        response = client.post(
            OBJETIVOS,
            json={
                "empleado_id": 99999999,
                "nombre": "Nada",
                "periodo_inicio": JUNIO[0],
                "periodo_fin": JUNIO[1],
            },
        )
        assert response.status_code == 404

        empleado = _crear_empleado(client)
        try:
            client.put(
                f"/api/v1/rrhh/empleados/{empleado['id']}", json={"activo": False}
            )
            response = client.post(
                OBJETIVOS,
                json={
                    "empleado_id": empleado["id"],
                    "nombre": "De inactivo",
                    "periodo_inicio": JUNIO[0],
                    "periodo_fin": JUNIO[1],
                },
            )
            assert response.status_code == 400
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_editar_y_eliminar_objetivo(self, client):
        empleado = _crear_empleado(client)
        try:
            objetivo = _crear_objetivo(client, empleado["id"])

            response = client.put(
                f"{OBJETIVOS}/{objetivo['id_objetivos']}",
                json={
                    "nombre": "Renombrado",
                    "peso": 4,
                    "periodo_inicio": "2098-06-15",
                },
            )
            assert response.status_code == 200, response.text
            data = response.json()
            assert data["nombre"] == "Renombrado"
            assert Decimal(data["peso"]) == Decimal("4")
            assert data["periodo_inicio"] == "2098-06-15"

            response = client.delete(f"{OBJETIVOS}/{objetivo['id_objetivos']}")
            assert response.status_code == 200, response.text
            response = client.get(f"{OBJETIVOS}/{objetivo['id_objetivos']}")
            assert response.status_code == 404
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_get_detalle_incluye_al_empleado(self, client):
        empleado = _crear_empleado(client)
        try:
            objetivo = _crear_objetivo(client, empleado["id"])
            response = client.get(f"{OBJETIVOS}/{objetivo['id_objetivos']}")
            assert response.status_code == 200, response.text
            data = response.json()
            assert data["empleado_nombre"] == (
                f"{empleado['nombre']} {empleado['apellido']}"
            )
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_listar_por_empleado(self, client):
        empleado = _crear_empleado(client)
        otro = _crear_empleado(client)
        try:
            _crear_objetivo(client, empleado["id"])
            _crear_objetivo(client, empleado["id"])
            _crear_objetivo(client, otro["id"])

            response = client.get(OBJETIVOS, params={"empleado_id": empleado["id"]})
            assert response.status_code == 200, response.text
            filas = response.json()
            assert len(filas) == 2
            assert {f["empleado_id"] for f in filas} == {empleado["id"]}
        finally:
            _limpiar_empleado(client, empleado["id"])
            _limpiar_empleado(client, otro["id"])


# ── Selección de objetivos (N:M) ────────────────────────────────────────────


class TestSeleccionObjetivos:
    def test_seleccionar_copia_el_peso(self, client):
        empleado = _crear_empleado(client)
        try:
            objetivo = _crear_objetivo(client, empleado["id"], peso=3)
            evaluacion = _crear_evaluacion(client, empleado["id"])

            detalle = _seleccionar(client, evaluacion["id"], [objetivo["id_objetivos"]])
            fila = _fila_de(detalle, objetivo["id_objetivos"])
            assert fila["seleccionado"] is True
            assert fila["fila_id"] is not None
            assert Decimal(fila["peso"]) == Decimal("3")
            assert Decimal(fila["peso_objetivo"]) == Decimal("3")
            assert fila["resultado"] is None
            assert detalle["cantidad_seleccionados"] == 1
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_detalle_lista_alcance_y_seleccionados(self, client):
        empleado = _crear_empleado(client)
        try:
            elegido = _crear_objetivo(client, empleado["id"])
            otro = _crear_objetivo(client, empleado["id"])
            _crear_objetivo(
                client, empleado["id"], periodo_inicio=JULIO[0], periodo_fin=JULIO[1]
            )
            evaluacion = _crear_evaluacion(client, empleado["id"])
            _seleccionar(client, evaluacion["id"], [elegido["id_objetivos"]])

            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            # Solo los dos de junio están en alcance; el de julio ni aparece.
            assert {f["id_objetivo"] for f in detalle["objetivos"]} == {
                elegido["id_objetivos"],
                otro["id_objetivos"],
            }
            assert _fila_de(detalle, elegido["id_objetivos"])["seleccionado"] is True
            assert _fila_de(detalle, otro["id_objetivos"])["seleccionado"] is False
            assert detalle["cantidad_objetivos"] == 2
            assert detalle["cantidad_seleccionados"] == 1
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_no_seleccionar_fuera_de_rango(self, client):
        empleado = _crear_empleado(client)
        try:
            objetivo = _crear_objetivo(
                client, empleado["id"], periodo_inicio=JULIO[0], periodo_fin=JULIO[1]
            )
            evaluacion = _crear_evaluacion(client, empleado["id"])

            response = client.post(
                f"{BASE}/{evaluacion['id']}/objetivos",
                json={"objetivo_ids": [objetivo["id_objetivos"]]},
            )
            assert response.status_code == 400
            assert "periodo" in response.json()["detail"]
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_objetivo_solapante_si_entra(self, client):
        empleado = _crear_empleado(client)
        try:
            # 15 de junio a 15 de julio: solapa el periodo de la evaluación.
            objetivo = _crear_objetivo(
                client,
                empleado["id"],
                periodo_inicio="2098-06-15",
                periodo_fin=JULIO[1],
            )
            evaluacion = _crear_evaluacion(client, empleado["id"])
            detalle = _seleccionar(client, evaluacion["id"], [objetivo["id_objetivos"]])
            assert _fila_de(detalle, objetivo["id_objetivos"])["seleccionado"] is True
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_no_seleccionar_de_otro_empleado(self, client):
        empleado = _crear_empleado(client)
        otro = _crear_empleado(client)
        try:
            ajeno = _crear_objetivo(client, otro["id"])
            evaluacion = _crear_evaluacion(client, empleado["id"])

            response = client.post(
                f"{BASE}/{evaluacion['id']}/objetivos",
                json={"objetivo_ids": [ajeno["id_objetivos"]]},
            )
            assert response.status_code == 400
            assert "empleado" in response.json()["detail"]
        finally:
            _limpiar_empleado(client, empleado["id"])
            _limpiar_empleado(client, otro["id"])

    def test_objetivo_inexistente_es_404(self, client):
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            response = client.post(
                f"{BASE}/{evaluacion['id']}/objetivos",
                json={"objetivo_ids": [99999999]},
            )
            assert response.status_code == 404
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_duplicado_es_409(self, client):
        empleado = _crear_empleado(client)
        try:
            objetivo = _crear_objetivo(client, empleado["id"])
            evaluacion = _crear_evaluacion(client, empleado["id"])
            _seleccionar(client, evaluacion["id"], [objetivo["id_objetivos"]])

            response = client.post(
                f"{BASE}/{evaluacion['id']}/objetivos",
                json={"objetivo_ids": [objetivo["id_objetivos"]]},
            )
            assert response.status_code == 409
            assert "seleccionado" in response.json()["detail"]
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_seleccionar_en_finalizada(self, client):
        """La selección no se bloquea al finalizar (estado informativo)."""
        empleado = _crear_empleado(client)
        try:
            objetivo = _crear_objetivo(client, empleado["id"])
            evaluacion = _crear_evaluacion(client, empleado["id"])
            client.post(f"{BASE}/{evaluacion['id']}/finalizar")

            response = client.post(
                f"{BASE}/{evaluacion['id']}/objetivos",
                json={"objetivo_ids": [objetivo["id_objetivos"]]},
            )
            assert response.status_code == 201, response.text
            detalle = response.json()
            assert detalle["estado"] == "finalizada"
            assert detalle["cantidad_seleccionados"] == 1
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_seleccionado_fuera_de_rango_sigue_visible(self, client):
        """Cambiar el periodo del objetivo no arrastra la fila elegida: sigue
        contando en el promedio y por tanto sigue visible en el detalle."""
        empleado = _crear_empleado(client)
        try:
            objetivo = _crear_objetivo(client, empleado["id"], peso=2)
            evaluacion = _crear_evaluacion(client, empleado["id"])
            _seleccionar(client, evaluacion["id"], [objetivo["id_objetivos"]])
            _puntuar(
                client,
                evaluacion["id"],
                _fila_de(
                    client.get(f"{BASE}/{evaluacion['id']}").json(),
                    objetivo["id_objetivos"],
                )["fila_id"],
                resultado=4,
            )

            # El objetivo pasa a julio: sale del alcance de junio.
            client.put(
                f"{OBJETIVOS}/{objetivo['id_objetivos']}",
                json={"periodo_inicio": JULIO[0], "periodo_fin": JULIO[1]},
            )

            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            fila = _fila_de(detalle, objetivo["id_objetivos"])
            assert fila is not None
            assert fila["seleccionado"] is True
            assert fila["resultado"] == 4
            assert Decimal(detalle["promedio_objetivos"]) == Decimal("4.00")
        finally:
            _limpiar_empleado(client, empleado["id"])


# ── Puntuación y promedio ponderado ─────────────────────────────────────────


class TestPuntuacion:
    def test_puntuar_recalcula_el_promedio_ponderado(self, client):
        empleado = _crear_empleado(client)
        try:
            pesado = _crear_objetivo(client, empleado["id"], peso=3)
            ligero = _crear_objetivo(client, empleado["id"], peso=1)
            evaluacion = _crear_evaluacion(client, empleado["id"])
            _seleccionar(
                client,
                evaluacion["id"],
                [pesado["id_objetivos"], ligero["id_objetivos"]],
            )
            filas = {
                f["id_objetivo"]: f
                for f in client.get(f"{BASE}/{evaluacion['id']}").json()["objetivos"]
            }

            # Solo el pesado puntuado: su promedio es su propia nota.
            _puntuar(
                client,
                evaluacion["id"],
                filas[pesado["id_objetivos"]]["fila_id"],
                resultado=5,
            )
            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert Decimal(detalle["promedio_objetivos"]) == Decimal("5.00")

            # (5×3 + 4×1) / 4 = 4.75
            _puntuar(
                client,
                evaluacion["id"],
                filas[ligero["id_objetivos"]]["fila_id"],
                resultado=4,
            )
            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert Decimal(detalle["promedio_objetivos"]) == Decimal("4.75")
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_peso_ajustado_por_fila_entra_en_la_formula(self, client):
        empleado = _crear_empleado(client)
        try:
            a = _crear_objetivo(client, empleado["id"], peso=1)
            b = _crear_objetivo(client, empleado["id"], peso=1)
            evaluacion = _crear_evaluacion(client, empleado["id"])
            _seleccionar(
                client, evaluacion["id"], [a["id_objetivos"], b["id_objetivos"]]
            )
            filas = {
                f["id_objetivo"]: f
                for f in client.get(f"{BASE}/{evaluacion['id']}").json()["objetivos"]
            }

            _puntuar(
                client,
                evaluacion["id"],
                filas[a["id_objetivos"]]["fila_id"],
                resultado=5,
            )
            # La evaluación ajusta el peso de la fila b a 3: (5×1 + 3×3)/4 = 3.5
            _puntuar(
                client,
                evaluacion["id"],
                filas[b["id_objetivos"]]["fila_id"],
                resultado=3,
                peso=3,
            )
            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert Decimal(detalle["promedio_objetivos"]) == Decimal("3.50")
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_promedio_ignora_filas_sin_puntuar(self, client):
        empleado = _crear_empleado(client)
        try:
            puntuado = _crear_objetivo(client, empleado["id"], peso=2)
            sin_puntuar = _crear_objetivo(client, empleado["id"], peso=9)
            evaluacion = _crear_evaluacion(client, empleado["id"])
            _seleccionar(
                client,
                evaluacion["id"],
                [puntuado["id_objetivos"], sin_puntuar["id_objetivos"]],
            )
            filas = {
                f["id_objetivo"]: f
                for f in client.get(f"{BASE}/{evaluacion['id']}").json()["objetivos"]
            }
            _puntuar(
                client,
                evaluacion["id"],
                filas[puntuado["id_objetivos"]]["fila_id"],
                resultado=4,
            )

            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            # La fila sin estrellas no aporta ni pesa.
            assert Decimal(detalle["promedio_objetivos"]) == Decimal("4.00")
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_estrellas_fuera_de_rango_es_422(self, client):
        empleado = _crear_empleado(client)
        try:
            objetivo = _crear_objetivo(client, empleado["id"])
            evaluacion = _crear_evaluacion(client, empleado["id"])
            _seleccionar(client, evaluacion["id"], [objetivo["id_objetivos"]])
            fila = _fila_de(
                client.get(f"{BASE}/{evaluacion['id']}").json(),
                objetivo["id_objetivos"],
            )

            for estrellas in (6, -1):
                response = client.put(
                    f"{BASE}/{evaluacion['id']}/objetivos/{fila['fila_id']}",
                    json={"resultado": estrellas},
                )
                assert response.status_code == 422, f"estrellas={estrellas}"
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_peso_invalido_en_fila_es_422(self, client):
        """La fila también exige entero 1–100 (mismo límite que el objetivo)."""
        empleado = _crear_empleado(client)
        try:
            objetivo = _crear_objetivo(client, empleado["id"])
            evaluacion = _crear_evaluacion(client, empleado["id"])
            _seleccionar(client, evaluacion["id"], [objetivo["id_objetivos"]])
            fila = _fila_de(
                client.get(f"{BASE}/{evaluacion['id']}").json(),
                objetivo["id_objetivos"],
            )
            for peso in (0, -1, 0.5, 101):
                response = client.put(
                    f"{BASE}/{evaluacion['id']}/objetivos/{fila['fila_id']}",
                    json={"peso": peso},
                )
                assert response.status_code == 422, f"peso={peso}"
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_valoracion_y_recomendaciones_de_fila(self, client):
        empleado = _crear_empleado(client)
        try:
            objetivo = _crear_objetivo(client, empleado["id"])
            evaluacion = _crear_evaluacion(client, empleado["id"])
            _seleccionar(client, evaluacion["id"], [objetivo["id_objetivos"]])
            fila = _fila_de(
                client.get(f"{BASE}/{evaluacion['id']}").json(),
                objetivo["id_objetivos"],
            )

            _puntuar(
                client,
                evaluacion["id"],
                fila["fila_id"],
                resultado=3,
                valoracion="Cumplió parcialmente",
                recomendaciones="Falta documentar los procesos",
            )
            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            fila = _fila_de(detalle, objetivo["id_objetivos"])
            assert fila["valoracion"] == "Cumplió parcialmente"
            assert fila["recomendaciones"] == "Falta documentar los procesos"
            # Y el texto de la evaluación en general.
            client.put(
                f"{BASE}/{evaluacion['id']}",
                json={"recomendaciones": "Plan de mejora trimestral"},
            )
            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert detalle["recomendaciones"] == "Plan de mejora trimestral"
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_quitar_fila_recalcula(self, client):
        empleado = _crear_empleado(client)
        try:
            alto = _crear_objetivo(client, empleado["id"], peso=1)
            bajo = _crear_objetivo(client, empleado["id"], peso=1)
            evaluacion = _crear_evaluacion(client, empleado["id"])
            _seleccionar(
                client, evaluacion["id"], [alto["id_objetivos"], bajo["id_objetivos"]]
            )
            filas = {
                f["id_objetivo"]: f
                for f in client.get(f"{BASE}/{evaluacion['id']}").json()["objetivos"]
            }
            _puntuar(
                client,
                evaluacion["id"],
                filas[alto["id_objetivos"]]["fila_id"],
                resultado=5,
            )
            _puntuar(
                client,
                evaluacion["id"],
                filas[bajo["id_objetivos"]]["fila_id"],
                resultado=1,
            )
            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert Decimal(detalle["promedio_objetivos"]) == Decimal("3.00")

            response = client.delete(
                f"{BASE}/{evaluacion['id']}/objetivos/{filas[bajo['id_objetivos']]['fila_id']}"
            )
            assert response.status_code == 200, response.text

            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert Decimal(detalle["promedio_objetivos"]) == Decimal("5.00")
            assert detalle["cantidad_seleccionados"] == 1
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_finalizar_calcula_y_sigue_editable(self, client):
        """Finalizar sella el estado pero no bloquea nada: se sigue editando."""
        empleado = _crear_empleado(client)
        try:
            objetivo = _crear_objetivo(client, empleado["id"], peso=2)
            evaluacion = _crear_evaluacion(client, empleado["id"])
            _seleccionar(client, evaluacion["id"], [objetivo["id_objetivos"]])
            fila = _fila_de(
                client.get(f"{BASE}/{evaluacion['id']}").json(),
                objetivo["id_objetivos"],
            )
            _puntuar(client, evaluacion["id"], fila["fila_id"], resultado=5)

            response = client.post(f"{BASE}/{evaluacion['id']}/finalizar")
            assert response.status_code == 200, response.text
            assert Decimal(response.json()["promedio_objetivos"]) == Decimal("5.00")

            # Sigue siendo editable: cambiar estrellas recalcula en finalizada.
            response = client.put(
                f"{BASE}/{evaluacion['id']}/objetivos/{fila['fila_id']}",
                json={"resultado": 1},
            )
            assert response.status_code == 200, response.text
            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert detalle["estado"] == "finalizada"
            assert Decimal(detalle["promedio_objetivos"]) == Decimal("1.00")

            # Y también se puede quitar la fila (sin puntuadas → NULL).
            response = client.delete(
                f"{BASE}/{evaluacion['id']}/objetivos/{fila['fila_id']}"
            )
            assert response.status_code == 200, response.text
            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert detalle["promedio_objetivos"] is None
            assert detalle["cantidad_seleccionados"] == 0
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_fila_de_otra_evaluacion_es_404(self, client):
        empleado = _crear_empleado(client)
        try:
            objetivo = _crear_objetivo(client, empleado["id"])
            evaluacion = _crear_evaluacion(client, empleado["id"])
            _seleccionar(client, evaluacion["id"], [objetivo["id_objetivos"]])
            fila = _fila_de(
                client.get(f"{BASE}/{evaluacion['id']}").json(),
                objetivo["id_objetivos"],
            )

            otra = _crear_evaluacion(
                client, empleado["id"], tipo_evaluacion_id=_tipo_id(client, "Final")
            )
            response = client.put(
                f"{BASE}/{otra['id']}/objetivos/{fila['fila_id']}",
                json={"resultado": 3},
            )
            assert response.status_code == 404
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_eliminar_objetivo_arrastre_y_recalculo(self, client):
        empleado = _crear_empleado(client)
        try:
            objetivo = _crear_objetivo(client, empleado["id"], peso=3)
            evaluacion = _crear_evaluacion(client, empleado["id"])
            _seleccionar(client, evaluacion["id"], [objetivo["id_objetivos"]])
            fila = _fila_de(
                client.get(f"{BASE}/{evaluacion['id']}").json(),
                objetivo["id_objetivos"],
            )
            _puntuar(client, evaluacion["id"], fila["fila_id"], resultado=4)

            response = client.delete(f"{OBJETIVOS}/{objetivo['id_objetivos']}")
            assert response.status_code == 200, response.text

            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert detalle["objetivos"] == []
            assert detalle["cantidad_seleccionados"] == 0
            assert detalle["promedio_objetivos"] is None
        finally:
            _limpiar_empleado(client, empleado["id"])


# ── Listado y reporte ───────────────────────────────────────────────────────


class TestListadoYReporte:
    def test_listar_y_filtros(self, client):
        empleado = _crear_empleado(client)
        otro = _crear_empleado(client)
        try:
            _crear_evaluacion(client, empleado["id"])
            _crear_evaluacion(
                client,
                otro["id"],
                tipo_evaluacion_id=_tipo_id(client, "Final"),
                periodo="2098-07",
                inicio_periodo=JULIO[0],
                fin_periodo=JULIO[1],
            )

            response = client.get(BASE, params={"empleado_id": empleado["id"]})
            assert response.status_code == 200, response.text
            filas = response.json()
            assert len(filas) == 1
            assert filas[0]["empleado_id"] == empleado["id"]
            assert "puntualidad" not in filas[0]

            # Rango que solo toca julio (siempre acotado al empleado: el
            # residuo de otros tests también usa 2098 y el DELETE de empleado
            # con historial es lógico).
            response = client.get(
                BASE,
                params={
                    "empleado_id": otro["id"],
                    "desde": JULIO[0],
                    "hasta": JULIO[1],
                },
            )
            assert [f["empleado_id"] for f in response.json()] == [otro["id"]]

            # Estado (acotado a los empleados de esta prueba).
            response = client.get(
                BASE, params={"empleado_id": otro["id"], "estado": "finalizada"}
            )
            assert response.json() == []
            response = client.get(BASE, params={"estado": "inventado"})
            assert response.status_code == 400
        finally:
            _limpiar_empleado(client, empleado["id"])
            _limpiar_empleado(client, otro["id"])

    def test_listado_incluye_promedio_y_conteos(self, client):
        empleado = _crear_empleado(client)
        try:
            objetivo = _crear_objetivo(client, empleado["id"], peso=2)
            _crear_objetivo(client, empleado["id"])
            evaluacion = _crear_evaluacion(client, empleado["id"])
            _seleccionar(client, evaluacion["id"], [objetivo["id_objetivos"]])
            fila = _fila_de(
                client.get(f"{BASE}/{evaluacion['id']}").json(),
                objetivo["id_objetivos"],
            )
            _puntuar(client, evaluacion["id"], fila["fila_id"], resultado=3)

            response = client.get(BASE, params={"empleado_id": empleado["id"]})
            data = response.json()[0]
            assert data["cantidad_objetivos"] == 2
            assert data["cantidad_seleccionados"] == 1
            assert Decimal(data["promedio_objetivos"]) == Decimal("3.00")
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_listado_vacio_y_404(self, client):
        response = client.get(BASE, params={"buscar": _sufijo()})
        assert response.status_code == 200
        assert response.json() == []

        response = client.get(f"{BASE}/99999999")
        assert response.status_code == 404

    def test_reporte_con_datos(self, client):
        empleado = _crear_empleado(client)
        otro = _crear_empleado(client)
        try:
            # A: finalizada con promedio 5.00.
            objetivo_a = _crear_objetivo(client, empleado["id"], peso=2)
            eval_a = _crear_evaluacion(client, empleado["id"])
            _seleccionar(client, eval_a["id"], [objetivo_a["id_objetivos"]])
            fila = _fila_de(
                client.get(f"{BASE}/{eval_a['id']}").json(),
                objetivo_a["id_objetivos"],
            )
            _puntuar(client, eval_a["id"], fila["fila_id"], resultado=5)
            client.post(f"{BASE}/{eval_a['id']}/finalizar")

            # B: borrador con promedio 3.00.
            objetivo_b = _crear_objetivo(client, otro["id"])
            eval_b = _crear_evaluacion(client, otro["id"])
            _seleccionar(client, eval_b["id"], [objetivo_b["id_objetivos"]])
            fila = _fila_de(
                client.get(f"{BASE}/{eval_b['id']}").json(),
                objetivo_b["id_objetivos"],
            )
            _puntuar(client, eval_b["id"], fila["fila_id"], resultado=3)

            # Acotado por empleado: el DELETE de empleado con historial es
            # lógico y deja residuo que contamina las consultas globales.
            response = client.get(
                f"{BASE}/reporte", params={"empleado_id": empleado["id"]}
            )
            assert response.status_code == 200, response.text
            data = response.json()
            assert data["cantidad_evaluaciones"] == 1
            assert data["cantidad_finalizadas"] == 1
            assert data["cantidad_borradores"] == 0
            assert Decimal(data["promedio_objetivos"]) == Decimal("5.00")
            assert len(data["empleados"]) == 1
            assert Decimal(data["empleados"][0]["promedio_objetivos"]) == Decimal(
                "5.00"
            )
            assert data["empleados"][0]["empleado_id"] == empleado["id"]

            response = client.get(f"{BASE}/reporte", params={"empleado_id": otro["id"]})
            data = response.json()
            assert data["cantidad_evaluaciones"] == 1
            assert data["cantidad_borradores"] == 1
            assert data["cantidad_finalizadas"] == 0
            assert Decimal(data["promedio_objetivos"]) == Decimal("3.00")
            assert data["empleados"][0]["cantidad_evaluaciones"] == 1
        finally:
            _limpiar_empleado(client, empleado["id"])
            _limpiar_empleado(client, otro["id"])

    def test_reporte_sin_datos(self, client):
        empleado = _crear_empleado(client)
        try:
            response = client.get(
                f"{BASE}/reporte", params={"empleado_id": empleado["id"]}
            )
            assert response.status_code == 200, response.text
            data = response.json()
            assert data["cantidad_evaluaciones"] == 0
            assert data["promedio_objetivos"] is None
            assert data["empleados"] == []
        finally:
            _limpiar_empleado(client, empleado["id"])
