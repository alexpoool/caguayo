"""Tests del pago por resultado y del catálogo de periodos de evaluación.

Usan el patrón `client` de conftest.py (TestClient contra la BD real). Todos
los datos de prueba llevan el prefijo 2098 y se eliminan en el propio test;
`pytest_sessionfinish` vuelve a limpiar por si un aserto falla.
"""

import uuid
from decimal import Decimal

BASE_PERIODOS = "/api/v1/rrhh/catalogos/periodos-evaluacion"
BASE_EVALUACIONES = "/api/v1/rrhh/evaluaciones"
BASE_OBJETIVOS = "/api/v1/rrhh/objetivos"
BASE_PAGOS = "/api/v1/rrhh/pagos-resultado"
TIPOS_EVAL = "/api/v1/rrhh/catalogos/tipos-evaluacion"

JUNIO = ("2098-06-01", "2098-06-30")
_TIPOS_CACHE: dict = {}


def _sufijo():
    return uuid.uuid4().hex[:8]


def _tipo_id(client):
    if not _TIPOS_CACHE:
        response = client.get(TIPOS_EVAL)
        assert response.status_code == 200, response.text
        _TIPOS_CACHE.update(
            {t["nombre"]: t["id_tipos_evaluaciones"] for t in response.json()}
        )
    return _TIPOS_CACHE["Formal"]


