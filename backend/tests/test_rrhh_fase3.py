"""Tests de la Fase 3 del módulo RRHH — Empleados.

Usan el patrón `client` de conftest.py (TestClient contra la BD real).
Los tests crean y limpian sus propios registros; el código
(`codigo_empleado`, `EMP-XXXX`) lo genera la BD con la secuencia
`empleado_codigo_seq`.
"""

import uuid


def _sufijo():
    return uuid.uuid4().hex[:8]


def _carnet():
    return f"CI-{uuid.uuid4().hex[:10]}"


def _correo():
    return f"emp-{uuid.uuid4().hex[:8]}@test.cu"


def _crear_empleado(client, **kwargs):
    payload = {
        "nombre": f"Nombre{_sufijo()}",
        "apellido": f"Apellido{_sufijo()}",
        "carnet_identidad": _carnet(),
        "correo": _correo(),
    }
    payload.update(kwargs)
    response = client.post("/api/v1/rrhh/empleados", json=payload)
    return response


def _limpiar(client, empleado_id):
    client.delete(f"/api/v1/rrhh/empleados/{empleado_id}")


# ── Alta y código autogenerado ──────────────────────────────────────────────


def test_crear_empleado_ok(client):
    response = _crear_empleado(client)
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["id"] is not None
    assert data["activo"] is True
    assert data["estado"] == "activo"
    _limpiar(client, data["id"])


def test_codigo_empleado_generado_por_bd(client):
    """El código lo genera la BD con el prefijo EMP-, no se envía en el alta."""
    response = _crear_empleado(client)
    assert response.status_code == 201, response.text
    data = response.json()
    try:
        assert data["codigo_empleado"] is not None
        assert data["codigo_empleado"].startswith("EMP-")
    finally:
        _limpiar(client, data["id"])


def test_codigos_son_unicos(client):
    """Dos altas seguidas generan códigos distintos (secuencia en BD)."""
    r1 = _crear_empleado(client)
    r2 = _crear_empleado(client)
    id1 = r1.json()["id"]
    id2 = r2.json()["id"]
    try:
        assert r1.json()["codigo_empleado"] != r2.json()["codigo_empleado"]
    finally:
        _limpiar(client, id1)
        _limpiar(client, id2)


def test_fecha_contratacion_default_hoy(client):
    from datetime import date

    response = _crear_empleado(client)
    data = response.json()
    try:
        assert data["fecha_contratacion"] == date.today().isoformat()
    finally:
        _limpiar(client, data["id"])


# ── Únicos: carnet y correo ─────────────────────────────────────────────────


def test_carnet_duplicado_conflict(client):
    carnet = _carnet()
    primero = _crear_empleado(client, carnet_identidad=carnet)
    id1 = primero.json()["id"]
    try:
        segundo = _crear_empleado(client, carnet_identidad=carnet)
        assert segundo.status_code == 409
    finally:
        _limpiar(client, id1)


def test_correo_duplicado_conflict(client):
    correo = _correo()
    primero = _crear_empleado(client, correo=correo)
    id1 = primero.json()["id"]
    try:
        segundo = _crear_empleado(client, correo=correo)
        assert segundo.status_code == 409
    finally:
        _limpiar(client, id1)


def test_carnet_duplicado_en_update_conflict(client):
    r1 = _crear_empleado(client)
    r2 = _crear_empleado(client)
    id1, id2 = r1.json()["id"], r2.json()["id"]
    try:
        response = client.put(
            f"/api/v1/rrhh/empleados/{id2}",
            json={"carnet_identidad": r1.json()["carnet_identidad"]},
        )
        assert response.status_code == 409
    finally:
        _limpiar(client, id1)
        _limpiar(client, id2)


# ── Validación de asignaciones ──────────────────────────────────────────────


def test_puesto_inexistente_404(client):
    response = _crear_empleado(client, puesto_id=999999)
    assert response.status_code == 404


def test_departamento_inexistente_404(client):
    response = _crear_empleado(client, departamento_id=999999)
    assert response.status_code == 404


