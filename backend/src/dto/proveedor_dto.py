from typing import Optional
from pydantic import BaseModel
from datetime import date


class ProvedorBase(BaseModel):
    nombre: str
    email: Optional[str] = None
    direccion: Optional[str] = None
    id_tipo_provedor: int


class ProvedorCreate(ProvedorBase):
    pass


class ProvedorUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    id_tipo_provedor: Optional[int] = None


class ProvedorRead(ProvedorBase):
    id_provedores: int

    class Config:
        from_attributes = True


class TipoProvedorBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None


class TipoProvedorCreate(TipoProvedorBase):
    pass


class TipoProvedorUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


class TipoProvedorRead(TipoProvedorBase):
    id_tipo_provedores: int

    class Config:
        from_attributes = True
