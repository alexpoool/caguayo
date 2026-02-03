from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .venta import Ventas
    from .movimiento import Movimiento


class Anexo(SQLModel, table=True):
    __tablename__ = "anexo"

    id_anexo: Optional[int] = Field(default=None, primary_key=True)

    # Relaciones
    ventas: List["Ventas"] = Relationship(back_populates="anexo")
    movimientos: List["Movimiento"] = Relationship(back_populates="anexo")
