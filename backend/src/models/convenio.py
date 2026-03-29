from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, ForeignKey
from typing import Optional, List, TYPE_CHECKING
from datetime import date

if TYPE_CHECKING:
    from .anexo import Anexo
    from .cliente import Cliente
    from .tipo_convenio import TipoConvenio


class Convenio(SQLModel, table=True):
    __tablename__ = "convenio"

    id_convenio: Optional[int] = Field(default=None, primary_key=True)
    id_cliente: int = Field(
        sa_column=Column(
            ForeignKey("clientes.id_cliente", ondelete="CASCADE"), nullable=False
        )
    )
    nombre_convenio: str = Field(max_length=200)
    fecha: date
    vigencia: date
    id_tipo_convenio: int = Field(foreign_key="tipo_convenio.id_tipo_convenio")
    codigo: Optional[str] = Field(default=None, max_length=50)

    cliente: Optional["Cliente"] = Relationship(
        back_populates="convenios"
    )
    tipo_convenio: Optional["TipoConvenio"] = Relationship(
        back_populates="convenios"
    )
    anexos: List["Anexo"] = Relationship(
        back_populates="convenios"
    )
