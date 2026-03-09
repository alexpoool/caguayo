from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .venta import Ventas
    from .movimiento import Movimiento


class Liquidacion(SQLModel, table=True):
    __tablename__ = "liquidacion"

    id_liquidacion: Optional[int] = Field(default=None, primary_key=True)

    # Relaciones
    movimientos: List["Movimiento"] = Relationship(back_populates="liquidacion")
