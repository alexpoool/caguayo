from sqlmodel import SQLModel
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from decimal import Decimal

if TYPE_CHECKING:
    from .productos_dto import ProductoSimpleRead
    from .monedas_dto import MonedaRead


class ProductosEnLiquidacionBase(SQLModel):
    id_producto: int
    cantidad: int
    precio: Decimal
    id_moneda: int
    tipo_compra: str
    id_factura: Optional[int] = None
    id_venta_efectivo: Optional[int] = None
    id_anexo: Optional[int] = None
    liquidada: bool = False


class ProductosEnLiquidacionCreate(ProductosEnLiquidacionBase):
    pass


class AnexoSimpleRead(SQLModel):
    id_anexo: int
    nombre_anexo: str


class ProductosEnLiquidacionRead(ProductosEnLiquidacionBase):
    id_producto_en_liquidacion: int
    codigo: str
    fecha: datetime
    fecha_liquidacion: Optional[datetime] = None
    producto: Optional["ProductoSimpleRead"] = None
    moneda: Optional["MonedaRead"] = None
    cantidad_original: Optional[int] = None
    cantidad_liquidada: Optional[int] = None
    anexo: Optional["AnexoSimpleRead"] = None


class ProductosEnLiquidacionUpdate(SQLModel):
    cantidad: Optional[int] = None
    precio: Optional[Decimal] = None
    id_moneda: Optional[int] = None
    liquidada: Optional[bool] = None
    fecha_liquidacion: Optional[datetime] = None


# Rebuild forward references
from .productos_dto import ProductoSimpleRead
from .monedas_dto import MonedaRead

AnexoSimpleRead.model_rebuild()
ProductosEnLiquidacionRead.model_rebuild()
