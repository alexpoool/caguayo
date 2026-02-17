from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .convenio import Convenio
    from .tipo_provedor import TipoProvedor
    from .movimiento import Movimiento


class Provedor(SQLModel, table=True):
    __tablename__ = "provedores"

    id_provedores: Optional[int] = Field(default=None, primary_key=True)
    id_tipo_provedor: int = Field(foreign_key="tipo_provedores.id_tipo_provedores")
    nombre: str = Field(max_length=150)
    email: Optional[str] = Field(default=None, max_length=100)
    direccion: Optional[str] = Field(default=None, max_length=255)

    # Relaciones
    tipo_provedor: Optional["TipoProvedor"] = Relationship(back_populates="provedores")
    convenios: List["Convenio"] = Relationship(back_populates="provedor")
    movimientos: List["Movimiento"] = Relationship(back_populates="provedor")
