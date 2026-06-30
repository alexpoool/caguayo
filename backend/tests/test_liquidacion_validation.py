"""
Tests de validación de negocio para el servicio de liquidación (Fase 3 - Business Logic).

Verifican que:
1. VentaEfectivoService.create valida stock antes de crear
2. El servicio de liquidación aprobar valida facturas y stock
"""

import pytest
from decimal import Decimal
from datetime import date


class TestVentaEfectivoCreateStockValidation:
    """Verifica que VentaEfectivoService.create valide el stock disponible."""

    @pytest.mark.asyncio
    async def test_crear_venta_efectivo_sin_stock_rechaza(self, db_session):
        """Crear venta efectivo con cantidad > stock debe lanzar BusinessLogicError."""
        from src.services.contrato_service import VentaEfectivoService
        from src.dto import VentaEfectivoCreate
        from src.core.exceptions import BusinessLogicError
        from src.models import Productos

        # Buscar un producto con existencia 0
        from sqlmodel import select
        stmt = select(Productos).where(Productos.stock == 0).limit(1)
        result = await db_session.exec(stmt)
        producto = result.first()

        if not producto:
            pytest.skip("No hay productos con existencia 0 en la BD para probar")

        venta_create = VentaEfectivoCreate(
            slip="TEST-SLIP-001",
            fecha=date.today(),
            id_dependencia=4,
            cajero="Test Cajero",
            id_moneda=1,
            items=[{
                "id_producto": producto.id_producto,
                "cantidad": 99999,  # Cantidad excesiva
                "precio_venta": Decimal("100.00"),
                "id_moneda": 1,
            }],
        )

        with pytest.raises(BusinessLogicError, match="Stock insuficiente"):
            await VentaEfectivoService.create(db_session, venta_create)


class TestLiquidacionAprobarValidacion:
    """Verifica que aprobar liquidación ejecute lógica de negocio completa."""

    @pytest.mark.asyncio
    async def test_aprobar_liquidacion_ya_aprobada_rechaza(self, db_session):
        """Aprobar una liquidación ya liquidada debe lanzar BusinessLogicError."""
        from src.services.liquidacion_service import liquidacion_service
        from src.core.exceptions import BusinessLogicError
        from src.models import Liquidacion
        from sqlmodel import select

        # Buscar una liquidación ya liquidada
        stmt = select(Liquidacion).where(Liquidacion.liquidada == True).limit(1)
        result = await db_session.exec(stmt)
        liquidacion = result.first()

        if not liquidacion:
            pytest.skip("No hay liquidaciones liquidadas en la BD para probar")

        with pytest.raises(BusinessLogicError, match="ya está aprobada"):
            await liquidacion_service.aprobar(db_session, liquidacion.id_liquidacion)

    @pytest.mark.asyncio
    async def test_aprobar_liquidacion_inexistente(self, db_session):
        """Aprobar una liquidación que no existe debe retornar False."""
        from src.services.liquidacion_service import liquidacion_service

        result = await liquidacion_service.aprobar(db_session, 999999999)
        assert result is False
