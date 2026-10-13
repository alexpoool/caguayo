"""Tests de la Fase 2 del módulo RRHH — Departamentos y Puestos.

Usan el patrón `client` de conftest.py (TestClient contra la BD real).
Los tests crean y limpian sus propios registros para no dejar residuos.
"""

import uuid


def _nombre_unico(prefijo="DEP-TEST"):
    return f"{prefijo}-{uuid.uuid4().hex[:8]}"


# ── Departamentos ───────────────────────────────────────────────────────────


def test_departamentos_listar_ok(client):
    response = client.get("/api/v1/rrhh/departamentos")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_departamento_crear_ok(client):
    nombre = _nombre_unico()
    response = client.post("/api/v1/rrhh/departamentos", json={"nombre": nombre})
    assert response.status_code == 201
    data = response.json()
    assert data["nombre"] == nombre
    assert data["activo"] is True
    # limpiar
    client.delete(f"/api/v1/rrhh/departamentos/{data['id_departamento']}")


def test_departamento_nombre_duplicado_conflict(client):
    nombre = _nombre_unico()
    creado = client.post("/api/v1/rrhh/departamentos", json={"nombre": nombre})
    id_dep = creado.json()["id_departamento"]
    try:
        duplicado = client.post("/api/v1/rrhh/departamentos", json={"nombre": nombre})
        assert duplicado.status_code == 409
    finally:
        client.delete(f"/api/v1/rrhh/departamentos/{id_dep}")


def test_departamento_responsable_inexistente_404(client):
    nombre = _nombre_unico()
    response = client.post(
        "/api/v1/rrhh/departamentos",
        json={"nombre": nombre, "responsable": 999999},
    )
    assert response.status_code == 404


def test_departamento_actualizar_ok(client):
    nombre = _nombre_unico()
    creado = client.post("/api/v1/rrhh/departamentos", json={"nombre": nombre})
    id_dep = creado.json()["id_departamento"]
    try:
        nuevo_nombre = _nombre_unico("DEP-UPD")
        response = client.put(
            f"/api/v1/rrhh/departamentos/{id_dep}",
            json={"nombre": nuevo_nombre, "descripcion": "Departamento de prueba"},
        )
        assert response.status_code == 200
        assert response.json()["nombre"] == nuevo_nombre
    finally:
        client.delete(f"/api/v1/rrhh/departamentos/{id_dep}")


def test_departamento_no_encontrado_404(client):
    response = client.get("/api/v1/rrhh/departamentos/999999")
    assert response.status_code == 404


def test_departamento_eliminar_ok(client):
    nombre = _nombre_unico()
    creado = client.post("/api/v1/rrhh/departamentos", json={"nombre": nombre})
    id_dep = creado.json()["id_departamento"]
    response = client.delete(f"/api/v1/rrhh/departamentos/{id_dep}")
    assert response.status_code == 200
    assert response.json()["accion"] == "eliminado"
    # ya no existe
    assert client.get(f"/api/v1/rrhh/departamentos/{id_dep}").status_code == 404


def test_departamento_con_puestos_se_desactiva_no_elimina(client):
    nombre_dep = _nombre_unico()
    dep = client.post("/api/v1/rrhh/departamentos", json={"nombre": nombre_dep})
    id_dep = dep.json()["id_departamento"]
    nombre_puesto = _nombre_unico("PUE-TEST")
    puesto = client.post(
        "/api/v1/rrhh/puestos",
        json={"nombre": nombre_puesto, "departamento_id": id_dep},
    )
    id_puesto = puesto.json()["id_puesto"]
    try:
        response = client.delete(f"/api/v1/rrhh/departamentos/{id_dep}")
        assert response.status_code == 200
        assert response.json()["accion"] == "desactivado"
        # sigue existiendo pero inactivo
        detalle = client.get(f"/api/v1/rrhh/departamentos/{id_dep}")
        assert detalle.status_code == 200
        assert detalle.json()["activo"] is False
    finally:
        client.delete(f"/api/v1/rrhh/puestos/{id_puesto}")
        client.delete(f"/api/v1/rrhh/departamentos/{id_dep}")


# ── Puestos ─────────────────────────────────────────────────────────────────


