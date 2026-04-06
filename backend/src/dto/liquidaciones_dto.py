from sqlmodel import SQLModel
from typing import Optional, List, TYPE_CHECKING
from datetime import date
from decimal import Decimal

if TYPE_CHECKING:
    from .clientes_dto import ClienteRead
    from .monedas_dto import MonedaRead
    from .productos_en_liquidacion_dto import ProductosEnLiquidacionRead


class LiquidacionBase(SQLModel):
    id_cliente: int
    id_convenio: Optional[int] = None
    id_anexo: Optional[int] = None
    id_moneda: int
    liquidada: bool = False
    fecha_emision: date
    fecha_liquidacion: Optional[date] = None
    observaciones: Optional[str] = None
    devengado: Decimal = Decimal("0.00")
    tributario: Decimal = Decimal("0.00")
    comision_bancaria: Decimal = Decimal("0.00")
    gasto_empresa: Decimal = Decimal("0.00")
    importe: Decimal = Decimal("0.00")
    neto_pagar: Decimal = Decimal("0.00")
    tipo_pago: str = "TRANSFERENCIA"


class LiquidacionCreate(SQLModel):
    id_cliente: int
    id_convenio: Optional[int] = None
    id_anexo: Optional[int] = None
    id_moneda: int
    fecha_emision: Optional[date] = None
    observaciones: Optional[str] = None
    devengado: Optional[Decimal] = None
    tributario: Optional[Decimal] = None
    comision_bancaria: Optional[Decimal] = None
    gasto_empresa: Optional[Decimal] = None
    tipo_pago: str = "TRANSFERENCIA"
    producto_ids: List[int] = []


class LiquidacionRead(LiquidacionBase):
    id_liquidacion: int
    codigo: str


class LiquidacionUpdate(SQLModel):
    id_cliente: Optional[int] = None
    id_convenio: Optional[int] = None
    id_anexo: Optional[int] = None
    id_moneda: Optional[int] = None
    liquidada: Optional[bool] = None
    fecha_emision: Optional[date] = None
    fecha_liquidacion: Optional[date] = None
    observaciones: Optional[str] = None
    devengado: Optional[Decimal] = None
    tributario: Optional[Decimal] = None
    comision_bancaria: Optional[Decimal] = None
    gasto_empresa: Optional[Decimal] = None
    importe: Optional[Decimal] = None
    neto_pagar: Optional[Decimal] = None
    tipo_pago: Optional[str] = None


class LiquidacionConfirmar(SQLModel):
    tipo_pago: Optional[str] = None
    devengado: Optional[Decimal] = None
    tributario: Optional[Decimal] = None
    comision_bancaria: Optional[Decimal] = None
    gasto_empresa: Optional[Decimal] = None
    observaciones: Optional[str] = None


class LiquidacionConProductos(SQLModel):
    id_cliente: int
    id_convenio: Optional[int] = None
    id_anexo: Optional[int] = None
    id_moneda: int
    devengado: Optional[Decimal] = None
    tributario: Optional[Decimal] = None
    comision_bancaria: Optional[Decimal] = None
    gasto_empresa: Optional[Decimal] = None
    tipo_pago: str = "TRANSFERENCIA"
    observaciones: Optional[str] = None
    producto_ids: List[int] = []


# Rebuild forward references
from .clientes_dto import ClienteRead
from .monedas_dto import MonedaRead
from .productos_en_liquidacion_dto import ProductosEnLiquidacionRead

LiquidacionRead.model_rebuild()
