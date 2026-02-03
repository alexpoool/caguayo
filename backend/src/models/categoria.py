from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .producto import Productos


class Categorias(SQLModel, table=True):
    __tablename__ = "categorias"

    id_categoria: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, unique=True)
    descripcion: Optional[str] = None

    # Relaciones
    subcategorias: List["Subcategorias"] = Relationship(back_populates="categoria")


class Subcategorias(SQLModel, table=True):
    __tablename__ = "subcategorias"

    id_subcategoria: Optional[int] = Field(default=None, primary_key=True)
    id_categoria: int = Field(foreign_key="categorias.id_categoria")
    nombre: str = Field(max_length=100)
    descripcion: Optional[str] = None

    # Relaciones
    categoria: Categorias = Relationship(back_populates="subcategorias")
    productos: List["Productos"] = Relationship(back_populates="subcategoria")
