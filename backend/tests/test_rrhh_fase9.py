"""Tests de la Fase 9 del módulo RRHH — Auditoría.

Usan el patrón `client` de conftest.py (TestClient contra la BD real).

El submódulo es de SOLO LECTURA sobre la tabla `log`: no hay altas que
limpiar. Ojo con quién escribe el log: el `LoggingMiddleware` está
DESHABILITADO en `main.py`; las filas `REQUEST` que ve la BD las escribe
el frontend (`api.ts` → `POST /api/v1/logs`) y los servicios del módulo
escriben `SOLICITUD`/`NOMINA` directamente. Por eso cada test siembra
sus propias entradas por `POST /api/v1/logs` con un token único y las
borra al terminar (psycopg2 sobre la misma BD) para no dejar residuos.
"""

import os
import uuid

import pytest

MARCA_TIPO = "ACTION"  # tipo arbitrario pero fijo para los filtros
MARCA_NIVEL = "WARNING"  # nivel arbitrario pero fijo para los filtros


def _limpiar_tokens(tokens):
    """Borra del log real las entradas sembradas con esos tokens."""
    import re

    import psycopg2

    # Quita el driver async de la URL (postgresql+asyncpg:// …) para
    # conectar con psycopg2 (sync).
    url = re.sub(r"^postgresql(\+\w+)?://", "postgresql://", os.environ["DATABASE_URL"])
    conn = psycopg2.connect(url)
    try:
        with conn:
            with conn.cursor() as cur:
                for token in tokens:
                    cur.execute(
                        "DELETE FROM log WHERE mensaje ILIKE %s OR COALESCE(detalle, '') ILIKE %s",
                        (f"%{token}%", f"%{token}%"),
                    )
    finally:
        conn.close()


@pytest.fixture
def sembrador(client):
    """Crea entradas de log vía `POST /api/v1/logs` y las borra al final.

    Devuelve una función `sembrar(**overrides) -> token`: el `token` es
    único por entrada y aparece dentro del `mensaje` (a menos que se
    pisa), de forma que `buscar=token` la encuentra siempre. Para tests
    que necesitan juntar varias entradas en un mismo filtro se puede
    pasar `marcador=<otro token>` y buscar por ese.
    """
    tokens = []

    def sembrar(**overrides):
        token = uuid.uuid4().hex[:8]
        tokens.append(token)
        payload = {
            "nivel": "INFO",
            "tipo": "REQUEST",
            "mensaje": f"entrada de prueba {token}",
            "detalle": f'{{"prueba": "{token}"}}',
            "usuario_nombre": f"tester-{token}",
        }
        marcador = overrides.pop("marcador", token)
        if overrides.pop("sin_token_en_mensaje", False):
            payload["mensaje"] = f"entrada de prueba {marcador}"
        else:
            payload["mensaje"] = f"entrada de prueba {marcador} {token}"
        payload.update(overrides)
        response = client.post("/api/v1/logs", json=payload)
        assert response.status_code == 200, response.text
        return token

    yield sembrar

    if tokens:
        _limpiar_tokens(tokens)


def _listar(client, **params):
    response = client.get("/api/v1/rrhh/auditoria", params=params)
    assert response.status_code == 200, response.text
    return response.json()


class TestListadoAuditoria:
    def test_listado_ok_devuelve_la_entrada_sembrada(self, client, sembrador):
        token = sembrador()
        filas = _listar(client, buscar=token)
        assert len(filas) == 1
        assert token in filas[0]["mensaje"]

    def test_filas_tienen_los_campos_del_dto(self, client, sembrador):
        token = sembrador()
        filas = _listar(client, buscar=token)
        assert filas
        fila = filas[0]
        for campo in (
            "id",
            "timestamp",
            "nivel",
            "tipo",
            "mensaje",
            "detalle",
            "ip",
            "usuario_id",
            "usuario_nombre",
            "endpoint",
            "method",
            "status_code",
            "navegador",
        ):
            assert campo in fila, f"falta el campo {campo}"

    def test_orden_mas_recientes_primero(self, client, sembrador):
        marcador = uuid.uuid4().hex[:8]
        primera = sembrador(marcador=marcador)
        segunda = sembrador(marcador=marcador)
        filas = _listar(client, buscar=marcador)
        assert len(filas) == 2
        # La segunda siembra es la más reciente (o empatan y desempata id).
        assert filas[0]["mensaje"].endswith(segunda)
        assert filas[1]["mensaje"].endswith(primera)
        timestamps = [f["timestamp"] for f in filas]
        assert timestamps == sorted(timestamps, reverse=True)

    def test_paginacion_skip_limit(self, client, sembrador):
        marcador = uuid.uuid4().hex[:8]
        primera_token = sembrador(marcador=marcador)
        sembrador(marcador=marcador)
        primera = _listar(client, buscar=marcador, limit=1)
        salto = _listar(client, buscar=marcador, limit=1, skip=1)
        assert len(primera) == len(salto) == 1
        assert primera[0]["id"] != salto[0]["id"]
        # Más reciente primero: la página 0 trae la segunda siembra y
        # skip=1 la primera.
        assert salto[0]["mensaje"].endswith(primera_token)

    def test_limit_invalido_422(self, client):
        response = client.get("/api/v1/rrhh/auditoria", params={"limit": 0})
        assert response.status_code == 422

    def test_limit_excesivo_422(self, client):
        response = client.get("/api/v1/rrhh/auditoria", params={"limit": 5000})
        assert response.status_code == 422


