"""
Tests de autorización de endpoints (Fase 1 - Authorization).

Verifican que los endpoints de escritura (PUT, DELETE, PATCH, POST confirmar/liquidar)
rechacen peticiones sin token de autorización.

Estos tests usan TestClient contra la app real y base de datos real.
"""

import pytest


# ─────────────────────────────────────────────────────────────
# Endpoints PUT — deben rechazar sin token
# ─────────────────────────────────────────────────────────────
class TestPutEndpointsWithoutToken:
    """Verifica que PUT endpoints retornen 401 sin token."""

    def test_put_contratos_sin_token(self, client):
        """PUT /api/v1/contratos/1 sin token → 401."""
        response = client.put("/api/v1/contratos/1", json={})
        assert response.status_code == 401, \
            f"PUT /contratos/1: esperado 401, obtenido {response.status_code} - {response.json()}"

    def test_put_suplementos_sin_token(self, client):
        """PUT /api/v1/suplementos/1 sin token → 401."""
        response = client.put("/api/v1/suplementos/1", json={})
        assert response.status_code == 401, \
            f"PUT /suplementos/1: esperado 401, obtenido {response.status_code} - {response.json()}"

    def test_put_facturas_sin_token(self, client):
        """PUT /api/v1/facturas/1 sin token → 401."""
        response = client.put("/api/v1/facturas/1", json={})
        assert response.status_code == 401, \
            f"PUT /facturas/1: esperado 401, obtenido {response.status_code} - {response.json()}"

    def test_put_ventas_efectivo_sin_token(self, client):
        """PUT /api/v1/ventas-efectivo/1 sin token → 401."""
        response = client.put("/api/v1/ventas-efectivo/1", json={})
        assert response.status_code == 401, \
            f"PUT /ventas-efectivo/1: esperado 401, obtenido {response.status_code} - {response.json()}"

    def test_put_liquidaciones_sin_token(self, client):
        """PUT /api/v1/liquidaciones/1 sin token → 401."""
        response = client.put("/api/v1/liquidaciones/1", json={})
        assert response.status_code == 401, \
            f"PUT /liquidaciones/1: esperado 401, obtenido {response.status_code} - {response.json()}"

    def test_put_productos_en_liquidacion_sin_token(self, client):
        """PUT /api/v1/productos-en-liquidacion/1 sin token → 401."""
        response = client.put("/api/v1/productos-en-liquidacion/1", json={})
        assert response.status_code == 401, \
            f"PUT /productos-en-liquidacion/1: esperado 401, obtenido {response.status_code} - {response.json()}"


# ─────────────────────────────────────────────────────────────
# Endpoints DELETE — deben rechazar sin token
# ─────────────────────────────────────────────────────────────
class TestDeleteEndpointsWithoutToken:
    """Verifica que DELETE endpoints retornen 401 sin token."""

    def test_delete_contratos_sin_token(self, client):
        """DELETE /api/v1/contratos/1 sin token → 401."""
        response = client.delete("/api/v1/contratos/1")
        assert response.status_code == 401, \
            f"DELETE /contratos/1: esperado 401, obtenido {response.status_code}"

    def test_delete_suplementos_sin_token(self, client):
        """DELETE /api/v1/suplementos/1 sin token → 401."""
        response = client.delete("/api/v1/suplementos/1")
        assert response.status_code == 401, \
            f"DELETE /suplementos/1: esperado 401, obtenido {response.status_code}"

    def test_delete_facturas_sin_token(self, client):
        """DELETE /api/v1/facturas/1 sin token → 401."""
        response = client.delete("/api/v1/facturas/1")
        assert response.status_code == 401, \
            f"DELETE /facturas/1: esperado 401, obtenido {response.status_code}"

    def test_delete_ventas_efectivo_sin_token(self, client):
        """DELETE /api/v1/ventas-efectivo/1 sin token → 401."""
        response = client.delete("/api/v1/ventas-efectivo/1")
        assert response.status_code == 401, \
            f"DELETE /ventas-efectivo/1: esperado 401, obtenido {response.status_code}"

    def test_delete_anexos_sin_token(self, client):
        """DELETE /api/v1/anexos/1 sin token → 401."""
        response = client.delete("/api/v1/anexos/1")
        assert response.status_code == 401, \
            f"DELETE /anexos/1: esperado 401, obtenido {response.status_code}"

    def test_delete_convenios_sin_token(self, client):
        """DELETE /api/v1/convenios/1 sin token → 401."""
        response = client.delete("/api/v1/convenios/1")
        assert response.status_code == 401, \
            f"DELETE /convenios/1: esperado 401, obtenido {response.status_code}"

    def test_delete_liquidaciones_sin_token(self, client):
        """DELETE /api/v1/liquidaciones/1 sin token → 401."""
        response = client.delete("/api/v1/liquidaciones/1")
        assert response.status_code == 401, \
            f"DELETE /liquidaciones/1: esperado 401, obtenido {response.status_code}"

    def test_delete_productos_en_liquidacion_sin_token(self, client):
        """DELETE /api/v1/productos-en-liquidacion/1 sin token → 401."""
        response = client.delete("/api/v1/productos-en-liquidacion/1")
        assert response.status_code == 401, \
            f"DELETE /productos-en-liquidacion/1: esperado 401, obtenido {response.status_code}"


# ─────────────────────────────────────────────────────────────
# Endpoints PATCH — deben rechazar sin token
# ─────────────────────────────────────────────────────────────
class TestPatchEndpointsWithoutToken:
    """Verifica que PATCH endpoints retornen 401 sin token."""

    def test_patch_anexos_sin_token(self, client):
        """PATCH /api/v1/anexos/1 sin token → 401."""
        response = client.patch("/api/v1/anexos/1", json={})
        assert response.status_code == 401, \
            f"PATCH /anexos/1: esperado 401, obtenido {response.status_code} - {response.json()}"

    def test_patch_convenios_sin_token(self, client):
        """PATCH /api/v1/convenios/1 sin token → 401."""
        response = client.patch("/api/v1/convenios/1", json={})
        assert response.status_code == 401, \
            f"PATCH /convenios/1: esperado 401, obtenido {response.status_code} - {response.json()}"

    def test_patch_liquidaciones_aprobar_sin_token(self, client):
        """PATCH /api/v1/liquidaciones/1/aprobar sin token → 401."""
        response = client.patch("/api/v1/liquidaciones/1/aprobar")
        assert response.status_code == 401, \
            f"PATCH /liquidaciones/1/aprobar: esperado 401, obtenido {response.status_code}"


# ─────────────────────────────────────────────────────────────
# Endpoints POST confirmar/liquidar — deben rechazar sin token
# ─────────────────────────────────────────────────────────────
class TestPostConfirmarLiquidarWithoutToken:
    """Verifica que POST confirmar/liquidar retornen 401 sin token."""

    def test_post_liquidaciones_confirmar_sin_token(self, client):
        """POST /api/v1/liquidaciones/1/confirmar sin token → 401."""
        response = client.post("/api/v1/liquidaciones/1/confirmar", json={})
        assert response.status_code == 401, \
            f"POST /liquidaciones/1/confirmar: esperado 401, obtenido {response.status_code} - {response.json()}"

    def test_post_productos_en_liquidacion_liquidar_sin_token(self, client):
        """POST /api/v1/productos-en-liquidacion/1/liquidar sin token → 401."""
        response = client.post("/api/v1/productos-en-liquidacion/1/liquidar")
        assert response.status_code == 401, \
            f"POST /productos-en-liquidacion/1/liquidar: esperado 401, obtenido {response.status_code}"
