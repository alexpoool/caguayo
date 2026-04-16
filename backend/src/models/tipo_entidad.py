from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .cliente_juridica import ClienteJuridica


class TipoEntidad(SQLModel, table=True):
    __tablename__ = "tipo_entidad"

    id_tipo_entidad: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, unique=True)
    descripcion: Optional[str] = Field(default=None)

    clientes_juridicos: List["ClienteJuridica"] = Relationship(
        back_populates="tipo_entidad"
    )
