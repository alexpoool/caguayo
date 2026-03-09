from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .cliente import Cliente


class EspecialidadesArtisticas(SQLModel, table=True):
    __tablename__ = "especialidades_artisticas"

    id_especialidad: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, unique=True)
    descripcion: Optional[str] = None
    categoria: Optional[str] = Field(default=None, max_length=50)
    activo: bool = Field(default=True)

    clientes: List["Cliente"] = Relationship(back_populates="especialidad")