class TestFiltrosAuditoria:
    def test_filtro_tipo(self, client, sembrador):
        token = sembrador(tipo=MARCA_TIPO)
        assert all(
            f["tipo"] == MARCA_TIPO
            for f in _listar(client, buscar=token, tipo=MARCA_TIPO)
        )
        assert _listar(client, buscar=token, tipo="REQUEST") == []

    def test_filtro_tipo_desconocido_vacio(self, client, sembrador):
        token = sembrador()
        assert _listar(client, buscar=token, tipo="TIPO_QUE_NO_EXISTE") == []

    def test_filtro_nivel(self, client, sembrador):
        token = sembrador(nivel=MARCA_NIVEL)
        assert all(
            f["nivel"] == MARCA_NIVEL
            for f in _listar(client, buscar=token, nivel=MARCA_NIVEL)
        )
        assert _listar(client, buscar=token, nivel="ERROR") == []

    def test_filtro_nivel_desconocido_vacio(self, client, sembrador):
        token = sembrador()
        assert _listar(client, buscar=token, nivel="CRITICAL") == []

    def test_rango_invertido_400(self, client):
        response = client.get(
            "/api/v1/rrhh/auditoria",
            params={"desde": "2030-01-02", "hasta": "2030-01-01"},
        )
        assert response.status_code == 400

    def test_desde_futuro_no_incluye_lo_sembrado(self, client, sembrador):
        # Lo sembrado tiene timestamp "ahora" (2026): un rango futuro no
        # puede contenerlo.
        token = sembrador()
        assert _listar(client, buscar=token, desde="2099-01-01") == []

    def test_hasta_pasado_no_incluye_lo_sembrado(self, client, sembrador):
        token = sembrador()
        assert _listar(client, buscar=token, hasta="2000-01-01") == []

    def test_buscar_encuentra_el_mensaje(self, client, sembrador):
        token = sembrador()
        filas = _listar(client, buscar=token)
        assert len(filas) == 1
        assert filas[0]["id"]

    def test_buscar_encuentra_el_detalle(self, client, sembrador):
        # El token solo vive en `detalle`, no en el mensaje: valida la
        # búsqueda sobre la columna de detalle.
        token = sembrador(sin_token_en_mensaje=True)
        filas = _listar(client, buscar=token)
        assert len(filas) == 1
        assert token in (filas[0]["detalle"] or "")

    def test_buscar_encuentra_el_usuario(self, client, sembrador):
        # El token solo vive en `usuario_nombre`.
        token = sembrador(sin_token_en_mensaje=True, mensaje="entrada de prueba")
        filas = _listar(client, buscar=f"tester-{token}")
        assert len(filas) == 1
        assert filas[0]["usuario_nombre"] == f"tester-{token}"

    def test_buscar_sin_coincidencias_vacio(self, client):
        assert _listar(client, buscar="zzz_no_existe_zzz") == []


class TestCatalogosAuditoria:
    def test_tipos_incluye_el_sembrado_y_esta_ordenado(self, client, sembrador):
        sembrador(tipo=MARCA_TIPO)
        tipos = client.get("/api/v1/rrhh/auditoria/tipos").json()
        assert MARCA_TIPO in tipos
        assert tipos == sorted(tipos)

    def test_niveles_incluye_el_sembrado_y_esta_ordenado(self, client, sembrador):
        sembrador(nivel=MARCA_NIVEL)
        niveles = client.get("/api/v1/rrhh/auditoria/niveles").json()
        assert MARCA_NIVEL in niveles
        assert niveles == sorted(niveles)
