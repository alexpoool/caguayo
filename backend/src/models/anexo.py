from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import date
from decimal import Decimal

if TYPE_CHECKING:
    from .venta import Ventas
    from .movimiento import Movimiento
    from .convenio import Convenio
    from .producto import Productos
    from .anexo_producto import AnexoProducto


class Anexo(SQLModel, table=True):
    __tablename__ = "anexo"

    id_anexo: Optional[int] = Field(default=None, primary_key=True)
    id_convenio: int = Field(foreign_key="convenio.id_convenio")
    id_producto: Optional[int] = Field(
        default=None, foreign_key="productos.id_producto"
    )
    nombre_anexo: str = Field(max_length=200)
    fecha: date
    numero_anexo: str = Field(max_length=50)
    id_dependencia: Optional[int] = None
    comision: Optional[Decimal] = Field(default=None, decimal_places=2, max_digits=10)

    # Relaciones
    convenio: Optional["Convenio"] = Relationship(back_populates="anexos")
    producto: Optional["Productos"] = Relationship(back_populates="anexos")
    movimientos: List["Movimiento"] = Relationship(back_populates="anexo")
    productos: List["AnexoProducto"] = Relationship(back_populates="anexo")
