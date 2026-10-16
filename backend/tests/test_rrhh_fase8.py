"""Tests de la Fase 8 del módulo RRHH — Evaluaciones, objetivos y metas.

Usan el patrón `client` de conftest.py (TestClient contra la BD real).

Cada test crea su propio empleado y su propia **escala** en `calificaciones`
(valor 5, 10 o 100), usa periodos en **2098-06** (libre de las demás fases) y
al final limpia: al borrar de verdad el empleado se van sus evaluaciones
(FK `CASCADE`) y también sus objetivos (FK `CASCADE` desde `empleados`; si hay
historial el DELETE es baja lógica y queda residuo, que por eso los asertos
nunca cuentan filas globales). Las escalas se borran aparte: si una evaluación
sigue citándola el DELETE es 409, por eso cada test limpia a su empleado
primero.

Los criterios se puntúan con **10 estrellas** (`{criterio}_estrellas`, 0–10)
sobre la escala elegida (`escala_criterios_id`): el valor en escala de cada
criterio es estrellas/10 × escala y `promedio_criterios` es su media (ambos
se calculan al leer, no están en la BD).

Los objetivos **se definen en el empleado** (`/api/v1/rrhh/objetivos`, siempre
editables) y **se califican en la evaluación**
(`PUT /rrhh/evaluaciones/{id}/metas/{meta_id}/valoracion`, solo `borrador`).
"""

import uuid
from datetime import date
from decimal import Decimal

from src.domain.rrhh_evaluacion_calc import (
    escala_a_100,
    puede_editar,
    promedio_criterios,
    promedio_objetivos,
    solapa_fechas,
    validar_fechas,
    valor_en_escala,
)

BASE = "/api/v1/rrhh/evaluaciones"
OBJETIVOS = "/api/v1/rrhh/objetivos"
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


def _crear_escala(client, valor):
    """Crea una `calificaciones` (escala completa: solo 5, 10 o 100) y
    devuelve el id."""
    assert valor in (5, 10, 100), f"escala no admitida: {valor}"
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


