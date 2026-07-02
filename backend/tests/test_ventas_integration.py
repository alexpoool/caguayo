"""
Tests de integración para el módulo de Ventas.

Verifica el CRUD completo de /api/v1/ventas:
- Autorización (401 sin token en endpoints protegidos)
- Endpoints públicos (GET list, GET by id)
- Validación de DTOs a nivel HTTP (422 en datos inválidos)
"""
import pytest


# ─────────────────────────────────────────────────────────────
# Autorización — endpoints protegidos deben rechazar sin token
# ─────────────────────────────────────────────────────────────
class TestVentasAuth:
    """Verifica que POST, PUT, DELETE requieran autenticación."""

    def test_post_ventas_sin_token_retorna_401(self, client):
        """POST /api/v1/ventas sin token → 401."""
        response = client.post("/api/v1/ventas", json={
            "id_cliente": 1,
            "detalles": [{"id_producto": 1, "cantidad": 1, "precio_unitario": 100}]
        })
        assert response.status_code == 401, \
            f"POST /ventas sin token: esperado 401, obtenido {response.status_code}"

    def test_put_ventas_sin_token_retorna_401(self, client):
        """PUT /api/v1/ventas/1 sin token → 401."""
        response = client.put("/api/v1/ventas/1", json={"estado": "COMPLETADA"})
        assert response.status_code == 401, \
            f"PUT /ventas/1 sin token: esperado 401, obtenido {response.status_code}"

    def test_delete_ventas_sin_token_retorna_401(self, client):
        """DELETE /api/v1/ventas/1 sin token → 401."""
        response = client.delete("/api/v1/ventas/1")
        assert response.status_code == 401, \
            f"DELETE /ventas/1 sin token: esperado 401, obtenido {response.status_code}"


# ─────────────────────────────────────────────────────────────
# Endpoints públicos — GET sin autenticación
# ─────────────────────────────────────────────────────────────
class TestVentasPublicEndpoints:
    """Verifica que los endpoints GET públicos funcionen sin auth."""

    def test_get_ventas_retorna_lista(self, client):
        """GET /api/v1/ventas retorna 200 y una lista (puede estar vacía)."""
        response = client.get("/api/v1/ventas")
        assert response.status_code == 200, \
            f"GET /ventas: esperado 200, obtenido {response.status_code}"
        data = response.json()
        assert isinstance(data, list), \
            f"GET /ventas: esperado list, obtenido {type(data).__name__}"

    def test_get_ventas_con_filtros_skip_limit(self, client):
        """GET /api/v1/ventas?skip=0&limit=10 retorna 200."""
        response = client.get("/api/v1/ventas?skip=0&limit=10")
        assert response.status_code == 200, \
            f"GET /ventas con skip/limit: esperado 200, obtenido {response.status_code}"

    def test_get_ventas_filtro_por_cliente(self, client):
        """GET /api/v1/ventas?id_cliente=1 retorna 200."""
        response = client.get("/api/v1/ventas?id_cliente=1")
        assert response.status_code == 200, \
            f"GET /ventas?id_cliente=1: esperado 200, obtenido {response.status_code}"
        data = response.json()
        assert isinstance(data, list)

    def test_get_ventas_filtro_por_estado(self, client):
        """GET /api/v1/ventas?estado=PENDIENTE retorna 200."""
        response = client.get("/api/v1/ventas?estado=PENDIENTE")
        assert response.status_code == 200, \
            f"GET /ventas?estado=PENDIENTE: esperado 200, obtenido {response.status_code}"
        data = response.json()
        assert isinstance(data, list)

    def test_get_ventas_filtro_por_fechas(self, client):
        """GET /api/v1/ventas con fecha_inicio y fecha_fin retorna 200."""
        response = client.get(
            "/api/v1/ventas?fecha_inicio=2026-01-01T00:00:00&fecha_fin=2026-12-31T23:59:59"
        )
        assert response.status_code == 200, \
            f"GET /ventas con fechas: esperado 200, obtenido {response.status_code}"

    def test_get_ventas_filtro_combinado(self, client):
        """GET /api/v1/ventas con todos los filtros combinados."""
        response = client.get(
            "/api/v1/ventas?skip=0&limit=5&id_cliente=1&estado=PENDIENTE"
        )
        assert response.status_code == 200

    def test_get_venta_inexistente_retorna_404(self, client):
        """GET /api/v1/ventas/999999 → 404."""
        response = client.get("/api/v1/ventas/999999")
        assert response.status_code == 404, \
            f"GET /ventas/999999: esperado 404, obtenido {response.status_code}"

    def test_get_venta_id_negativo_retorna_error(self, client):
        """GET /api/v1/ventas/-1 → 404 o 422 (según cómo se maneje)."""
        response = client.get("/api/v1/ventas/-1")
        assert response.status_code in [404, 422], \
            f"GET /ventas/-1: esperado 404/422, obtenido {response.status_code}"


