from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .dependencia import Dependencia


class ConexionDatabase(SQLModel, table=True):
    __tablename__ = "conexion_database"

    id_conexion: Optional[int] = Field(default=None, primary_key=True)
    host: str = Field(default="localhost", max_length=100)
    puerto: int = Field(default=5432)
    usuario: Optional[str] = Field(default=None, max_length=100)
    contrasenia: Optional[str] = Field(default=None, max_length=255)
    nombre_database: str = Field(max_length=100)

    dependencias: List["Dependencia"] = Relationship(back_populates="conexion")
