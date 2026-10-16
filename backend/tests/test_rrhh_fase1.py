"""Tests de la Fase 1 del módulo RRHH — Catálogos base.

Cubren los seis catálogos (tipos de contrato, deducciones, bonificaciones,
pago, evaluación y calificaciones): listado, crear, nombre duplicado,
actualizar, eliminar y reglas particulares (rango de calificación,
`es_porcentaje`).

Usan el patrón `client` de conftest.py (TestClient contra la BD real).
Los tests crean y limpian sus propios registros.
"""

import uuid


def _nombre_unico(prefijo="CAT-TEST"):
    return f"{prefijo}-{uuid.uuid4().hex[:8]}"


# La configuración base por catálogos (prefijo de ruta y si tiene `activo`).
CATALOGOS = [
    ("tipos-contrato", "id_tipo_contrato", True),
    ("tipos-deducciones", "id_tipos_deducciones", True),
    ("tipos-bonificaciones", "id_tipos_bonificaciones", True),
    ("tipos-pago", "id_tipo_pago", True),
    ("tipos-evaluacion", "id_tipos_evaluaciones", True),
    ("calificaciones", "id_calificaciones", False),
]

BASE = "/api/v1/rrhh/catalogos"


def _url(slug: str, sufijo: str = "") -> str:
    return f"{BASE}/{slug}{sufijo}"


# ── Comunes a los 6 catálogos ───────────────────────────────────────────────


def test_listar_ok(client):
    for slug, _pk, _activo in CATALOGOS:
        response = client.get(_url(slug))
        assert response.status_code == 200
        assert isinstance(response.json(), list)


def test_crear_ok(client):
    for slug, pk, _activo in CATALOGOS:
        nombre = _nombre_unico(slug.upper())
        payload = {"nombre": nombre}
        if slug == "calificaciones":
            payload["valor"] = 5
        response = client.post(_url(slug), json=payload)
        assert response.status_code == 201, response.text
        data = response.json()
        assert data["nombre"] == nombre
        assert data[pk] is not None
        # limpiar
        client.delete(_url(slug, f"/{data[pk]}"))


def test_nombre_duplicado_conflict(client):
    for slug, pk, _activo in CATALOGOS:
        nombre = _nombre_unico(slug.upper())
        payload = {"nombre": nombre}
        if slug == "calificaciones":
            payload["valor"] = 5
        creado = client.post(_url(slug), json=payload)
        id_creado = creado.json()[pk]
        try:
            duplicado = client.post(_url(slug), json=payload)
            assert duplicado.status_code == 409
        finally:
            client.delete(_url(slug, f"/{id_creado}"))


def test_obtener_ok_y_no_encontrado(client):
    for slug, pk, _activo in CATALOGOS:
        nombre = _nombre_unico(slug.upper())
        payload = {"nombre": nombre}
        if slug == "calificaciones":
            payload["valor"] = 5
        creado = client.post(_url(slug), json=payload)
        id_creado = creado.json()[pk]
        try:
            detalle = client.get(_url(slug, f"/{id_creado}"))
            assert detalle.status_code == 200
            assert detalle.json()["nombre"] == nombre
        finally:
            client.delete(_url(slug, f"/{id_creado}"))

        assert client.get(_url(slug, "/999999")).status_code == 404


def test_actualizar_ok(client):
    for slug, pk, _activo in CATALOGOS:
        nombre = _nombre_unico(slug.upper())
        payload = {"nombre": nombre}
        if slug == "calificaciones":
            payload["valor"] = 5
        creado = client.post(_url(slug), json=payload)
        id_creado = creado.json()[pk]
        try:
            nuevo = _nombre_unico("UPD")
            response = client.put(
                _url(slug, f"/{id_creado}"),
                json={"nombre": nuevo, "descripcion": "Descripción de prueba"},
            )
            assert response.status_code == 200
            assert response.json()["nombre"] == nuevo
        finally:
            client.delete(_url(slug, f"/{id_creado}"))


def test_actualizar_no_encontrado_404(client):
    for slug, _pk, _activo in CATALOGOS:
        response = client.put(_url(slug, "/999999"), json={"nombre": "X"})
        assert response.status_code == 404


