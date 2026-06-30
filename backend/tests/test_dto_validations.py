"""
Tests de validación de DTOs (Fase 2 - Input Validation).

Estos son tests unitarios puros: validan que los modelos Pydantic/SQLModel
rechacen datos inválidos sin necesidad de base de datos.
"""

import pytest
from decimal import Decimal
from pydantic import ValidationError


# ─────────────────────────────────────────────────────────────
# 1. DetalleVentaCreate — validación de cantidad y precio_unitario
# ─────────────────────────────────────────────────────────────
class TestDetalleVentaCreate:
    """Validación de items de venta."""

    def test_cantidad_cero_rechazada(self):
        """cantidad=0 debe fallar (gt=0)."""
        from src.dto import DetalleVentaCreate

        with pytest.raises(ValidationError) as exc_info:
            DetalleVentaCreate(id_producto=1, cantidad=0, precio_unitario=100)
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("cantidad",) for e in errors), \
            f"Esperado error en 'cantidad', se obtuvo: {errors}"

    def test_cantidad_negativa_rechazada(self):
        """cantidad=-1 debe fallar (gt=0)."""
        from src.dto import DetalleVentaCreate

        with pytest.raises(ValidationError) as exc_info:
            DetalleVentaCreate(id_producto=1, cantidad=-1, precio_unitario=100)
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("cantidad",) for e in errors), \
            f"Esperado error en 'cantidad', se obtuvo: {errors}"

    def test_precio_unitario_negativo_rechazado(self):
        """precio_unitario=-1 debe fallar (ge=0)."""
        from src.dto import DetalleVentaCreate

        with pytest.raises(ValidationError) as exc_info:
            DetalleVentaCreate(id_producto=1, cantidad=1, precio_unitario=-1)
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("precio_unitario",) for e in errors), \
            f"Esperado error en 'precio_unitario', se obtuvo: {errors}"

    def test_datos_validos_aceptados(self):
        """Datos válidos deben ser aceptados."""
        from src.dto import DetalleVentaCreate

        item = DetalleVentaCreate(id_producto=1, cantidad=5, precio_unitario=Decimal("100.00"))
        assert item.cantidad == 5
        assert item.precio_unitario == Decimal("100.00")


# ─────────────────────────────────────────────────────────────
# 2. VentaCreate — validación de estado
# ─────────────────────────────────────────────────────────────
class TestVentaBaseEstado:
    """VentaBase.validador de estado solo permite PENDIENTE/COMPLETADA/ANULADA."""

    def test_estado_pendiente_valido(self):
        """Crear VentaBase con estado='PENDIENTE' debe ser aceptado."""
        from src.dto import VentaBase
        from datetime import datetime

        venta = VentaBase(
            id_cliente=1,
            fecha=datetime(2026, 1, 1),
            total=Decimal("100.00"),
            estado="PENDIENTE",
        )
        assert venta.estado == "PENDIENTE"

    def test_estado_invalido_rechazado(self):
        """estado='INVALIDO' debe fallar en el validador."""
        from src.dto import VentaBase
        from datetime import datetime

        with pytest.raises(ValidationError) as exc_info:
            VentaBase(
                id_cliente=1,
                fecha=datetime(2026, 1, 1),
                total=Decimal("100.00"),
                estado="INVALIDO",
            )
        errors = exc_info.value.errors()
        assert any("estado" in str(e["loc"]) for e in errors), \
            f"Esperado error en 'estado', se obtuvo: {errors}"

    def test_estado_anulada_valido(self):
        """Crear VentaBase con estado='ANULADA' debe ser aceptado."""
        from src.dto import VentaBase
        from datetime import datetime

        venta = VentaBase(
            id_cliente=1,
            fecha=datetime(2026, 1, 1),
            total=Decimal("100.00"),
            estado="ANULADA",
        )
        assert venta.estado == "ANULADA"

    def test_estado_completada_valido(self):
        """Crear VentaBase con estado='COMPLETADA' debe ser aceptado."""
        from src.dto import VentaBase
        from datetime import datetime

        venta = VentaBase(
            id_cliente=1,
            fecha=datetime(2026, 1, 1),
            total=Decimal("100.00"),
            estado="COMPLETADA",
        )
        assert venta.estado == "COMPLETADA"


# ─────────────────────────────────────────────────────────────
# 3. ProductosCreate — validación precio_venta >= precio_minimo
# ─────────────────────────────────────────────────────────────
class TestProductosCreate:
    """ProductosCreate tiene model_validator que valida precio_venta >= precio_minimo."""

    def test_precio_venta_menor_que_minimo_rechazado(self):
        """precio_venta=50, precio_minimo=100 debe fallar."""
        from src.dto import ProductosCreate

        with pytest.raises(ValidationError) as exc_info:
            ProductosCreate(
                id_subcategoria=1,
                nombre="Producto Test",
                moneda_compra=1,
                precio_compra=Decimal("40.00"),
                moneda_venta=1,
                precio_venta=Decimal("50.00"),
                precio_minimo=Decimal("100.00"),
            )
        errors = exc_info.value.errors()
        # El model_validator genera un error a nivel de modelo (loc=())
        # o con loc específicos según la implementación
        error_messages = [str(e.get("msg", "")) for e in errors]
        combined = " ".join(error_messages)
        assert "precio_venta" in combined.lower() or "menor" in combined.lower(), \
            f"Esperado error de precio_venta < precio_minimo, se obtuvo: {errors}"

    def test_precio_venta_igual_a_minimo_valido(self):
        """precio_venta=100, precio_minimo=100 debe ser aceptado."""
        from src.dto import ProductosCreate

        producto = ProductosCreate(
            id_subcategoria=1,
            nombre="Producto Test",
            moneda_compra=1,
            precio_compra=Decimal("80.00"),
            moneda_venta=1,
            precio_venta=Decimal("100.00"),
            precio_minimo=Decimal("100.00"),
        )
        assert producto.precio_venta == Decimal("100.00")
        assert producto.precio_minimo == Decimal("100.00")

    def test_precio_venta_mayor_que_minimo_valido(self):
        """precio_venta=150, precio_minimo=100 debe ser aceptado."""
        from src.dto import ProductosCreate

        producto = ProductosCreate(
            id_subcategoria=1,
            nombre="Producto Test",
            moneda_compra=1,
            precio_compra=Decimal("80.00"),
            moneda_venta=1,
            precio_venta=Decimal("150.00"),
            precio_minimo=Decimal("100.00"),
        )
        assert producto.precio_venta == Decimal("150.00")