def test_tipo_contrato_inexistente_404(client):
    response = _crear_empleado(client, tipo_contrato_id=999999)
    assert response.status_code == 404


def test_supervisor_inexistente_404(client):
    response = _crear_empleado(client, supervisor=999999)
    assert response.status_code == 404


def test_supervisor_propio_400(client):
    """Un empleado no puede ser su propio supervisor."""
    creado = _crear_empleado(client)
    id_emp = creado.json()["id"]
    try:
        response = client.put(
            f"/api/v1/rrhh/empleados/{id_emp}", json={"supervisor": id_emp}
        )
        assert response.status_code == 400
    finally:
        _limpiar(client, id_emp)


def test_asignaciones_validas_ok(client):
    """Asignar puesto, departamento y tipo de contrato existentes funciona."""
    dep = client.post("/api/v1/rrhh/departamentos", json={"nombre": f"DEP-{_sufijo()}"})
    id_dep = dep.json()["id_departamento"]
    pue = client.post(
        "/api/v1/rrhh/puestos",
        json={"nombre": f"PUE-{_sufijo()}", "departamento_id": id_dep},
    )
    id_pue = pue.json()["id_puesto"]
    tic = client.post(
        "/api/v1/rrhh/catalogos/tipos-contrato", json={"nombre": f"TC-{_sufijo()}"}
    )
    id_tic = tic.json()["id_tipo_contrato"]
    try:
        response = _crear_empleado(
            client,
            puesto_id=id_pue,
            departamento_id=id_dep,
            tipo_contrato_id=id_tic,
        )
        assert response.status_code == 201, response.text
        data = response.json()
        assert data["puesto_id"] == id_pue
        assert data["departamento_id"] == id_dep
        assert data["tipo_contrato_id"] == id_tic
    finally:
        if response.status_code == 201:
            _limpiar(client, response.json()["id"])
        client.delete(f"/api/v1/rrhh/puestos/{id_pue}")
        client.delete(f"/api/v1/rrhh/catalogos/tipos-contrato/{id_tic}")
        client.delete(f"/api/v1/rrhh/departamentos/{id_dep}")


# ── Validación de estado, asistencia y horario ──────────────────────────────


def test_estado_invalido_400(client):
    response = _crear_empleado(client, estado="inventado")
    assert response.status_code == 400


def test_estados_validos_ok(client):
    for estado in ("activo", "suspendido", "vacaciones", "terminado"):
        response = _crear_empleado(client, estado=estado)
        assert response.status_code == 201, response.text
        assert response.json()["estado"] == estado
        _limpiar(client, response.json()["id"])


def test_tipo_asistencia_invalido_400(client):
    response = _crear_empleado(client, tipo_asistencia="CUALQUIERA")
    assert response.status_code == 400


def test_tipo_asistencia_libre_ok(client):
    response = _crear_empleado(client, tipo_asistencia="LIBRE")
    assert response.status_code == 201
    assert response.json()["tipo_asistencia"] == "LIBRE"
    _limpiar(client, response.json()["id"])


def test_horario_invertido_400(client):
    """horario_final debe ser posterior a horario_inicio."""
    response = _crear_empleado(client, horario_inicio="17:00", horario_final="08:00")
    assert response.status_code == 400


def test_horario_valido_ok(client):
    response = _crear_empleado(client, horario_inicio="08:00", horario_final="17:00")
    assert response.status_code == 201, response.text
    assert response.json()["horario_inicio"] == "08:00:00"
    _limpiar(client, response.json()["id"])


def test_salario_negativo_rechazado(client):
    """El DTO valida `salario >= 0` (mismo criterio que el CHECK de BD)."""
    response = _crear_empleado(client, salario=-100)
    assert response.status_code == 422


# ── Listado, búsqueda y filtros ─────────────────────────────────────────────