def test_eliminar_ok(client):
    for slug, pk, _activo in CATALOGOS:
        nombre = _nombre_unico(slug.upper())
        payload = {"nombre": nombre}
        if slug == "calificaciones":
            payload["valor"] = 5
        creado = client.post(_url(slug), json=payload)
        id_creado = creado.json()[pk]
        response = client.delete(_url(slug, f"/{id_creado}"))
        assert response.status_code == 200
        assert response.json()["accion"] == "eliminado"
        assert client.get(_url(slug, f"/{id_creado}")).status_code == 404


def test_eliminar_no_encontrado_404(client):
    for slug, _pk, _activo in CATALOGOS:
        response = client.delete(_url(slug, "/999999"))
        assert response.status_code == 404


# ── Reglas particulares ─────────────────────────────────────────────────────


def test_calificacion_valor_fuera_de_rango_422(client):
    # Solo se admiten escalas completas: 5, 10 o 100.
    for valor in (0, 1, 3, 4, 7, 101, -1):
        response = client.post(
            _url("calificaciones"),
            json={"nombre": _nombre_unico("CAL"), "valor": valor},
        )
        assert response.status_code == 422


def test_calificacion_escalas_admitidas(client):
    """Una calificación es una escala completa: solo valor 5, 10 o 100."""
    creadas = []
    try:
        for valor in (5, 10, 100):
            response = client.post(
                _url("calificaciones"),
                json={"nombre": _nombre_unico("CAL"), "valor": valor},
            )
            assert response.status_code == 201, response.text
            creadas.append(response.json()["id_calificaciones"])
    finally:
        for calif_id in creadas:
            client.delete(_url("calificaciones", f"/{calif_id}"))


def test_calificacion_no_tiene_flag_activo(client):
    nombre = _nombre_unico("CAL")
    creado = client.post(
        _url("calificaciones"), json={"nombre": nombre, "valor": 10}
    )
    data = creado.json()
    try:
        assert "activo" not in data
    finally:
        client.delete(_url("calificaciones", f"/{data['id_calificaciones']}"))


def test_tipos_deduccion_y_bonificacion_es_porcentaje(client):
    """Los catálogos de deducción y bonificación soportan `es_porcentaje`."""
    for slug, pk in (
        ("tipos-deducciones", "id_tipos_deducciones"),
        ("tipos-bonificaciones", "id_tipos_bonificaciones"),
    ):
        nombre = _nombre_unico(slug.upper())
        creado = client.post(
            _url(slug), json={"nombre": nombre, "es_porcentaje": True}
        )
        data = creado.json()
        try:
            assert data["es_porcentaje"] is True
        finally:
            client.delete(_url(slug, f"/{data[pk]}"))


def test_filtro_activo_y_busqueda(client):
    """El filtro de estado y la búsqueda por nombre funcionan en tipos de contrato."""
    slug = "tipos-contrato"
    pk = "id_tipo_contrato"
    nombre = _nombre_unico("BUSQ")
    creado = client.post(
        _url(slug), json={"nombre": nombre, "activo": False}
    )
    id_creado = creado.json()[pk]
    try:
        # búsqueda por texto
        r_busq = client.get(f"{_url(slug)}?buscar={nombre}")
        assert r_busq.status_code == 200
        assert any(d["id_tipo_contrato"] == id_creado for d in r_busq.json())

        # filtro por estado
        r_inactivos = client.get(f"{_url(slug)}?activo=false")
        assert r_inactivos.status_code == 200
        assert any(
            d["id_tipo_contrato"] == id_creado for d in r_inactivos.json()
        )
        r_activos = client.get(f"{_url(slug)}?activo=true")
        assert r_activos.status_code == 200
        assert not any(
            d["id_tipo_contrato"] == id_creado for d in r_activos.json()
        )
    finally:
        client.delete(_url(slug, f"/{id_creado}"))


def test_nombre_en_blanco_400(client):
    """Un nombre vacío o solo espacios se rechaza con 400 (no 409 ni 500)."""
    for slug, _pk, _activo in CATALOGOS:
        payload = {"nombre": "   "}
        if slug == "calificaciones":
            payload["valor"] = 5
        response = client.post(_url(slug), json=payload)
        assert response.status_code == 400
