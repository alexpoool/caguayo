from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .cliente_natural import ClienteNatural


class TipoEntidad(SQLModel, table=True):
    __tablename__ = "tipo_entidad"

    id_tipo_entidad: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100)

    clientes_naturales: List["ClienteNatural"] = Relationship(
        back_populates="tipo_entidad"
    )
