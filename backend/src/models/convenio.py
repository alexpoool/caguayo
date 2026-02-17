from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import date

if TYPE_CHECKING:
    from .anexo import Anexo
    from .provedor import Provedor
    from .tipo_convenio import TipoConvenio
    from .movimiento import Movimiento


class Convenio(SQLModel, table=True):
    __tablename__ = "convenio"

    id_convenio: Optional[int] = Field(default=None, primary_key=True)
    id_provedor: int = Field(foreign_key="provedores.id_provedores")
    nombre_convenio: str = Field(max_length=200)
    fecha: date
    vigencia: date
    id_tipo_convenio: int = Field(foreign_key="tipo_convenio.id_tipo_convenio")

    # Relaciones
    provedor: Optional["Provedor"] = Relationship(back_populates="convenios")
    tipo_convenio: Optional["TipoConvenio"] = Relationship(back_populates="convenios")
    anexos: List["Anexo"] = Relationship(back_populates="convenio")
    movimientos: List["Movimiento"] = Relationship(back_populates="convenio")