# ─────────────────────────────────────────────────────────────
# 4. MovimientoCreate — validación de cantidad > 0
# ─────────────────────────────────────────────────────────────
class TestMovimientoCreate:
    """MovimientoCreate hereda MovimientoBase con cantidad: int = Field(gt=0)."""

    def test_cantidad_cero_rechazada(self):
        """cantidad=0 debe fallar (gt=0)."""
        from src.dto import MovimientoCreate

        with pytest.raises(ValidationError) as exc_info:
            MovimientoCreate(
                id_tipo_movimiento=1,
                id_dependencia=1,
                id_producto=1,
                cantidad=0,
            )
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("cantidad",) for e in errors), \
            f"Esperado error en 'cantidad', se obtuvo: {errors}"

    def test_cantidad_negativa_rechazada(self):
        """cantidad=-5 debe fallar (gt=0)."""
        from src.dto import MovimientoCreate

        with pytest.raises(ValidationError) as exc_info:
            MovimientoCreate(
                id_tipo_movimiento=1,
                id_dependencia=1,
                id_producto=1,
                cantidad=-5,
            )
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("cantidad",) for e in errors), \
            f"Esperado error en 'cantidad', se obtuvo: {errors}"

    def test_cantidad_positiva_valida(self):
        """cantidad=10 debe ser aceptado."""
        from src.dto import MovimientoCreate

        mov = MovimientoCreate(
            id_tipo_movimiento=1,
            id_dependencia=1,
            id_producto=1,
            cantidad=10,
        )
        assert mov.cantidad == 10


# ─────────────────────────────────────────────────────────────
# 5. AnexoUpdate — validación de comisión (0-100)
# ─────────────────────────────────────────────────────────────
class TestAnexoUpdateComision:
    """AnexoUpdate.comision tiene Field(ge=0, le=100)."""

    def test_comision_negativa_rechazada(self):
        """comision=-1 debe fallar (ge=0)."""
        from src.dto import AnexoUpdate
        from decimal import Decimal

        with pytest.raises(ValidationError) as exc_info:
            AnexoUpdate(comision=Decimal("-1"))
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("comision",) for e in errors), \
            f"Esperado error en 'comision', se obtuvo: {errors}"

    def test_comision_mayor_100_rechazada(self):
        """comision=101 debe fallar (le=100)."""
        from src.dto import AnexoUpdate
        from decimal import Decimal

        with pytest.raises(ValidationError) as exc_info:
            AnexoUpdate(comision=Decimal("101"))
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("comision",) for e in errors), \
            f"Esperado error en 'comision', se obtuvo: {errors}"

    def test_comision_0_valida(self):
        """comision=0 debe ser aceptado."""
        from src.dto import AnexoUpdate
        from decimal import Decimal

        anexo = AnexoUpdate(comision=Decimal("0"))
        assert anexo.comision == Decimal("0")

    def test_comision_100_valida(self):
        """comision=100 debe ser aceptado."""
        from src.dto import AnexoUpdate
        from decimal import Decimal

        anexo = AnexoUpdate(comision=Decimal("100"))
        assert anexo.comision == Decimal("100")


# ─────────────────────────────────────────────────────────────
# 6. AnexoBase — validación de comisión en el base
# ─────────────────────────────────────────────────────────────
class TestAnexoBaseComision:
    """AnexoBase.comision tiene Field(ge=0, le=100)."""

    def test_comision_negativa_rechazada(self):
        """comision=-1 debe fallar (ge=0)."""
        from src.dto import AnexoBase
        from decimal import Decimal
        from datetime import date

        with pytest.raises(ValidationError) as exc_info:
            AnexoBase(
                id_convenio=1,
                nombre_anexo="Test",
                fecha=date.today(),
                comision=Decimal("-1"),
            )
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("comision",) for e in errors), \
            f"Esperado error en 'comision', se obtuvo: {errors}"

    def test_comision_mayor_100_rechazada(self):
        """comision=101 debe fallar (le=100)."""
        from src.dto import AnexoBase
        from decimal import Decimal
        from datetime import date

        with pytest.raises(ValidationError) as exc_info:
            AnexoBase(
                id_convenio=1,
                nombre_anexo="Test",
                fecha=date.today(),
                comision=Decimal("101"),
            )
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("comision",) for e in errors), \
            f"Esperado error en 'comision', se obtuvo: {errors}"