# ─────────────────────────────────────────────────────────────
# Validación de DTOs a nivel HTTP — 422 en datos inválidos
# ─────────────────────────────────────────────────────────────
class TestVentasDTOValidationHTTP:
    """Verifica que datos inválidos devuelvan 422 (antes de verificar auth)."""

    def test_crear_venta_sin_detalles_rechaza_422(self, client):
        """POST sin campo 'detalles' → 422 (validación Pydantic antes de auth)."""
        response = client.post("/api/v1/ventas", json={"id_cliente": 1})
        assert response.status_code == 422, \
            f"POST /ventas sin detalles: esperado 422, obtenido {response.status_code}"

    def test_crear_venta_sin_id_cliente_rechaza_422(self, client):
        """POST sin campo 'id_cliente' → 422."""
        response = client.post("/api/v1/ventas", json={
            "detalles": [{"id_producto": 1, "cantidad": 1, "precio_unitario": 100}]
        })
        assert response.status_code == 422, \
            f"POST /ventas sin id_cliente: esperado 422, obtenido {response.status_code}"

    def test_crear_venta_cantidad_cero_rechaza_422(self, client):
        """POST con cantidad=0 → 422 (gt=0)."""
        response = client.post("/api/v1/ventas", json={
            "id_cliente": 1,
            "detalles": [{"id_producto": 1, "cantidad": 0, "precio_unitario": 100}]
        })
        assert response.status_code == 422, \
            f"POST /ventas con cantidad=0: esperado 422, obtenido {response.status_code}"

    def test_crear_venta_cantidad_negativa_rechaza_422(self, client):
        """POST con cantidad=-1 → 422."""
        response = client.post("/api/v1/ventas", json={
            "id_cliente": 1,
            "detalles": [{"id_producto": 1, "cantidad": -1, "precio_unitario": 100}]
        })
        assert response.status_code == 422, \
            f"POST /ventas con cantidad=-1: esperado 422, obtenido {response.status_code}"

    def test_crear_venta_precio_negativo_rechaza_422(self, client):
        """POST con precio_unitario=-1 → 422 (ge=0)."""
        response = client.post("/api/v1/ventas", json={
            "id_cliente": 1,
            "detalles": [{"id_producto": 1, "cantidad": 1, "precio_unitario": -1}]
        })
        assert response.status_code == 422, \
            f"POST /ventas con precio_unitario=-1: esperado 422, obtenido {response.status_code}"

    def test_crear_venta_id_producto_faltante_rechaza_422(self, client):
        """POST sin id_producto en el detalle → 422."""
        response = client.post("/api/v1/ventas", json={
            "id_cliente": 1,
            "detalles": [{"cantidad": 1, "precio_unitario": 100}]
        })
        assert response.status_code == 422, \
            f"POST /ventas sin id_producto: esperado 422, obtenido {response.status_code}"

    def test_crear_venta_body_vacio_rechaza_422(self, client):
        """POST con body vacío → 422."""
        response = client.post("/api/v1/ventas", json={})
        assert response.status_code == 422, \
            f"POST /ventas body vacío: esperado 422, obtenido {response.status_code}"

    def test_actualizar_venta_estado_invalido_rechaza_422(self, client):
        """PUT con estado='INVALIDO' → 422 (validación Pydantic antes de auth)."""
        response = client.put("/api/v1/ventas/1", json={"estado": "INVALIDO"})
        assert response.status_code == 422, \
            f"PUT /ventas/1 estado INVALIDO: esperado 422, obtenido {response.status_code}"

    def test_actualizar_venta_estado_completada_valido_pero_sin_token_401(self, client):
        """PUT con estado='COMPLETADA' sin token → 401 (Datos válidos, falta auth)."""
        response = client.put("/api/v1/ventas/1", json={"estado": "COMPLETADA"})
        assert response.status_code == 401, \
            f"PUT /ventas/1 COMPLETADA sin token: esperado 401, obtenido {response.status_code}"


# ─────────────────────────────────────────────────────────────
# Edge cases — parámetros de paginación
# ─────────────────────────────────────────────────────────────
class TestVentasPaginationEdgeCases:
    """Verifica edge cases de paginación."""

    def test_get_ventas_skip_negativo_retorna_422(self, client):
        """skip=-1 → 422 (ge=0)."""
        response = client.get("/api/v1/ventas?skip=-1")
        assert response.status_code == 422, \
            f"GET /ventas?skip=-1: esperado 422, obtenido {response.status_code}"

    def test_get_ventas_limit_cero_retorna_422(self, client):
        """limit=0 → 422 (ge=1)."""
        response = client.get("/api/v1/ventas?limit=0")
        assert response.status_code == 422, \
            f"GET /ventas?limit=0: esperado 422, obtenido {response.status_code}"

    def test_get_ventas_limit_excesivo_retorna_422(self, client):
        """limit=501 → 422 (le=500)."""
        response = client.get("/api/v1/ventas?limit=501")
        assert response.status_code == 422, \
            f"GET /ventas?limit=501: esperado 422, obtenido {response.status_code}"

    def test_get_ventas_limit_maximo_valido(self, client):
        """limit=500 (límite máximo) retorna 200."""
        response = client.get("/api/v1/ventas?limit=500")
        assert response.status_code == 200, \
            f"GET /ventas?limit=500: esperado 200, obtenido {response.status_code}"

    def test_get_ventas_limit_minimo_valido(self, client):
        """limit=1 (límite mínimo) retorna 200."""
        response = client.get("/api/v1/ventas?limit=1")
        assert response.status_code == 200, \
            f"GET /ventas?limit=1: esperado 200, obtenido {response.status_code}"
