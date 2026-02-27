from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .cliente import Cliente


class TipoCliente(SQLModel, table=True):
    __tablename__ = "tipo_cliente"

    id_tipo_cliente: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100)
    descripcion: Optional[str] = None

    clientes: List["Cliente"] = Relationship(back_populates="tipo_cliente")
