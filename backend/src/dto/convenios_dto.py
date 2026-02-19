from sqlmodel import SQLModel
from typing import Optional, List
from datetime import date
from decimal import Decimal


class TipoProvedorBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None


class TipoProvedorCreate(TipoProvedorBase):
    pass


class TipoProvedorRead(TipoProvedorBase):
    id_tipo_provedores: int


class TipoProvedorUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


class ProvedorBase(SQLModel):
    id_tipo_provedor: int
    nombre: str
    email: Optional[str] = None
    direccion: Optional[str] = None


class ProvedorCreate(ProvedorBase):
    pass


class ProvedorRead(ProvedorBase):
    id_provedores: int
    tipo_provedor: Optional[TipoProvedorRead] = None


class ProvedorUpdate(SQLModel):
    id_tipo_provedor: Optional[int] = None
    nombre: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None


class TipoConvenioBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None


class TipoConvenioCreate(TipoConvenioBase):
    pass


class TipoConvenioRead(TipoConvenioBase):
    id_tipo_convenio: int


class TipoConvenioUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


class ConvenioBase(SQLModel):
    id_provedor: int
    nombre_convenio: str
    fecha: date
    vigencia: date
    id_tipo_convenio: int


class ConvenioCreate(ConvenioBase):
    pass


class ConvenioRead(ConvenioBase):
    id_convenio: int
    provedor: Optional[ProvedorRead] = None
    tipo_convenio: Optional[TipoConvenioRead] = None


class ConvenioUpdate(SQLModel):
    id_provedor: Optional[int] = None
    nombre_convenio: Optional[str] = None
    fecha: Optional[date] = None
    vigencia: Optional[date] = None
    id_tipo_convenio: Optional[int] = None


class AnexoBase(SQLModel):
    id_convenio: int
    nombre_anexo: str
    fecha: date
    numero_anexo: str
    id_dependencia: int
    comision: Optional[Decimal] = None


class AnexoCreate(AnexoBase):
    pass


class AnexoRead(AnexoBase):
    id_anexo: int
    convenio: Optional[ConvenioRead] = None


class AnexoUpdate(SQLModel):
    id_convenio: Optional[int] = None
    nombre_anexo: Optional[str] = None
    fecha: Optional[date] = None
    numero_anexo: Optional[str] = None
    id_dependencia: Optional[int] = None
    comision: Optional[Decimal] = None


class ProvedorSimpleRead(SQLModel):
    id_provedores: int
    nombre: str


class ConvenioSimpleRead(SQLModel):
    id_convenio: int
    nombre_convenio: str
