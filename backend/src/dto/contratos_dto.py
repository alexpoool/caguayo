from sqlmodel import SQLModel
from typing import Optional


class TipoContratoBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None


class TipoContratoCreate(TipoContratoBase):
    pass


class TipoContratoRead(TipoContratoBase):
    id_tipo_contrato: int


class TipoContratoUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


class EstadoContratoBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None


class EstadoContratoCreate(EstadoContratoBase):
    pass


class EstadoContratoRead(EstadoContratoBase):
    id_estado_contrato: int


class EstadoContratoUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
