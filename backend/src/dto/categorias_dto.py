from sqlmodel import SQLModel
from typing import Optional


# DTOs para Categorias
class CategoriasBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None


class CategoriasCreate(CategoriasBase):
    pass


class CategoriasRead(CategoriasBase):
    id_categoria: int


class CategoriasUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


# DTOs para Subcategorias
class SubcategoriasBase(SQLModel):
    id_categoria: int
    nombre: str
    descripcion: Optional[str] = None


class SubcategoriasCreate(SubcategoriasBase):
    pass


class SubcategoriasRead(SubcategoriasBase):
    id_subcategoria: int
    categoria: Optional[CategoriasRead] = None


class SubcategoriasUpdate(SQLModel):
    id_categoria: Optional[int] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
