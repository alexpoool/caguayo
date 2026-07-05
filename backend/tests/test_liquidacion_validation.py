"""
Tests de validación de negocio para el servicio de liquidación (Fase 3 - Business Logic).

Verifican que:
1. VentaEfectivoService.create valida stock antes de crear
2. El servicio de liquidación aprobar valida facturas y stock
3. create_liquidacion rechaza productos sin factura (tipo_compra != FACTURA)
4. confirmar_liquidacion rechaza productos sin factura (tipo_compra != FACTURA)
"""

import pytest
from decimal import Decimal
from datetime import date, datetime
from unittest.mock import AsyncMock, MagicMock, patch


class TestVentaEfectivoCreateStockValidation:
    """Verifica que VentaEfectivoService.create valide el stock disponible."""

    @pytest.mark.asyncio
    async def test_crear_venta_efectivo_sin_stock_rechaza(self, db_session):
        """Crear venta efectivo con cantidad > stock debe lanzar BusinessLogicError."""
        from src.services.contrato_service import VentaEfectivoService
        from src.dto import VentaEfectivoCreate
        from src.core.exceptions import BusinessLogicError
        from src.models import Productos
        from src.services.existencia_service import ExistenciaService
        from sqlmodel import select

        # Buscar un producto con existencia 0
        stmt = select(Productos).limit(50)
        result = await db_session.exec(stmt)
        producto = None
        for p in result.all():
            stock = await ExistenciaService.calcular_stock_producto(
                db_session, p.id_producto
            )
            if stock == 0:
                producto = p
                break

        if not producto:
            pytest.skip("No hay productos con existencia 0 en la BD para probar")

        venta_create = VentaEfectivoCreate(
            slip="TEST-SLIP-001",
            fecha=date.today(),
            id_dependencia=4,
            cajero="Test Cajero",
            id_moneda=1,
            items=[
                {
                    "id_producto": producto.id_producto,
                    "cantidad": 99999,  # Cantidad excesiva
                    "precio_venta": Decimal("100.00"),
                    "id_moneda": 1,
                }
            ],
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


# ══════════════════════════════════════════════════════════════════
# Helpers: crear productos_en_liquidacion mock para los tests
# ══════════════════════════════════════════════════════════════════


def _make_producto_mock(tipo_compra, **overrides):
    """Crea un MagicMock simulando ProductosEnLiquidacion con los atributos mínimos."""
    defaults = {
        "id_producto_en_liquidacion": 1,
        "codigo": "PROD-001",
        "id_producto": 1,
        "cantidad": 5,
        "precio": Decimal("10.00"),
        "id_moneda": 1,
        "tipo_compra": tipo_compra,
        "id_factura": None,
        "id_venta_efectivo": None,
        "id_anexo": None,
        "liquidada": False,
        "fecha": datetime(2026, 1, 1),
        "fecha_liquidacion": None,
        "producto": None,
        "moneda": None,
        "anexo": None,
        "info_factura": None,
    }
    defaults.update(overrides)
    mock = MagicMock()
    for k, v in defaults.items():
        setattr(mock, k, v)
    return mock


def _make_producto_read_mock():
    """Mock para ProductoSimpleRead (relación anidada)."""
    m = MagicMock()
    m.codigo = "P-001"
    m.nombre = "Producto Test"
    m.descripcion = "Descripción test"
    m.precio_venta = Decimal("10.00")
    m.precio_minimo = Decimal("1.00")
    m.id_producto = 1
    return m


def _make_moneda_read_mock():
    """Mock para MonedaRead (relación anidada)."""
    m = MagicMock()
    m.id_moneda = 1
    m.nombre = "Bolivianos"
    m.denominacion = "BOB"
    m.simbolo = "Bs."
    return m


def _make_anexo_simple_mock():
    """Mock para AnexoSimpleRead (relación anidada)."""
    m = MagicMock()
    m.id_anexo = 1
    m.nombre_anexo = "Anexo Test"
    return m


def _make_liquidacion_mock(**overrides):
    """Crea un MagicMock simulando una Liquidacion con los atributos necesarios."""
    defaults = {
        "id_liquidacion": 1,
        "codigo": "C.2026.1",
        "id_cliente": 1,
        "id_convenio": None,
        "id_anexo": None,
        "id_moneda": 1,
        "liquidada": False,
        "fecha_emision": date.today(),
        "fecha_liquidacion": None,
        "observaciones": None,
        "devengado": Decimal("0.00"),
        "tributario": Decimal("0.00"),
        "comision_bancaria": Decimal("0.00"),
        "gasto_empresa": Decimal("0.00"),
        "importe": Decimal("50.00"),
        "importe_caguayo": Decimal("5.00"),
        "tributario_monto": Decimal("0.00"),
        "porcentaje_caguayo": Decimal("10.00"),
        "neto_pagar": Decimal("45.00"),
        "tipo_pago": "TRANSFERENCIA",
        "moneda": None,
    }
    defaults.update(overrides)
    mock = MagicMock()
    for k, v in defaults.items():
        setattr(mock, k, v)
    return mock


# ══════════════════════════════════════════════════════════════════
# 3. create_liquidacion — validación tipo_compra == FACTURA
# ══════════════════════════════════════════════════════════════════


class TestCreateLiquidacionTipoCompraValidation:
    """Verifica que create_liquidacion rechace productos sin factura (tipo_compra != FACTURA).

    Todos los tests de esta clase usan mocks puros (sin BD real).
    """

    @pytest.mark.asyncio
    async def test_happy_path_todos_factura(self):
        """Happy path: todos los productos tienen tipo_compra=FACTURA → la validación pasa.

        Se mockea el flujo completo para verificar que create_liquidacion
        retorna una LiquidacionRead sin lanzar ValueError por tipo_compra.
        """
        from src.services.liquidacion_service import liquidacion_service
        from src.dto import LiquidacionCreate
        from src.models.producto import Productos
        from src.models.contrato import Factura

        # Arrange: productos mock con tipo_compra=FACTURA
        producto_mock = _make_producto_mock("FACTURA", id_factura=1)

        # Mock del producto real (para db.get(Productos, ...))
        producto_real = MagicMock(spec=Productos)
        producto_real.precio_venta = Decimal("10.00")

        # Mock de factura (para db.get(Factura, ...))
        factura_mock = MagicMock(spec=Factura)
        factura_mock.monto = Decimal("500.00")

        # Mock de liquidación resultante (para get_with_relations)
        liquidacion_db_mock = _make_liquidacion_mock(
            id_liquidacion=1,
            codigo="C.2026.1",
            importe=Decimal("50.00"),
        )

        mock_db = AsyncMock()

        async def mock_db_get(model, ident):
            if model is Factura:
                return factura_mock
            if model is Productos:
                return producto_real
            return None

        mock_db.get = AsyncMock(side_effect=mock_db_get)
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()
        mock_db.exec = AsyncMock()

        data = LiquidacionCreate(
            id_cliente=1,
            id_moneda=1,
            producto_ids=[1],
        )

        with patch(
            "src.services.liquidacion_service.productos_en_liquidacion_repo.get_by_ids",
            return_value=[producto_mock],
        ):
            with patch(
                "src.services.liquidacion_service.productos_en_liquidacion_repo.get_codigo_anio",
                return_value=0,
            ):
                with patch(
                    "src.repository.pago_repo.pago_repo.get_total_pagado",
                    return_value=Decimal("500.00"),
                ):
                    with patch(
                        "src.services.liquidacion_service.ExistenciaService.validar_multiple",
                        return_value={"valido": True, "errores": []},
                    ):
                        with patch(
                            "src.services.liquidacion_service.liquidacion_repo.get_codigo_anio",
                            return_value=1,
                        ):
                            with patch(
                                "src.services.liquidacion_service.liquidacion_repo.get_with_relations",
                                return_value=liquidacion_db_mock,
                            ):
                                # Act
                                result = await liquidacion_service.create_liquidacion(
                                    mock_db, data
                                )

        # Assert
        assert result is not None
        assert result.id_liquidacion == 1
        assert result.codigo == "C.2026.1"

    @pytest.mark.asyncio
    async def test_rechaza_venta_efectivo(self):
        """Un producto con tipo_compra=VENTA_EFECTIVO debe lanzar ValueError.

        La validación ocurre ANTES de cualquier otra lógica, así que basta
        con mockear get_by_ids.
        """
        from src.services.liquidacion_service import liquidacion_service
        from src.dto import LiquidacionCreate

        # Arrange: producto con tipo_compra=VENTA_EFECTIVO
        producto_mock = _make_producto_mock(
            "VENTA_EFECTIVO", codigo="VE-001", id_producto=10
        )

        mock_db = AsyncMock()
        data = LiquidacionCreate(
            id_cliente=1,
            id_moneda=1,
            producto_ids=[1],
        )

        with patch(
            "src.services.liquidacion_service.productos_en_liquidacion_repo.get_by_ids",
            return_value=[producto_mock],
        ):
            # Act & Assert
            with pytest.raises(ValueError, match="no está facturado"):
                await liquidacion_service.create_liquidacion(mock_db, data)

    @pytest.mark.asyncio
    async def test_rechaza_anexo(self):
        """Un producto con tipo_compra=ANEXO debe lanzar ValueError."""
        from src.services.liquidacion_service import liquidacion_service
        from src.dto import LiquidacionCreate

        # Arrange: producto con tipo_compra=ANEXO
        producto_mock = _make_producto_mock(
            "ANEXO", codigo="ANX-001", id_producto=20
        )

        mock_db = AsyncMock()
        data = LiquidacionCreate(
            id_cliente=1,
            id_moneda=1,
            producto_ids=[1],
        )

        with patch(
            "src.services.liquidacion_service.productos_en_liquidacion_repo.get_by_ids",
            return_value=[producto_mock],
        ):
            # Act & Assert
            with pytest.raises(ValueError, match="no está facturado"):
                await liquidacion_service.create_liquidacion(mock_db, data)

    @pytest.mark.asyncio
    async def test_rechaza_lista_mixta_con_un_no_facturado(self):
        """Lista con varios productos FACTURA + uno VENTA_EFECTIVO → rechaza todo."""
        from src.services.liquidacion_service import liquidacion_service
        from src.dto import LiquidacionCreate

        # Arrange: 2 FACTURA + 1 VENTA_EFECTIVO
        productos = [
            _make_producto_mock("FACTURA", codigo="F-001"),
            _make_producto_mock("FACTURA", codigo="F-002"),
            _make_producto_mock("VENTA_EFECTIVO", codigo="VE-BAD"),
        ]

        mock_db = AsyncMock()
        data = LiquidacionCreate(
            id_cliente=1,
            id_moneda=1,
            producto_ids=[1, 2, 3],
        )

        with patch(
            "src.services.liquidacion_service.productos_en_liquidacion_repo.get_by_ids",
            return_value=productos,
        ):
            with pytest.raises(ValueError, match="no está facturado"):
                await liquidacion_service.create_liquidacion(mock_db, data)


# ══════════════════════════════════════════════════════════════════
# 4. confirmar_liquidacion — validación tipo_compra == FACTURA
# ══════════════════════════════════════════════════════════════════


class TestConfirmarLiquidacionTipoCompraValidation:
    """Verifica que confirmar_liquidacion rechace productos sin factura.

    Todos los tests usan mocks puros (sin BD real).
    """

    @pytest.mark.asyncio
    async def test_happy_path_todos_factura(self):
        """Todos los productos en la liquidación son FACTURA → validación pasa.

        Se mockea todo el flujo: get_with_relations, validación de pagos,
        commit y segunda get_with_relations.
        """
        from src.services.liquidacion_service import liquidacion_service
        from src.dto import LiquidacionConfirmar
        from src.models.contrato import Factura

        # Productos en la liquidación con tipo_compra=FACTURA y relaciones
        pel_mock = _make_producto_mock(
            "FACTURA",
            id_factura=1,
            producto=_make_producto_read_mock(),
            moneda=_make_moneda_read_mock(),
        )

        # Liquidación inicial: no liquidada, con productos FACTURA y moneda
        liq_inicial = _make_liquidacion_mock(
            liquidada=False, moneda=_make_moneda_read_mock()
        )
        liq_inicial.productos_en_liquidacion = [pel_mock]

        # Liquidación después del commit (liquidada=True) con todas las relaciones
        liq_final = _make_liquidacion_mock(
            id_liquidacion=1,
            liquidada=True,
            codigo="C.2026.1",
            moneda=_make_moneda_read_mock(),
        )
        liq_final.productos_en_liquidacion = [pel_mock]

        # Factura mock
        factura_mock = MagicMock(spec=Factura)
        factura_mock.monto = Decimal("500.00")

        mock_db = AsyncMock()

        async def mock_db_get(model, ident):
            if model is Factura:
                return factura_mock
            return None

        mock_db.get = AsyncMock(side_effect=mock_db_get)
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        data = LiquidacionConfirmar()

        # get_with_relations se llama 2 veces: antes y después del commit
        with patch(
            "src.services.liquidacion_service.liquidacion_repo.get_with_relations",
            side_effect=[liq_inicial, liq_final],
        ):
            with patch(
                "src.repository.pago_repo.pago_repo.get_total_pagado",
                return_value=Decimal("500.00"),
            ):
                # Act
                result = await liquidacion_service.confirmar_liquidacion(
                    mock_db, 1, data
                )

        # Assert
        assert result is not None
        assert result.id_liquidacion == 1
        assert result.liquidada is True

    @pytest.mark.asyncio
    async def test_rechaza_venta_efectivo(self):
        """Producto en liquidación con tipo_compra=VENTA_EFECTIVO → ValueError."""
        from src.services.liquidacion_service import liquidacion_service
        from src.dto import LiquidacionConfirmar

        pel_mock = _make_producto_mock(
            "VENTA_EFECTIVO", codigo="VE-BAD", id_producto=99
        )

        liq_mock = _make_liquidacion_mock(liquidada=False)
        liq_mock.productos_en_liquidacion = [pel_mock]

        mock_db = AsyncMock()
        data = LiquidacionConfirmar()

        with patch(
            "src.services.liquidacion_service.liquidacion_repo.get_with_relations",
            return_value=liq_mock,
        ):
            with pytest.raises(ValueError, match="no está facturado"):
                await liquidacion_service.confirmar_liquidacion(mock_db, 1, data)

    @pytest.mark.asyncio
    async def test_rechaza_anexo(self):
        """Producto en liquidación con tipo_compra=ANEXO → ValueError."""
        from src.services.liquidacion_service import liquidacion_service
        from src.dto import LiquidacionConfirmar

        pel_mock = _make_producto_mock("ANEXO", codigo="ANX-BAD", id_producto=88)

        liq_mock = _make_liquidacion_mock(liquidada=False)
        liq_mock.productos_en_liquidacion = [pel_mock]

        mock_db = AsyncMock()
        data = LiquidacionConfirmar()

        with patch(
            "src.services.liquidacion_service.liquidacion_repo.get_with_relations",
            return_value=liq_mock,
        ):
            with pytest.raises(ValueError, match="no está facturado"):
                await liquidacion_service.confirmar_liquidacion(mock_db, 1, data)

    @pytest.mark.asyncio
    async def test_rechaza_lista_mixta_en_confirmar(self):
        """Liquidación con productos FACTURA + VENTA_EFECTIVO → rechaza en confirmar."""
        from src.services.liquidacion_service import liquidacion_service
        from src.dto import LiquidacionConfirmar

        productos = [
            _make_producto_mock("FACTURA", codigo="F-OK"),
            _make_producto_mock("VENTA_EFECTIVO", codigo="VE-BAD", id_producto=77),
        ]

        liq_mock = _make_liquidacion_mock(liquidada=False)
        liq_mock.productos_en_liquidacion = productos

        mock_db = AsyncMock()
        data = LiquidacionConfirmar()

        with patch(
            "src.services.liquidacion_service.liquidacion_repo.get_with_relations",
            return_value=liq_mock,
        ):
            with pytest.raises(ValueError, match="no está facturado"):
                await liquidacion_service.confirmar_liquidacion(mock_db, 1, data)