def test_listar_ok(client):
    response = client.get("/api/v1/rrhh/empleados")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_listado_incluye_nombres_asignados(client):
    """El listado resuelve los nombres de puesto y departamento en lote."""
    dep = client.post("/api/v1/rrhh/departamentos", json={"nombre": f"DEP-{_sufijo()}"})
    id_dep = dep.json()["id_departamento"]
    pue = client.post(
        "/api/v1/rrhh/puestos",
        json={"nombre": f"PUE-{_sufijo()}", "departamento_id": id_dep},
    )
    id_pue = pue.json()["id_puesto"]
    creado = _crear_empleado(client, puesto_id=id_pue, departamento_id=id_dep)
    id_emp = creado.json()["id"]
    try:
        response = client.get(f"/api/v1/rrhh/empleados?departamento_id={id_dep}")
        assert response.status_code == 200
        fila = next(e for e in response.json() if e["id"] == id_emp)
        assert fila["puesto_nombre"] is not None
        assert fila["departamento_nombre"] == dep.json()["nombre"]
    finally:
        _limpiar(client, id_emp)
        client.delete(f"/api/v1/rrhh/puestos/{id_pue}")
        client.delete(f"/api/v1/rrhh/departamentos/{id_dep}")


def test_buscar_por_nombre(client):
    marca = f"Busca{_sufijo()}"
    creado = _crear_empleado(client, nombre=marca)
    id_emp = creado.json()["id"]
    try:
        response = client.get(f"/api/v1/rrhh/empleados?buscar={marca}")
        assert response.status_code == 200
        assert any(e["id"] == id_emp for e in response.json())
    finally:
        _limpiar(client, id_emp)


def test_buscar_por_apellido(client):
    marca = f"Apellido{_sufijo()}"
    creado = _crear_empleado(client, apellido=marca)
    id_emp = creado.json()["id"]
    try:
        response = client.get(f"/api/v1/rrhh/empleados?buscar={marca}")
        assert any(e["id"] == id_emp for e in response.json())
    finally:
        _limpiar(client, id_emp)


def test_filtro_por_estado(client):
    marca = f"Suspend{_sufijo()}"
    creado = _crear_empleado(client, nombre=marca, estado="suspendido")
    id_emp = creado.json()["id"]
    try:
        response = client.get("/api/v1/rrhh/empleados?estado=suspendido")
        assert response.status_code == 200
        assert any(e["id"] == id_emp for e in response.json())
    finally:
        _limpiar(client, id_emp)


def test_filtro_estado_invalido_400(client):
    response = client.get("/api/v1/rrhh/empleados?estado=inventado")
    assert response.status_code == 400


def test_endpoint_buscar_selector(client):
    """GET /rrhh/empleados/buscar devuelve el selector abreviado."""
    marca = f"Select{_sufijo()}"
    creado = _crear_empleado(client, nombre=marca)
    id_emp = creado.json()["id"]
    try:
        response = client.get(f"/api/v1/rrhh/empleados/buscar?q={marca}")
        assert response.status_code == 200
        fila = next(e for e in response.json() if e["id"] == id_emp)
        assert set(fila.keys()) >= {"id", "nombre", "apellido", "estado", "activo"}
    finally:
        _limpiar(client, id_emp)


# ── Detalle ─────────────────────────────────────────────────────────────────