def test_puesto_crear_ok(client):
    nombre = _nombre_unico("PUE-TEST")
    response = client.post(
        "/api/v1/rrhh/puestos",
        json={"nombre": nombre, "salario_minimo": 1000, "salario_maximo": 2000},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["nombre"] == nombre
    client.delete(f"/api/v1/rrhh/puestos/{data['id_puesto']}")


def test_puesto_rango_salarial_invalido_400(client):
    nombre = _nombre_unico("PUE-TEST")
    response = client.post(
        "/api/v1/rrhh/puestos",
        json={"nombre": nombre, "salario_minimo": 2000, "salario_maximo": 1000},
    )
    assert response.status_code == 400


def test_puesto_departamento_inexistente_404(client):
    nombre = _nombre_unico("PUE-TEST")
    response = client.post(
        "/api/v1/rrhh/puestos",
        json={"nombre": nombre, "departamento_id": 999999},
    )
    assert response.status_code == 404


def test_puesto_listar_por_departamento(client):
    nombre_dep = _nombre_unico()
    dep = client.post("/api/v1/rrhh/departamentos", json={"nombre": nombre_dep})
    id_dep = dep.json()["id_departamento"]
    nombre_puesto = _nombre_unico("PUE-TEST")
    puesto = client.post(
        "/api/v1/rrhh/puestos",
        json={"nombre": nombre_puesto, "departamento_id": id_dep},
    )
    id_puesto = puesto.json()["id_puesto"]
    try:
        response = client.get(f"/api/v1/rrhh/puestos?departamento_id={id_dep}")
        assert response.status_code == 200
        nombres = [p["nombre"] for p in response.json()]
        assert nombre_puesto in nombres
    finally:
        client.delete(f"/api/v1/rrhh/puestos/{id_puesto}")
        client.delete(f"/api/v1/rrhh/departamentos/{id_dep}")


def test_puesto_eliminar_ok(client):
    nombre = _nombre_unico("PUE-TEST")
    creado = client.post("/api/v1/rrhh/puestos", json={"nombre": nombre})
    id_puesto = creado.json()["id_puesto"]
    response = client.delete(f"/api/v1/rrhh/puestos/{id_puesto}")
    assert response.status_code == 200
    assert response.json()["accion"] == "eliminado"


def test_puesto_no_encontrado_404(client):
    response = client.get("/api/v1/rrhh/puestos/999999")
    assert response.status_code == 404


# ── Datos agregados del listado ─────────────────────────────────────────────


def test_departamento_listado_incluye_agregados(client):
    nombre_dep = _nombre_unico()
    dep = client.post("/api/v1/rrhh/departamentos", json={"nombre": nombre_dep})
    id_dep = dep.json()["id_departamento"]
    nombre_puesto = _nombre_unico("PUE-TEST")
    puesto = client.post(
        "/api/v1/rrhh/puestos",
        json={"nombre": nombre_puesto, "departamento_id": id_dep},
    )
    id_puesto = puesto.json()["id_puesto"]
    try:
        response = client.get("/api/v1/rrhh/departamentos")
        assert response.status_code == 200
        fila = next(
            d for d in response.json() if d["id_departamento"] == id_dep
        )
        # Campos agregados resueltos en lote por el servicio
        assert fila["total_puestos"] == 1
        assert fila["total_empleados"] == 0
        assert fila["responsable_nombre"] is None
    finally:
        client.delete(f"/api/v1/rrhh/puestos/{id_puesto}")
        client.delete(f"/api/v1/rrhh/departamentos/{id_dep}")


def test_puesto_listado_incluye_nombre_departamento(client):
    nombre_dep = _nombre_unico()
    dep = client.post("/api/v1/rrhh/departamentos", json={"nombre": nombre_dep})
    id_dep = dep.json()["id_departamento"]
    nombre_puesto = _nombre_unico("PUE-TEST")
    puesto = client.post(
        "/api/v1/rrhh/puestos",
        json={"nombre": nombre_puesto, "departamento_id": id_dep},
    )
    id_puesto = puesto.json()["id_puesto"]
    try:
        response = client.get(f"/api/v1/rrhh/puestos?departamento_id={id_dep}")
        assert response.status_code == 200
        fila = next(p for p in response.json() if p["id_puesto"] == id_puesto)
        assert fila["departamento_nombre"] == nombre_dep
        assert fila["total_empleados"] == 0
    finally:
        client.delete(f"/api/v1/rrhh/puestos/{id_puesto}")
        client.delete(f"/api/v1/rrhh/departamentos/{id_dep}")
