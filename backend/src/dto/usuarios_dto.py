from sqlmodel import SQLModel
from typing import Optional, List


class GrupoBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None


class GrupoCreate(GrupoBase):
    pass


class GrupoRead(GrupoBase):
    id_grupo: int


class GrupoUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


class UsuarioBase(SQLModel):
    ci: str
    nombre: str
    primer_apellido: str
    segundo_apellido: Optional[str] = None
    id_grupo: int
    id_dependencia: Optional[int] = None


class UsuarioCreate(UsuarioBase):
    alias: Optional[str] = None
    contrasenia: Optional[str] = None


class DependenciaSimpleRead(SQLModel):
    id_dependencia: int
    nombre: str


class UsuarioRead(SQLModel):
    id_usuario: int
    ci: str
    nombre: str
    primer_apellido: str
    segundo_apellido: Optional[str] = None
    alias: str
    id_grupo: int
    id_dependencia: Optional[int] = None
    grupo: Optional[GrupoRead] = None
    dependencia: Optional[DependenciaSimpleRead] = None


class UsuarioUpdate(SQLModel):
    ci: Optional[str] = None
    nombre: Optional[str] = None
    primer_apellido: Optional[str] = None
    segundo_apellido: Optional[str] = None
    id_grupo: Optional[int] = None
    id_dependencia: Optional[int] = None
