from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .venta import Ventas


class Transaccion(SQLModel, table=True):
    __tablename__ = "transaccion"

    id_transaccion: Optional[int] = Field(default=None, primary_key=True)

    # Relaciones
    ventas: List["Ventas"] = Relationship(back_populates="transaccion")
