from sqlmodel import SQLModel
from typing import Optional


class TipoEntidadBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None


class TipoEntidadCreate(TipoEntidadBase):
    pass


class TipoEntidadRead(TipoEntidadBase):
    id_tipo_entidad: int


class TipoEntidadUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


class ClienteJuridicaBase(SQLModel):
    codigo_reup: str
    id_tipo_entidad: Optional[int] = None


class ClienteJuridicaCreate(ClienteJuridicaBase):
    id_cliente: int


class ClienteJuridicaRead(ClienteJuridicaBase):
    id_cliente: int
    tipo_entidad: Optional[TipoEntidadRead] = None


class ClienteJuridicaUpdate(SQLModel):
    codigo_reup: Optional[str] = None
    id_tipo_entidad: Optional[int] = None
