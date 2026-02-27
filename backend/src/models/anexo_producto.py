from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from decimal import Decimal

if TYPE_CHECKING:
    from .anexo import Anexo
    from .producto import Productos


class AnexoProducto(SQLModel, table=True):
    __tablename__ = "anexo_producto"

    id_anexo_producto: Optional[int] = Field(default=None, primary_key=True)
    id_anexo: int = Field(foreign_key="anexo.id_anexo")
    id_producto: int = Field(foreign_key="productos.id_producto")
    cantidad: int
    precio_compra: Decimal = Field(decimal_places=4, max_digits=15)

    anexo: "Anexo" = Relationship(back_populates="productos")
    producto: "Productos" = Relationship(back_populates="anexos_productos")
