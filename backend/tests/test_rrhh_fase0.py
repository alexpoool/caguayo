"""Tests de la Fase 0 del módulo RRHH.

Cubre el endpoint raíz `GET /api/v1/rrhh/info` (único endpoint de la fase).
"""


def test_rrhh_info_ok(client):
    """El endpoint devuelve la info del módulo y sus 13 submódulos."""
    response = client.get("/api/v1/rrhh/info")
    assert response.status_code == 200
    data = response.json()
    assert data["modulo"] == "rrhh"
    assert data["nombre"] == "Recursos Humanos"
    assert data["estado"] == "fase-0"
    # 12 del esqueleto inicial + Auditoría, que llega con la Fase 9.
    assert len(data["submodulos"]) == 13


def test_rrhh_info_estructura_submodulos(client):
    """Cada submódulo expone id, nombre, funcionalidad y fase."""
    response = client.get("/api/v1/rrhh/info")
    assert response.status_code == 200
    for sub in response.json()["submodulos"]:
        assert sub["id"]
        assert sub["nombre"]
        assert sub["funcionalidad"].startswith("rrhh_")
        assert isinstance(sub["fase"], int) and sub["fase"] >= 1


def test_rrhh_info_funcionalidades_semilladas(client):
    """Las funcionalidades de los submódulos coinciden con las sembradas."""
    response = client.get("/api/v1/rrhh/info")
    esperadas = {
        "rrhh_catalogos", "rrhh_departamentos", "rrhh_puestos", "rrhh_empleados",
        "rrhh_asistencia", "rrhh_deducciones", "rrhh_bonificaciones",
        "rrhh_nomina", "rrhh_pagos", "rrhh_solicitudes", "rrhh_evaluaciones",
        "rrhh_reportes", "rrhh_auditoria",
    }
    obtenidas = {sub["funcionalidad"] for sub in response.json()["submodulos"]}
    assert obtenidas == esperadas


def test_rrhh_info_ruta_inexistente(client):
    """Una ruta rrhh inexistente responde 404 (no 500)."""
    response = client.get("/api/v1/rrhh/no-existe")
    assert response.status_code == 404