def _crear_empleado(client):
    payload = {
        "codigo_empleado": f"EMP-{_sufijo()}",
        "nombre": f"Nombre{_sufijo()}",
        "apellido": f"Apellido{_sufijo()}",
        "carnet_identidad": f"CI-{_sufijo()}",
        "correo": f"emp-{_sufijo()}@test.cu",
    }
    response = client.post("/api/v1/rrhh/empleados", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def _crear_periodo(client, nombre=None):
    payload = {
        "nombre": nombre or f"2098-periodo-{_sufijo()}",
        "descripcion": "Periodo de prueba",
    }
    response = client.post(BASE_PERIODOS, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def _crear_evaluacion(client, empleado_id, periodo_id):
    payload = {
        "empleado_id": empleado_id,
        "periodo_evaluacion_id": periodo_id,
        "tipo_evaluacion_id": _tipo_id(client),
        "inicio_periodo": JUNIO[0],
        "fin_periodo": JUNIO[1],
    }
    response = client.post(BASE_EVALUACIONES, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def _crear_objetivo(client, empleado_id):
    payload = {
        "empleado_id": empleado_id,
        "nombre": f"Objetivo {_sufijo()}",
        "periodo_inicio": JUNIO[0],
        "periodo_fin": JUNIO[1],
        "peso": 1,
    }
    response = client.post(BASE_OBJETIVOS, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def _puntuar_evaluacion(
    client,
    evaluacion_id,
    empleado_id,
    resultado,
    objetivo_id=None,
    fila_id=None,
):
    if objetivo_id is None:
        objetivo = _crear_objetivo(client, empleado_id)
        objetivo_id = objetivo["id_objetivos"]
    if fila_id is None:
        response = client.post(
            f"{BASE_EVALUACIONES}/{evaluacion_id}/objetivos",
            json={"objetivo_ids": [objetivo_id]},
        )
        assert response.status_code == 201, response.text
        detalle = response.json()
        fila = next(
            f for f in detalle["objetivos"] if f["id_objetivo"] == objetivo_id
        )
        fila_id = fila["fila_id"]
    response = client.put(
        f"{BASE_EVALUACIONES}/{evaluacion_id}/objetivos/{fila_id}",
        json={"resultado": resultado},
    )
    assert response.status_code == 200, response.text
    return {"objetivo_id": objetivo_id, "fila_id": fila_id}


def _limpiar(client, *, pagos=(), evaluaciones=(), empleados=(), periodo=None):
    for pago_id in pagos:
        client.delete(f"{BASE_PAGOS}/{pago_id}")
    for evaluacion_id in evaluaciones:
        client.delete(f"{BASE_EVALUACIONES}/{evaluacion_id}")
    for empleado_id in empleados:
        client.delete(f"/api/v1/rrhh/empleados/{empleado_id}")
    if periodo:
        client.delete(f"{BASE_PERIODOS}/{periodo['id_periodo_evaluacion']}")


def _importe(valor):
    return Decimal(str(valor)).quantize(Decimal("0.01"))


class TestPeriodoEvaluacionCatalogo:
    def test_crud_y_unicidad_por_nombre(self, client):
        creado = _crear_periodo(client)
        try:
            assert creado["nombre"].startswith("2098-periodo-")
            assert creado["activo"] is True
            assert creado["pagado_x_resultado"] is False
            assert "fecha_inicio" not in creado
            assert "fecha_fin" not in creado

            # El nombre es único en el catálogo.
            repetido = client.post(
                BASE_PERIODOS,
                json={"nombre": creado["nombre"]},
            )
            assert repetido.status_code == 409, repetido.text

            response = client.put(
                f"{BASE_PERIODOS}/{creado['id_periodo_evaluacion']}",
                json={"descripcion": "Actualizado", "activo": False},
            )
            assert response.status_code == 200, response.text
            assert response.json()["descripcion"] == "Actualizado"
            assert response.json()["activo"] is False

            listado = client.get(
                BASE_PERIODOS, params={"buscar": creado["nombre"]}
            )
            assert listado.status_code == 200
            assert any(
                p["id_periodo_evaluacion"] == creado["id_periodo_evaluacion"]
                for p in listado.json()
            )
        finally:
            client.delete(f"{BASE_PERIODOS}/{creado['id_periodo_evaluacion']}")

    def test_evaluacion_toma_el_periodo_del_catalogo(self, client):
        periodo = _crear_periodo(client)
        empleado = _crear_empleado(client)
        evaluacion = None
        try:
            evaluacion = _crear_evaluacion(
                client, empleado["id"], periodo["id_periodo_evaluacion"]
            )
            assert evaluacion["periodo_evaluacion_id"] == periodo["id_periodo_evaluacion"]
            assert evaluacion["periodo"] == periodo["nombre"]

            detalle = client.get(f"{BASE_EVALUACIONES}/{evaluacion['id']}")
            assert detalle.status_code == 200
            assert detalle.json()["periodo"] == periodo["nombre"]

            # Renombrar el catálogo sincroniza el texto legado de la evaluación.
            nuevo_nombre = f"2098-renombrado-{_sufijo()}"
            response = client.put(
                f"{BASE_PERIODOS}/{periodo['id_periodo_evaluacion']}",
                json={"nombre": nuevo_nombre},
            )
            assert response.status_code == 200, response.text
            detalle = client.get(f"{BASE_EVALUACIONES}/{evaluacion['id']}")
            assert detalle.json()["periodo"] == nuevo_nombre
        finally:
            _limpiar(
                client,
                evaluaciones=[evaluacion["id"]] if evaluacion else [],
                empleados=[empleado["id"]],
                periodo=periodo,
            )


class TestPagoPorResultado:
    def test_reparte_recalcula_y_permite_descartar(self, client):
        periodo = _crear_periodo(client)
        empleados = []
        evaluaciones = []
        filas_puntuadas = []
        pagos = []
        try:
            # Tres empleados con notas 4, 2 y 3.
            for nota in (4, 2, 3):
                empleado = _crear_empleado(client)
                empleados.append(empleado)
                evaluacion = _crear_evaluacion(
                    client, empleado["id"], periodo["id_periodo_evaluacion"]
                )
                evaluaciones.append(evaluacion)
                filas_puntuadas.append(
                    _puntuar_evaluacion(
                        client, evaluacion["id"], empleado["id"], nota
                    )
                )

            preview = client.get(
                f"{BASE_PAGOS}/preview",
                params={
                    "periodo_evaluacion_id": periodo["id_periodo_evaluacion"]
                },
            )
            assert preview.status_code == 200, preview.text
            datos_preview = preview.json()
            assert datos_preview["periodo_nombre"] == periodo["nombre"]
            assert len(datos_preview["empleados"]) == 3
            assert datos_preview["inicio_periodo"] == JUNIO[0]
            assert datos_preview["fin_periodo"] == JUNIO[1]
            assert datos_preview["pagado_x_resultado"] is False

            todos = [e["id"] for e in empleados]
            response = client.post(
                BASE_PAGOS,
                json={
                    "periodo_evaluacion_id": periodo["id_periodo_evaluacion"],
                    "descripcion": "Reparto de prueba",
                    "inicio_periodo": JUNIO[0],
                    "fin_periodo": JUNIO[1],
                    "monto": 3000,
                    "empleado_ids": todos,
                },
            )
            assert response.status_code == 201, response.text
            pago = response.json()
            pagos.append(pago["id_pago_x_resultado"])

            assert Decimal(pago["promedio_general"]) == Decimal("3.0000")
            assert Decimal(pago["suma_coeficientes_empleados"]) == Decimal("3.0000")
            importes = sorted(
                _importe(fila["monto_individual"])
                for fila in pago["empleados"]
            )
            assert importes == [
                Decimal("666.70"),
                Decimal("1000.00"),
                Decimal("1333.30"),
            ]

            # El catálogo y el preview reflejan que el periodo ya se pagó.
            catalogo = client.get(
                f"{BASE_PERIODOS}/{periodo['id_periodo_evaluacion']}"
            )
            assert catalogo.status_code == 200, catalogo.text
            assert catalogo.json()["pagado_x_resultado"] is True
            listado_catalogo = client.get(
                BASE_PERIODOS, params={"buscar": periodo["nombre"]}
            )
            fila_catalogo = next(
                p
                for p in listado_catalogo.json()
                if p["id_periodo_evaluacion"] == periodo["id_periodo_evaluacion"]
            )
            assert fila_catalogo["pagado_x_resultado"] is True
            preview_pagado = client.get(
                f"{BASE_PAGOS}/preview",
                params={
                    "periodo_evaluacion_id": periodo["id_periodo_evaluacion"]
                },
            )
            assert preview_pagado.json()["pagado_x_resultado"] is True

            # Cambiar la nota de 4 a 5 debe recalcular el lote automáticamente.
            _puntuar_evaluacion(
                client,
                evaluaciones[0]["id"],
                empleados[0]["id"],
                5,
                objetivo_id=filas_puntuadas[0]["objetivo_id"],
                fila_id=filas_puntuadas[0]["fila_id"],
            )
            actualizado = client.get(f"{BASE_PAGOS}/{pago['id_pago_x_resultado']}")
            assert actualizado.status_code == 200, actualizado.text
            actualizado_json = actualizado.json()
            assert Decimal(actualizado_json["promedio_general"]) == Decimal(
                "3.3333"
            )
            importes = sorted(
                _importe(fila["monto_individual"])
                for fila in actualizado_json["empleados"]
            )
            assert importes == [
                Decimal("600.00"),
                Decimal("900.00"),
                Decimal("1500.00"),
            ]

            # Un periodo solo puede pagarse una vez por resultado.
            repetido = client.post(
                BASE_PAGOS,
                json={
                    "periodo_evaluacion_id": periodo["id_periodo_evaluacion"],
                    "descripcion": "Segundo intento",
                    "inicio_periodo": JUNIO[0],
                    "fin_periodo": JUNIO[1],
                    "monto": 500,
                    "empleado_ids": todos[:2],
                },
            )
            assert repetido.status_code == 409, repetido.text
            assert "Ya existe un pago por resultado" in repetido.json()["detail"]

            # Al eliminar el lote el periodo vuelve a estar disponible.
            assert (
                client.delete(
                    f"{BASE_PAGOS}/{pago['id_pago_x_resultado']}"
                ).status_code
                == 200
            )
            pagos.remove(pago["id_pago_x_resultado"])
            catalogo = client.get(
                f"{BASE_PERIODOS}/{periodo['id_periodo_evaluacion']}"
            )
            assert catalogo.json()["pagado_x_resultado"] is False

            # Descartar al tercer empleado: solo se reparte entre los dos
            # seleccionados y se guardan solo sus filas.
            response = client.post(
                BASE_PAGOS,
                json={
                    "periodo_evaluacion_id": periodo["id_periodo_evaluacion"],
                    "descripcion": "Subconjunto",
                    "inicio_periodo": JUNIO[0],
                    "fin_periodo": JUNIO[1],
                    "monto": 1000,
                    "empleado_ids": todos[:2],
                },
            )
            assert response.status_code == 201, response.text
            pago_subset = response.json()
            pagos.append(pago_subset["id_pago_x_resultado"])
            assert len(pago_subset["empleados"]) == 2
            assert {
                fila["empleado_id"] for fila in pago_subset["empleados"]
            } == set(todos[:2])

            listado = client.get(BASE_PAGOS, params={"limit": 10})
            assert listado.status_code == 200
            ids = {p["id_pago_x_resultado"] for p in listado.json()}
            assert set(pagos).issubset(ids)
        finally:
            _limpiar(
                client,
                pagos=pagos,
                evaluaciones=[e["id"] for e in evaluaciones],
                empleados=[e["id"] for e in empleados],
                periodo=periodo,
            )

    def test_rechaza_si_no_hay_puntuaciones(self, client):
        periodo = _crear_periodo(client)
        empleado = _crear_empleado(client)
        evaluacion = None
        try:
            evaluacion = _crear_evaluacion(
                client, empleado["id"], periodo["id_periodo_evaluacion"]
            )
            response = client.post(
                BASE_PAGOS,
                json={
                    "periodo_evaluacion_id": periodo["id_periodo_evaluacion"],
                    "inicio_periodo": JUNIO[0],
                    "fin_periodo": JUNIO[1],
                    "monto": 1000,
                    "empleado_ids": [empleado["id"]],
                },
            )
            assert response.status_code == 400, response.text
            assert "puntuación" in response.json()["detail"].lower()
        finally:
            _limpiar(
                client,
                evaluaciones=[evaluacion["id"]] if evaluacion else [],
                empleados=[empleado["id"]],
                periodo=periodo,
            )
