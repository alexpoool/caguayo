from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from decimal import Decimal

if TYPE_CHECKING:
    from .anexo import Anexo
    from .producto import Productos
    from .moneda import Moneda


class ItemAnexo(SQLModel, table=True):
    __tablename__ = "item_anexo"

    id_item_anexo: Optional[int] = Field(default=None, primary_key=True)
    id_anexo: int = Field(foreign_key="anexo.id_anexo")
    id_producto: int = Field(foreign_key="productos.id_producto")
    cantidad: int = Field(default=1)
    precio_compra: Decimal = Field(decimal_places=4, max_digits=15)
    precio_venta: Decimal = Field(decimal_places=4, max_digits=15)
    id_moneda: int = Field(foreign_key="moneda.id_moneda")
    codigo: Optional[str] = Field(default=None, max_length=50)

    anexo: "Anexo" = Relationship(back_populates="items_anexo")
    producto: "Productos" = Relationship(back_populates="items_anexo")
    moneda: "Moneda" = Relationship(back_populates="items_anexo")