def _crear_objetivo(client, empleado_id, **kwargs):
    payload = {"empleado_id": empleado_id, "nombre": f"Objetivo {_sufijo()}"}
    payload.update(kwargs)
    response = client.post(OBJETIVOS, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def _crear_meta(client, objetivo_id, **kwargs):
    payload = {"nombre": f"Meta {_sufijo()}"}
    payload.update(kwargs)
    response = client.post(f"{OBJETIVOS}/{objetivo_id}/metas", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def _valorar_meta(client, evaluacion_id, meta_id, valoracion):
    """Califica una meta (1–5) desde la evaluación (solo en `borrador`)."""
    response = client.put(
        f"{BASE}/{evaluacion_id}/metas/{meta_id}/valoracion",
        json={"valoracion": valoracion},
    )
    assert response.status_code == 200, response.text
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

    def test_valor_en_escala_convierte_las_estrellas(self):
        # 7★ sobre 1–5 → 3.50; 10★ sobre 1–100 → 100.00; 0★ → 0.00.
        assert valor_en_escala(7, 5) == Decimal("3.50")
        assert valor_en_escala(10, 100) == Decimal("100.00")
        assert valor_en_escala(0, 10) == Decimal("0.00")
        # Sin puntuación o sin escala no hay valor.
        assert valor_en_escala(None, 10) is None
        assert valor_en_escala(7, None) is None

    def test_promedio_objetivos_convierte_a_escala_100(self):
        # resultados [4, 2] → media 3 → 3/5×100 = 60
        assert promedio_objetivos([4, 2]) == Decimal("60.00")

    def test_promedio_objetivos_sin_valoraciones_devuelve_none(self):
        assert promedio_objetivos([]) is None
        assert promedio_objetivos([None, None]) is None

    def test_promedio_objetivos_maximo(self):
        assert promedio_objetivos([5, 5, 5]) == Decimal("100.00")

    def test_promedio_objetivos_acepta_resultados_decimales(self):
        # `resultado_objetivo` es la media (1–5) de las metas de cada objetivo.
        assert promedio_objetivos(
            [Decimal("4.50"), Decimal("3.00")]
        ) == Decimal("75.00")
        assert promedio_objetivos([Decimal("3.50"), None]) == Decimal("70.00")

    def test_escala_a_100(self):
        assert escala_a_100(3) == Decimal("60.00")
        assert escala_a_100(None) is None
        assert escala_a_100(Decimal("3.50")) == Decimal("70.00")

    def test_solapa_fechas(self):
        junio = (date(2098, 6, 1), date(2098, 6, 30))
        julio = (date(2098, 7, 1), date(2098, 7, 31))

        # Un objetivo sin fechas cuenta siempre.
        assert solapa_fechas(None, None, *junio)
        # Solape completo y solape a medias.
        assert solapa_fechas(*junio, *junio)
        assert solapa_fechas(date(2098, 6, 15), date(2098, 7, 5), *junio)
        # Fuera de rango y extremos abiertos.
        assert not solapa_fechas(*julio, *junio)
        assert not solapa_fechas(date(2098, 5, 1), date(2098, 5, 31), *junio)
        assert solapa_fechas(date(2098, 6, 15), None, *junio)
        assert solapa_fechas(None, date(2098, 6, 15), *junio)

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

    def test_escala_que_no_existe(self, client):
        empleado = _crear_empleado(client)
        try:
            response = client.post(
                BASE,
                json={
                    "empleado_id": empleado["id"],
                    "periodo": "2098-06",
                    "inicio_periodo": "2098-06-01",
                    "fin_periodo": "2098-06-30",
                    "escala_criterios_id": 999999,
                },
            )
            assert response.status_code == 404
            assert "escala" in response.json()["detail"]
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
        escalas = []
        try:
            escala = _crear_escala(client, 5)  # escala 1–5
            escalas.append(escala)

            data = _crear_evaluacion(
                client,
                empleado["id"],
                escala_criterios_id=escala,
                puntualidad_estrellas=2,      # 2/10×5 = 1.00
                productividad_estrellas=4,    # 4/10×5 = 2.00
                trabajo_equipo_estrellas=6,   # 6/10×5 = 3.00
                calidad_estrellas=10,         # 10/10×5 = 5.00
            )
            # valores (1+2+3+5)/4 = 2.75
            assert Decimal(data["promedio_criterios"]) == Decimal("2.75")
            assert data["escala_valor"] == 5

            detalle = client.get(f"{BASE}/{data['id']}").json()
            assert Decimal(detalle["promedio_criterios"]) == Decimal("2.75")

            # El radar trae los 4 criterios con la etiqueta, las estrellas
            # marcadas y el valor convertido a la escala.
            assert [c["etiqueta"] for c in detalle["criterios"]] == [
                "Puntualidad",
                "Productividad",
                "Trabajo en equipo",
                "Calidad",
            ]
            assert [c["estrellas"] for c in detalle["criterios"]] == [2, 4, 6, 10]
            assert [Decimal(str(c["valor"])) for c in detalle["criterios"]] == [
                Decimal("1.00"),
                Decimal("2.00"),
                Decimal("3.00"),
                Decimal("5.00"),
            ]
        finally:
            _limpiar_empleado(client, empleado["id"])
            _limpiar_calificaciones(client, escalas)

    def test_criterios_con_escala_amplia(self, client):
        """La escala la define el usuario (1–5, 1–10 o 1–100): las 10
        estrellas se convierten a esa escala (estrellas/10 × escala)."""
        empleado = _crear_empleado(client)
        escalas = []
        try:
            escala = _crear_escala(client, 100)
            escalas.append(escala)

            data = _crear_evaluacion(
                client,
                empleado["id"],
                escala_criterios_id=escala,
                puntualidad_estrellas=7,    # 70.00
                calidad_estrellas=10,       # 100.00
            )
            # (70+100)/2 = 85.00 sobre una escala 1–100
            assert Decimal(data["promedio_criterios"]) == Decimal("85.00")

            detalle = client.get(f"{BASE}/{data['id']}").json()
            valores = {
                c["criterio"]: Decimal(str(c["valor"]))
                for c in detalle["criterios"]
            }
            assert valores["puntualidad"] == Decimal("70.00")
            assert valores["calidad"] == Decimal("100.00")
            assert detalle["escala_valor"] == 100
        finally:
            _limpiar_empleado(client, empleado["id"])
            _limpiar_calificaciones(client, escalas)

    def test_criterios_parciales(self, client):
        empleado = _crear_empleado(client)
        escalas = []
        try:
            escala = _crear_escala(client, 5)
            escalas.append(escala)

            data = _crear_evaluacion(
                client,
                empleado["id"],
                escala_criterios_id=escala,
                puntualidad_estrellas=6,   # 3.00
                calidad_estrellas=10,      # 5.00
            )
            # Solo dos puntuados: (3+5)/2 = 4.00
            assert Decimal(data["promedio_criterios"]) == Decimal("4.00")

            detalle = client.get(f"{BASE}/{data['id']}").json()
            # Los dos sin puntuar quedan en 0 para el radar.
            valores = {
                c["criterio"]: Decimal(str(c["valor"]))
                for c in detalle["criterios"]
            }
            assert valores["puntualidad"] == Decimal("3.00")
            assert valores["calidad"] == Decimal("5.00")
            assert valores["productividad"] == Decimal("0")
            assert valores["trabajo_equipo"] == Decimal("0")
            estrellas = {c["criterio"]: c["estrellas"] for c in detalle["criterios"]}
            assert estrellas["productividad"] is None
            assert estrellas["trabajo_equipo"] is None
        finally:
            _limpiar_empleado(client, empleado["id"])
            _limpiar_calificaciones(client, escalas)

    def test_criterios_sin_puntuar(self, client):
        empleado = _crear_empleado(client)
        try:
            data = _crear_evaluacion(client, empleado["id"])
            assert data["promedio_criterios"] is None
            assert data["escala_valor"] is None

            detalle = client.get(f"{BASE}/{data['id']}").json()
            assert detalle["promedio_criterios"] is None
            assert all(c["estrellas"] is None for c in detalle["criterios"])
            assert all(Decimal(str(c["valor"])) == 0 for c in detalle["criterios"])
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_cambio_de_criterio_se_refleja_al_leer(self, client):
        empleado = _crear_empleado(client)
        escalas = []
        try:
            escala = _crear_escala(client, 5)
            escalas.append(escala)

            data = _crear_evaluacion(
                client,
                empleado["id"],
                escala_criterios_id=escala,
                puntualidad_estrellas=6,   # 3.00
            )
            assert Decimal(data["promedio_criterios"]) == Decimal("3.00")

            response = client.put(
                f"{BASE}/{data['id']}", json={"puntualidad_estrellas": 10}
            )
            assert response.status_code == 200
            assert Decimal(response.json()["promedio_criterios"]) == Decimal("5.00")
        finally:
            _limpiar_empleado(client, empleado["id"])
            _limpiar_calificaciones(client, escalas)

    def test_estrellas_sin_escala_es_400(self, client):
        """Sin escala elegida no hay dónde convertir las estrellas."""
        empleado = _crear_empleado(client)
        try:
            response = client.post(
                BASE,
                json={
                    "empleado_id": empleado["id"],
                    "periodo": "2098-06",
                    "tipo_evaluacion_id": _tipo_id(client, "Formal"),
                    "inicio_periodo": "2098-06-01",
                    "fin_periodo": "2098-06-30",
                    "puntualidad_estrellas": 5,
                },
            )
            assert response.status_code == 400
            assert "escala" in response.json()["detail"]
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_estrellas_fuera_de_10_es_422(self, client):
        empleado = _crear_empleado(client)
        escalas = []
        try:
            escala = _crear_escala(client, 10)
            escalas.append(escala)
            response = client.post(
                BASE,
                json={
                    "empleado_id": empleado["id"],
                    "periodo": "2098-06",
                    "tipo_evaluacion_id": _tipo_id(client, "Formal"),
                    "inicio_periodo": "2098-06-01",
                    "fin_periodo": "2098-06-30",
                    "escala_criterios_id": escala,
                    "puntualidad_estrellas": 11,
                },
            )
            assert response.status_code == 422
        finally:
            _limpiar_empleado(client, empleado["id"])
            _limpiar_calificaciones(client, escalas)


# ── Objetivos y metas (definición en el empleado, calificación en la evaluación) ──


class TestObjetivosYMetas:
    def test_valoracion_de_metas_alimenta_los_promedios(self, client):
        """La meta se puntúa desde la evaluación: `resultado_objetivo` es la
        media de las metas del objetivo y `promedio_objetivos` (0–100) el
        promedio de esos resultados."""
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            objetivo = _crear_objetivo(
                client,
                empleado["id"],
                fecha_inicio="2098-06-01",
                fecha_fin="2098-06-15",
            )
            meta = _crear_meta(
                client, objetivo["id_objetivos"], resultado_meta=75
            )

            valorada = _valorar_meta(
                client, evaluacion["id"], meta["id_metas"], 4
            )
            assert valorada["valoracion"] == 4

            # resultado_objetivo = media de sus metas = 4 → aporte 80.00
            fila = client.get(f"{OBJETIVOS}/{objetivo['id_objetivos']}").json()
            assert Decimal(fila["resultado_objetivo"]) == Decimal("4.00")
            assert Decimal(fila["aporte"]) == Decimal("80.00")
            assert fila["empleado_id"] == empleado["id"]
            assert len(fila["metas"]) == 1

            # promedio_objetivos = 4/5×100 = 80.00
            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert Decimal(detalle["promedio_objetivos"]) == Decimal("80.00")
            assert Decimal(detalle["promedio_valoracion_1a5"]) == Decimal("4.00")
            assert len(detalle["objetivos"]) == 1
            assert len(detalle["objetivos"][0]["metas"]) == 1
            assert detalle["cantidad_objetivos"] == 1
            assert detalle["cantidad_metas"] == 1
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_promedio_ignora_objetivos_sin_puntuar(self, client):
        """La meta sin valorar y el objetivo sin metas no aportan nada."""
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])

            sin_valorar = _crear_objetivo(client, empleado["id"])
            _crear_meta(client, sin_valorar["id_objetivos"])  # sin puntuar
            _crear_objetivo(client, empleado["id"])  # sin metas

            graduado = _crear_objetivo(client, empleado["id"])
            meta = _crear_meta(client, graduado["id_objetivos"])
            _valorar_meta(client, evaluacion["id"], meta["id_metas"], 5)

            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert Decimal(detalle["promedio_objetivos"]) == Decimal("100.00")
            assert detalle["cantidad_objetivos"] == 3
            assert detalle["cantidad_metas"] == 2
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_editar_y_eliminar_meta_recalcula(self, client):
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            objetivo = _crear_objetivo(client, empleado["id"])
            meta = _crear_meta(client, objetivo["id_objetivos"])
            _valorar_meta(client, evaluacion["id"], meta["id_metas"], 1)

            # resultado = 1 → 20.00
            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert Decimal(detalle["promedio_objetivos"]) == Decimal("20.00")

            # Puntuar otra meta del mismo objetivo: (1+5)/2 = 3 → 60.00
            otra = _crear_meta(client, objetivo["id_objetivos"])
            _valorar_meta(client, evaluacion["id"], otra["id_metas"], 5)
            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert Decimal(detalle["promedio_objetivos"]) == Decimal("60.00")
            assert detalle["cantidad_metas"] == 2

            # Quitar la meta de 5: solo queda la de 1 → 20.00
            response = client.delete(f"{OBJETIVOS}/metas/{otra['id_metas']}")
            assert response.status_code == 200
            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert detalle["cantidad_metas"] == 1
            assert Decimal(detalle["promedio_objetivos"]) == Decimal("20.00")
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_eliminar_objetivo_arrastra_sus_metas(self, client):
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            objetivo = _crear_objetivo(client, empleado["id"])
            meta = _crear_meta(client, objetivo["id_objetivos"])
            _valorar_meta(client, evaluacion["id"], meta["id_metas"], 5)

            response = client.delete(f"{OBJETIVOS}/{objetivo['id_objetivos']}")
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
            objetivo = _crear_objetivo(client, empleado["id"])
            meta = _crear_meta(client, objetivo["id_objetivos"])

            for fuera in (6, 0):
                response = client.put(
                    f"{BASE}/{evaluacion['id']}/metas/{meta['id_metas']}/valoracion",
                    json={"valoracion": fuera},
                )
                assert response.status_code == 422
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_no_calificar_en_finalizada_ni_de_otro_empleado(self, client):
        empleado = _crear_empleado(client)
        otro = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            objetivo = _crear_objetivo(client, empleado["id"])
            meta = _crear_meta(client, objetivo["id_objetivos"])
            _valorar_meta(client, evaluacion["id"], meta["id_metas"], 3)

            # La meta de otro empleado no existe para esta evaluación.
            ajeno = _crear_objetivo(client, otro["id"])
            ajena = _crear_meta(client, ajeno["id_objetivos"])
            response = client.put(
                f"{BASE}/{evaluacion['id']}/metas/{ajena['id_metas']}/valoracion",
                json={"valoracion": 5},
            )
            assert response.status_code == 404

            # En finalizada la calificación queda congelada.
            client.post(f"{BASE}/{evaluacion['id']}/finalizar")
            response = client.put(
                f"{BASE}/{evaluacion['id']}/metas/{meta['id_metas']}/valoracion",
                json={"valoracion": 5},
            )
            assert response.status_code == 409

            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert Decimal(detalle["promedio_objetivos"]) == Decimal("60.00")
        finally:
            _limpiar_empleado(client, empleado["id"])
            _limpiar_empleado(client, otro["id"])

    def test_definicion_editable_aun_finalizada(self, client):
        """Los objetivos y metas se definen en el empleado: la definición
        (nombre, fechas, altas y bajas) se edita siempre; lo que se congela
        al finalizar es la calificación."""
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            objetivo = _crear_objetivo(client, empleado["id"])
            meta = _crear_meta(client, objetivo["id_objetivos"])
            _valorar_meta(client, evaluacion["id"], meta["id_metas"], 3)
            client.post(f"{BASE}/{evaluacion['id']}/finalizar")

            response = client.put(
                f"{OBJETIVOS}/{objetivo['id_objetivos']}",
                json={"nombre": "Renombrado"},
            )
            assert response.status_code == 200, response.text

            response = client.put(
                f"{OBJETIVOS}/metas/{meta['id_metas']}", json={"nombre": "Cambiada"}
            )
            assert response.status_code == 200, response.text

            response = client.post(
                f"{OBJETIVOS}/{objetivo['id_objetivos']}/metas",
                json={"nombre": "Extra"},
            )
            assert response.status_code == 201, response.text

            response = client.delete(f"{OBJETIVOS}/{objetivo['id_objetivos']}")
            assert response.status_code == 200

            # La evaluación finalizada conserva su promedio congelado (60.00),
            # aunque el objetivo ya no exista.
            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert detalle["estado"] == "finalizada"
            assert Decimal(detalle["promedio_objetivos"]) == Decimal("60.00")
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_fechas_delimitan_el_alcance(self, client):
        """Un objetivo cuyo rango no solapa el periodo de la evaluación no
        cuenta en su detalle ni se puede puntuar desde ella."""
        empleado = _crear_empleado(client)
        try:
            # Junio: la evaluación va de 2098-06-01 a 2098-06-30.
            evaluacion = _crear_evaluacion(client, empleado["id"])
            fuera = _crear_objetivo(
                client,
                empleado["id"],
                fecha_inicio="2098-07-01",
                fecha_fin="2098-07-31",
            )
            meta_fuera = _crear_meta(client, fuera["id_objetivos"])

            detalle = client.get(f"{BASE}/{evaluacion['id']}").json()
            assert detalle["objetivos"] == []
            assert detalle["cantidad_objetivos"] == 0

            response = client.put(
                f"{BASE}/{evaluacion['id']}/metas/{meta_fuera['id_metas']}/valoracion",
                json={"valoracion": 5},
            )
            assert response.status_code == 400

            # En una evaluación de julio sí entra (solape exacto).
            julio = _crear_evaluacion(
                client,
                empleado["id"],
                tipo_evaluacion_id=_tipo_id(client, "Parcial"),
                periodo="2098-07",
                inicio_periodo="2098-07-01",
                fin_periodo="2098-07-31",
            )
            response = client.put(
                f"{BASE}/{julio['id']}/metas/{meta_fuera['id_metas']}/valoracion",
                json={"valoracion": 5},
            )
            assert response.status_code == 200, response.text

            detalle_julio = client.get(f"{BASE}/{julio['id']}").json()
            assert Decimal(detalle_julio["promedio_objetivos"]) == Decimal(
                "100.00"
            )

            # La de junio no se ve afectada: su objetivo sigue fuera de alcance.
            assert client.get(f"{BASE}/{evaluacion['id']}").json()[
                "promedio_objetivos"
            ] is None
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_alta_de_objetivo_valida_al_empleado(self, client):
        response = client.post(
            OBJETIVOS, json={"empleado_id": 999999, "nombre": "Huérfano"}
        )
        assert response.status_code == 404

        empleado = _crear_empleado(client)
        try:
            # Fechas invertidas: validación del DTO → 422.
            response = client.post(
                OBJETIVOS,
                json={
                    "empleado_id": empleado["id"],
                    "nombre": "Al revés",
                    "fecha_inicio": "2098-06-30",
                    "fecha_fin": "2098-06-01",
                },
            )
            assert response.status_code == 422

            # Edición con fechas invertidas: validación del servicio → 422.
            objetivo = _crear_objetivo(client, empleado["id"])
            meta = _crear_meta(client, objetivo["id_objetivos"])
            response = client.put(
                f"{OBJETIVOS}/metas/{meta['id_metas']}",
                json={"fecha_inicio": "2098-06-30", "fecha_fin": "2098-06-01"},
            )
            assert response.status_code == 422
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_finalizar_recalcula_promedio(self, client):
        """Al finalizar se recalcula `promedio_objetivos` desde los hijos."""
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            objetivo = _crear_objetivo(client, empleado["id"])
            primera = _crear_meta(client, objetivo["id_objetivos"])
            segunda = _crear_meta(client, objetivo["id_objetivos"])
            _valorar_meta(client, evaluacion["id"], primera["id_metas"], 4)
            _valorar_meta(client, evaluacion["id"], segunda["id_metas"], 3)

            # resultado = (4+3)/2 = 3.5 → 70.00 antes de finalizar.
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
            objetivo = _crear_objetivo(client, empleado["id"])
            _crear_meta(client, objetivo["id_objetivos"])

            response = client.get(f"{BASE}?empleado_id={empleado['id']}")
            fila = response.json()[0]
            assert fila["id"] == evaluacion["id"]
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
        escalas = []
        try:
            escala = _crear_escala(client, 5)
            escalas.append(escala)
            evaluacion = _crear_evaluacion(
                client,
                empleado["id"],
                escala_criterios_id=escala,
                puntualidad_estrellas=2,    # 1.00
                calidad_estrellas=10,       # 5.00
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
            assert [c["estrellas"] for c in fila["criterios"]] == [
                2,
                None,
                None,
                10,
            ]
            assert [Decimal(str(c["valor"])) for c in fila["criterios"]] == [
                Decimal("1"),
                Decimal("0"),
                Decimal("0"),
                Decimal("5"),
            ]
            assert fila["escala_valor"] == 5
        finally:
            _limpiar_empleado(client, empleado["id"])
            _limpiar_calificaciones(client, escalas)

    def test_listado_vacio(self, client):
        response = client.get(f"{BASE}?empleado_id=999999")
        assert response.status_code == 200
        assert response.json() == []

    def test_404_al_no_encontrar(self, client):
        assert client.get(f"{BASE}/999999").status_code == 404
        assert client.put(f"{BASE}/999999", json={}).status_code == 404
        assert client.delete(f"{BASE}/999999").status_code == 404
        assert client.post(f"{BASE}/999999/finalizar").status_code == 404
        assert (
            client.put(
                f"{BASE}/999999/metas/999999/valoracion",
                json={"valoracion": 3},
            ).status_code
            == 404
        )
        assert client.get(f"{OBJETIVOS}/999999").status_code == 404
        assert client.put(f"{OBJETIVOS}/999999", json={}).status_code == 404
        assert client.delete(f"{OBJETIVOS}/999999").status_code == 404
        assert client.put(f"{OBJETIVOS}/metas/999999", json={}).status_code == 404
        assert client.delete(f"{OBJETIVOS}/metas/999999").status_code == 404
        assert (
            client.post(f"{OBJETIVOS}/999999/metas", json={"nombre": "X"}).status_code
            == 404
        )


# ── Listado de objetivos por empleado y reporte ─────────────────────────────


class TestSubRecursosYReporte:
    def test_listar_objetivos_por_empleado(self, client):
        empleado = _crear_empleado(client)
        otro = _crear_empleado(client)
        try:
            objetivo = _crear_objetivo(client, empleado["id"])
            _crear_meta(client, objetivo["id_objetivos"])
            ajeno = _crear_objetivo(client, otro["id"])

            response = client.get(f"{OBJETIVOS}?empleado_id={empleado['id']}")
            assert response.status_code == 200
            objetivos = response.json()
            assert [o["id_objetivos"] for o in objetivos] == [
                objetivo["id_objetivos"]
            ]
            assert objetivos[0]["empleado_id"] == empleado["id"]
            assert objetivos[0]["total_metas"] == 1
            assert len(objetivos[0]["metas"]) == 1
            assert ajeno["id_objetivos"] not in {
                o["id_objetivos"] for o in objetivos
            }
        finally:
            _limpiar_empleado(client, empleado["id"])
            _limpiar_empleado(client, otro["id"])

    def test_get_objetivo_detalle_con_metas_y_empleado(self, client):
        """Detalle de un objetivo: metas anidadas + datos del empleado
        (cabecera de la pantalla de metas)."""
        empleado = _crear_empleado(client)
        try:
            evaluacion = _crear_evaluacion(client, empleado["id"])
            objetivo = _crear_objetivo(
                client, empleado["id"], fecha_inicio="2098-06-01"
            )
            meta = _crear_meta(client, objetivo["id_objetivos"], resultado_meta=90)
            _valorar_meta(client, evaluacion["id"], meta["id_metas"], 3)

            response = client.get(f"{OBJETIVOS}/{objetivo['id_objetivos']}")
            assert response.status_code == 200, response.text
            data = response.json()
            assert data["id_objetivos"] == objetivo["id_objetivos"]
            assert data["empleado_id"] == empleado["id"]
            assert data["nombre"] == objetivo["nombre"]
            assert data["fecha_inicio"] == "2098-06-01"
            assert len(data["metas"]) == 1
            assert data["metas"][0]["valoracion"] == 3
            assert data["metas"][0]["resultado_meta"] == 90
            # Contexto del empleado y nota derivada (3 → aporte 60.00).
            assert data["empleado_nombre"] == (
                f"{empleado['nombre']} {empleado['apellido']}"
            )
            assert data["empleado_codigo"] == empleado["codigo_empleado"]
            assert Decimal(data["resultado_objetivo"]) == Decimal("3.00")
            assert Decimal(data["aporte"]) == Decimal("60.00")
        finally:
            _limpiar_empleado(client, empleado["id"])

    def test_get_objetivo_inexistente_404(self, client):
        assert client.get(f"{OBJETIVOS}/999999").status_code == 404

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
            escala = _crear_escala(client, 5)
            calificaciones.append(escala)

            primera = _crear_evaluacion(
                client,
                empleado["id"],
                escala_criterios_id=escala,
                puntualidad_estrellas=6,     # 3.00
                productividad_estrellas=10,  # 5.00
            )
            objetivo = _crear_objetivo(client, empleado["id"])
            meta = _crear_meta(client, objetivo["id_objetivos"])
            _valorar_meta(client, primera["id"], meta["id_metas"], 5)
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

            # Empleado 1: criterios (3+5)/2 = 4.00, objetivos 5 → 100.00
            primero = por_id[empleado["id"]]
            assert Decimal(primero["promedio_criterios"]) == Decimal("4.00")
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
