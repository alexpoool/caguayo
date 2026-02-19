from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    pass


class TipoContrato(SQLModel, table=True):
    __tablename__ = "tipo_contrato"

    id_tipo_contrato: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, unique=True)
    descripcion: Optional[str] = None


class EstadoContrato(SQLModel, table=True):
    __tablename__ = "estado_contrato"

    id_estado_contrato: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, unique=True)
    descripcion: Optional[str] = None
