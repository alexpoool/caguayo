from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .convenio import Convenio


class TipoConvenio(SQLModel, table=True):
    __tablename__ = "tipo_convenio"

    id_tipo_convenio: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100)
    descripcion: Optional[str] = None

    convenios: List["Convenio"] = Relationship(back_populates="tipo_convenio")
