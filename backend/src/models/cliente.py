from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    from .venta import Ventas


class Cliente(SQLModel, table=True):
    __tablename__ = "clientes"

    id_cliente: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=150)
    telefono: Optional[str] = Field(default=None, max_length=20)
    email: Optional[str] = Field(default=None, max_length=100)
    cedula_rif: Optional[str] = Field(default=None, max_length=20)
    direccion: Optional[str] = None
    activo: bool = Field(default=True)
    fecha_registro: datetime = Field(default_factory=datetime.utcnow)

    # Relaciones
    ventas: List["Ventas"] = Relationship(back_populates="cliente")