def test_detalle_ok(client):
    creado = _crear_empleado(client)
    id_emp = creado.json()["id"]
    try:
        response = client.get(f"/api/v1/rrhh/empleados/{id_emp}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == id_emp
        assert data["usuario_vinculado"] is None
    finally:
        _limpiar(client, id_emp)


def test_detalle_no_encontrado_404(client):
    response = client.get("/api/v1/rrhh/empleados/999999")
    assert response.status_code == 404


def test_detalle_vincula_usuario_por_ci(client):
    """El detalle cruza `usuarios.ci` con `empleados.carnet_identidad`."""
    creado = _crear_empleado(client)
    id_emp = creado.json()["id"]
    try:
        detalle = client.get(f"/api/v1/rrhh/empleados/{id_emp}")
        assert detalle.status_code == 200
        assert "usuario_vinculado" in detalle.json()
    finally:
        _limpiar(client, id_emp)


# ── Edición ─────────────────────────────────────────────────────────────────


def test_actualizar_ok(client):
    creado = _crear_empleado(client)
    id_emp = creado.json()["id"]
    try:
        nuevo_nombre = f"Renombrado{_sufijo()}"
        response = client.put(
            f"/api/v1/rrhh/empleados/{id_emp}", json={"nombre": nuevo_nombre}
        )
        assert response.status_code == 200
        assert response.json()["nombre"] == nuevo_nombre
    finally:
        _limpiar(client, id_emp)


def test_actualizar_no_encontrado_404(client):
    response = client.put("/api/v1/rrhh/empleados/999999", json={"nombre": "X"})
    assert response.status_code == 404


def test_actualizar_estado_invalido_400(client):
    creado = _crear_empleado(client)
    id_emp = creado.json()["id"]
    try:
        response = client.put(
            f"/api/v1/rrhh/empleados/{id_emp}", json={"estado": "inventado"}
        )
        assert response.status_code == 400
    finally:
        _limpiar(client, id_emp)


def test_actualizar_no_modifica_codigo(client):
    """El código no es editable: no está en el DTO de actualización."""
    creado = _crear_empleado(client)
    id_emp = creado.json()["id"]
    codigo_original = creado.json()["codigo_empleado"]
    try:
        response = client.put(
            f"/api/v1/rrhh/empleados/{id_emp}",
            json={"codigo_empleado": "EMP-9999", "nombre": f"Nuevo{_sufijo()}"},
        )
        assert response.status_code == 200
        assert response.json()["codigo_empleado"] == codigo_original
    finally:
        _limpiar(client, id_emp)


# ── Eliminación ─────────────────────────────────────────────────────────────


def test_eliminar_ok(client):
    """Sin historial ni subordinados: borrado físico."""
    creado = _crear_empleado(client)
    id_emp = creado.json()["id"]
    response = client.delete(f"/api/v1/rrhh/empleados/{id_emp}")
    assert response.status_code == 200
    assert response.json()["accion"] == "eliminado"
    assert client.get(f"/api/v1/rrhh/empleados/{id_emp}").status_code == 404


def test_eliminar_no_encontrado_404(client):
    response = client.delete("/api/v1/rrhh/empleados/999999")
    assert response.status_code == 404


def test_eliminar_con_subordinados_desactiva(client):
    """Si alguien lo tiene de supervisor, se desactiva en lugar de borrar."""
    jefe = _crear_empleado(client)
    id_jefe = jefe.json()["id"]
    sub = _crear_empleado(client, supervisor=id_jefe)
    id_sub = sub.json()["id"]
    try:
        response = client.delete(f"/api/v1/rrhh/empleados/{id_jefe}")
        assert response.status_code == 200
        assert response.json()["accion"] == "desactivado"
        # sigue existiendo pero inactivo
        detalle = client.get(f"/api/v1/rrhh/empleados/{id_jefe}")
        assert detalle.status_code == 200
        assert detalle.json()["activo"] is False
    finally:
        _limpiar(client, id_sub)
        _limpiar(client, id_jefe)


def test_eliminar_responsable_de_departamento_desactiva(client):
    dep = client.post("/api/v1/rrhh/departamentos", json={"nombre": f"DEP-{_sufijo()}"})
    id_dep = dep.json()["id_departamento"]
    creado = _crear_empleado(client)
    id_emp = creado.json()["id"]
    # el responsable se asigna desde el endpoint de departamentos
    client.put(
        f"/api/v1/rrhh/departamentos/{id_dep}", json={"responsable": id_emp}
    )
    try:
        response = client.delete(f"/api/v1/rrhh/empleados/{id_emp}")
        assert response.status_code == 200
        assert response.json()["accion"] == "desactivado"
    finally:
        _limpiar(client, id_emp)
        client.delete(f"/api/v1/rrhh/departamentos/{id_dep}")
