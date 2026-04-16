from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from decimal import Decimal

if TYPE_CHECKING:
    from .contrato import Factura
    from .producto import Productos
    from .moneda import Moneda


class ItemFactura(SQLModel, table=True):
    __tablename__ = "item_factura"

    id_item_factura: Optional[int] = Field(default=None, primary_key=True)
    id_factura: int = Field(foreign_key="factura.id_factura")
    id_producto: int = Field(foreign_key="productos.id_producto")
    cantidad: int = Field(default=1)
    precio_compra: Decimal = Field(decimal_places=4, max_digits=15)
    precio_venta: Decimal = Field(decimal_places=4, max_digits=15)
    id_moneda: int = Field(foreign_key="moneda.id_moneda")
    codigo: Optional[str] = Field(default=None, max_length=50)

    factura: "Factura" = Relationship(back_populates="items_factura")
    producto: "Productos" = Relationship(back_populates="items_factura")
    moneda: "Moneda" = Relationship(back_populates="items_factura")
