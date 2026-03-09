from sqlmodel import SQLModel
from typing import Optional, List
from .ubicaciones_dto import ProvinciaRead, MunicipioRead
from .cuentas_dto import CuentaRead, CuentaCreate


class TipoDependenciaBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None


class TipoDependenciaCreate(TipoDependenciaBase):
    pass


class TipoDependenciaRead(TipoDependenciaBase):
    id_tipo_dependencia: int


class TipoDependenciaUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


class DependenciaBase(SQLModel):
    id_tipo_dependencia: int
    codigo_padre: Optional[int] = None
    nombre: str
    direccion: str
    telefono: str
    email: Optional[str] = None
    web: Optional[str] = None
    id_provincia: Optional[int] = None
    id_municipio: Optional[int] = None
    descripcion: Optional[str] = None


class DependenciaCreate(DependenciaBase):
    pass


class DependenciaConCuentasCreate(SQLModel):
    dependencia: DependenciaCreate
    cuentas: Optional[List[CuentaCreate]] = None


class DependenciaRead(SQLModel):
    id_dependencia: int
    id_tipo_dependencia: int
    codigo_padre: Optional[int] = None
    nombre: str
    direccion: str
    telefono: str
    email: Optional[str] = None
    web: Optional[str] = None
    id_provincia: Optional[int] = None
    id_municipio: Optional[int] = None
    descripcion: Optional[str] = None
    tipo_dependencia: Optional[TipoDependenciaRead] = None
    provincia: Optional[ProvinciaRead] = None
    municipio: Optional[MunicipioRead] = None
    cuentas: List[CuentaRead] = []


class DependenciaUpdate(SQLModel):
    id_tipo_dependencia: Optional[int] = None
    codigo_padre: Optional[int] = None
    nombre: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    web: Optional[str] = None
    id_provincia: Optional[int] = None
    id_municipio: Optional[int] = None
    descripcion: Optional[str] = None
