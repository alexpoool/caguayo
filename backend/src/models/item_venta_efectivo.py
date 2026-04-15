from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from decimal import Decimal

if TYPE_CHECKING:
    from .contrato import VentaEfectivo
    from .producto import Productos
    from .moneda import Moneda


class ItemVentaEfectivo(SQLModel, table=True):
    __tablename__ = "item_venta_efectivo"

    id_item_venta_efectivo: Optional[int] = Field(default=None, primary_key=True)
    id_venta_efectivo: int = Field(foreign_key="venta_efectivo.id_venta_efectivo")
    id_producto: int = Field(foreign_key="productos.id_producto")
    cantidad: int = Field(default=1)
    precio_compra: Decimal = Field(decimal_places=4, max_digits=15)
    precio_venta: Decimal = Field(decimal_places=4, max_digits=15)
    id_moneda: int = Field(foreign_key="moneda.id_moneda")
    codigo: Optional[str] = Field(default=None, max_length=50)

    venta_efectivo: "VentaEfectivo" = Relationship(
        back_populates="items_venta_efectivo"
    )
    producto: "Productos" = Relationship(back_populates="items_venta_efectivo")
    moneda: "Moneda" = Relationship(back_populates="items_venta_efectivo")
