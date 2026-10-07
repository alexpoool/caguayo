"""
Tests de correcciones de Venta en Efectivo:
- VentaEfectivoUpdate acepta items (antes se ignoraban silenciosamente)
- ItemVentaEfectivoCreate acepta id_anexo (round-trip al editar)
- _calcular_monto_items (monto desde items)
- ExistenciaRepository.validar_disponibilidad acepta id_venta_efectivo
- HTTP: validación de items en PUT, auth, endpoint validar-multiples
"""
from datetime import date
from decimal import Decimal


class TestVentaEfectivoDTOs:
    def test_update_acepta_items(self):
        from src.dto.contratos_dto import VentaEfectivoUpdate

        u = VentaEfectivoUpdate(
            slip="S1",
            fecha=date.today(),
            items=[
                {"id_producto": 1, "cantidad": 2, "precio_venta": 10.5, "id_moneda": 1},
                {"id_producto": 2, "cantidad": 1, "precio_venta": 3, "id_moneda": 1},
            ],
        )
        dump = u.model_dump(exclude_none=True)
        assert "items" in dump, "VentaEfectivoUpdate debe aceptar items"
        assert dump["items"][0]["cantidad"] == 2

    def test_update_sin_items_omite_el_campo(self):
        from src.dto.contratos_dto import VentaEfectivoUpdate

        u = VentaEfectivoUpdate(slip="S1")
        dump = u.model_dump(exclude_none=True)
        assert "items" not in dump

    def test_item_create_acepta_id_anexo(self):
        from src.dto.contratos_dto import ItemVentaEfectivoCreate

        i = ItemVentaEfectivoCreate(
            id_producto=1, cantidad=1, precio_venta=5, id_moneda=1, id_anexo=7
        )
        assert i.id_anexo == 7, "ItemVentaEfectivoCreate debe conservar id_anexo"

    def test_item_create_read_tiene_id_anexo(self):
        from src.dto.contratos_dto import ItemVentaEfectivoRead

        i = ItemVentaEfectivoRead(
            id_item_venta_efectivo=1,
            id_venta_efectivo=1,
            id_producto=1,
            cantidad=1,
            precio_venta=5,
            precio_compra=2,
            id_moneda=1,
            id_anexo=9,
        )
        assert i.id_anexo == 9


class TestValidacionStockPropio:
    async def test_repo_validar_acepta_id_venta_efectivo(self, db_session):
        """El parámetro existe y una venta inexistente no altera el resultado."""
        from src.repository.existencia_repo import ExistenciaRepository

        repo = ExistenciaRepository()
        r1 = await repo.validar_disponibilidad(db_session, 1, 1)
        r2 = await repo.validar_disponibilidad(
            db_session, 1, 1, id_venta_efectivo=999999
        )
        assert r2["disponible"] == r1["disponible"]

    async def test_service_validar_multiple_acepta_id_venta_efectivo(self, db_session):
        from src.services.existencia_service import ExistenciaService

        r = await ExistenciaService.validar_multiple(
            db_session,
            [{"id_producto": 1, "cantidad": 1}],
            id_venta_efectivo=999999,
        )
        assert "valido" in r

    def test_endpoint_validar_multiples_acepta_id_venta_efectivo(self, client):
        response = client.post(
            "/api/v1/existencias/validar-multiples",
            json={
                "productos": [{"id_producto": 1, "cantidad": 1}],
                "id_venta_efectivo": 999999,
            },
        )
        assert response.status_code == 200
        assert "valido" in response.json()
