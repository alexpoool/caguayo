from sqlmodel import SQLModel
from typing import Optional, List, TYPE_CHECKING
from datetime import date
from decimal import Decimal

if TYPE_CHECKING:
    from .clientes_dto import ClienteRead
    from .monedas_dto import MonedaRead
    from .productos_dto import ProductoSimpleRead


class ProductosLiquidacionBase(SQLModel):
    cantidad: int = 1
    liquidado: bool = False
    tipo_transaccion: str
    id_transaccion: int
    id_producto: int


class ProductosLiquidacionCreate(ProductosLiquidacionBase):
    pass


class ProductosLiquidacionRead(ProductosLiquidacionBase):
    id_producto_liquidacion: int
    codigo: str
    id_liquidacion: int
    producto: Optional["ProductoSimpleRead"] = None


class ProductosLiquidacionUpdate(SQLModel):
    cantidad: Optional[int] = None
    liquidado: Optional[bool] = None


class LiquidacionBase(SQLModel):
    id_cliente: int
    id_factura: Optional[int] = None
    id_moneda: int
    liquidada: bool = False
    fecha_emision: date
    fecha_liquidacion: Optional[date] = None
    descripcion: Optional[str] = None
    devengado: Decimal = Decimal("0.00")
    tributario: Decimal = Decimal("0.00")
    comision_bancaria: Decimal = Decimal("0.00")
    neto_pagar: Decimal = Decimal("0.00")
    gasto_empresa: Decimal = Decimal("0.00")
    tipo_concepto: str
    importe: Decimal = Decimal("0.00")
    observacion: Optional[str] = None
    tipo_pago: str = "TRANSFERENCIA"


class LiquidacionCreate(SQLModel):
    id_cliente: int
    id_factura: Optional[int] = None
    id_moneda: int
    fecha_emision: Optional[date] = None
    descripcion: Optional[str] = None
    devengado: Optional[Decimal] = None
    tributario: Optional[Decimal] = None
    comision_bancaria: Optional[Decimal] = None
    gasto_empresa: Optional[Decimal] = None
    tipo_concepto: str
    importe: Decimal
    observacion: Optional[str] = None
    tipo_pago: str = "TRANSFERENCIA"
    productos: List[ProductosLiquidacionCreate] = []


class LiquidacionRead(LiquidacionBase):
    id_liquidacion: int
    codigo: str
    cliente: Optional["ClienteRead"] = None
    moneda: Optional["MonedaRead"] = None
    productos_liquidacion: List[ProductosLiquidacionRead] = []


class LiquidacionUpdate(SQLModel):
    id_cliente: Optional[int] = None
    id_factura: Optional[int] = None
    id_moneda: Optional[int] = None
    liquidada: Optional[bool] = None
    fecha_emision: Optional[date] = None
    fecha_liquidacion: Optional[date] = None
    descripcion: Optional[str] = None
    devengado: Optional[Decimal] = None
    tributario: Optional[Decimal] = None
    comision_bancaria: Optional[Decimal] = None
    neto_pagar: Optional[Decimal] = None
    gasto_empresa: Optional[Decimal] = None
    tipo_concepto: Optional[str] = None
    importe: Optional[Decimal] = None
    observacion: Optional[str] = None
    tipo_pago: Optional[str] = None


class LiquidacionConfirmar(SQLModel):
    tipo_pago: str
    devengado: Optional[Decimal] = None
    tributario: Optional[Decimal] = None
    comision_bancaria: Optional[Decimal] = None
    gasto_empresa: Optional[Decimal] = None
    observacion: Optional[str] = None
