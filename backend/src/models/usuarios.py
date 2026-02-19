from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .dependencia import Dependencia


class Grupo(SQLModel, table=True):
    __tablename__ = "grupo"

    id_grupo: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, unique=True)
    descripcion: Optional[str] = None

    usuarios: List["Usuario"] = Relationship(back_populates="grupo")


class Usuario(SQLModel, table=True):
    __tablename__ = "usuarios"

    id_usuario: Optional[int] = Field(default=None, primary_key=True)
    ci: str = Field(max_length=20, unique=True)
    nombre: str = Field(max_length=100)
    primer_apellido: str = Field(max_length=100)
    segundo_apellido: Optional[str] = Field(default=None, max_length=100)
    alias: str = Field(max_length=50, unique=True)
    contrasenia: str = Field(max_length=255)
    id_grupo: int = Field(foreign_key="grupo.id_grupo")
    id_dependencia: Optional[int] = Field(
        default=None, foreign_key="dependencia.id_dependencia"
    )

    grupo: "Grupo" = Relationship(back_populates="usuarios")
    dependencia: Optional["Dependencia"] = Relationship(back_populates="usuarios")
