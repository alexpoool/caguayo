from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime


class LoginRequest(BaseModel):
    alias: str
    contrasenia: str
    base_datos: str


class DependenciaInfo(BaseModel):
    id_dependencia: int
    nombre: str
    base_datos: str
    host: Optional[str] = "localhost"
    puerto: Optional[int] = 5432

    class Config:
        from_attributes = True


class GrupoInfo(BaseModel):
    id_grupo: int
    nombre: str

    class Config:
        from_attributes = True


class UsuarioInfo(BaseModel):
    id_usuario: int
    ci: str
    nombre: str
    primer_apellido: str
    segundo_apellido: Optional[str] = None
    alias: str
    dependencia: Optional[DependenciaInfo] = None
    grupo: Optional[GrupoInfo] = None

    class Config:
        from_attributes = True


class FuncionalidadInfo(BaseModel):
    id_funcionalidad: int
    nombre: str

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    token: str
    usuario: UsuarioInfo
    funcionalidades: List[FuncionalidadInfo]
    base_datos: str


class AliasSearchResponse(BaseModel):
    alias: str
    dependencia: DependenciaInfo
    grupos: List[GrupoInfo]


class PerfilUpdateRequest(BaseModel):
    alias: Optional[str] = None
    contrasenia_actual: Optional[str] = None
    contrasenia_nueva: Optional[str] = None


class PerfilResponse(BaseModel):
    id_usuario: int
    ci: str
    nombre: str
    primer_apellido: str
    segundo_apellido: Optional[str] = None
    alias: str
    grupo: GrupoInfo
    dependencia: Optional[DependenciaInfo] = None

    class Config:
        from_attributes = True
