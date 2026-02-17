from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .provedor import Provedor


class TipoProvedor(SQLModel, table=True):
    __tablename__ = "tipo_provedores"

    id_tipo_provedores: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100)

    # Relaciones
    provedores: List["Provedor"] = Relationship(back_populates="tipo_provedor")
