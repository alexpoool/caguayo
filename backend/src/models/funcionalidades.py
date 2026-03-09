from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .usuarios import Grupo


class Funcionalidad(SQLModel, table=True):
    __tablename__ = "funcionalidad"

    id_funcionalidad: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, unique=True)

    grupos: List["GrupoFuncionalidad"] = Relationship(back_populates="funcionalidad")


class GrupoFuncionalidad(SQLModel, table=True):
    __tablename__ = "grupo_funcionalidad"

    id_grupo: int = Field(foreign_key="grupo.id_grupo", primary_key=True)
    id_funcionalidad: int = Field(
        foreign_key="funcionalidad.id_funcionalidad", primary_key=True
    )

    grupo: "Grupo" = Relationship(back_populates="funcionalidades")
    funcionalidad: "Funcionalidad" = Relationship(back_populates="grupos")
