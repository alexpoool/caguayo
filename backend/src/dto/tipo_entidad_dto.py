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
