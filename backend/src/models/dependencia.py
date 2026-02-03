from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .movimiento import Movimiento


class TipoDependencia(SQLModel, table=True):
    __tablename__ = "tipo_dependencia"

    id_tipo_dependencia: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=20, unique=True)
    descripcion: Optional[str] = None

    # Relaciones
    dependencias: List["Dependencia"] = Relationship(back_populates="tipo_dependencia")


class DatosGeneralesDependencia(SQLModel, table=True):
    __tablename__ = "datos_generales_dependencia"

    id_datos_generales: Optional[int] = Field(default=None, primary_key=True)
    direccion: str = Field(max_length=255)
    telefono: str = Field(max_length=20)
    email: str = Field(max_length=100)

    # Relaciones
    dependencias: List["Dependencia"] = Relationship(back_populates="datos_generales")


class Dependencia(SQLModel, table=True):
    __tablename__ = "dependencia"

    id_dependencia: Optional[int] = Field(default=None, primary_key=True)
    id_tipo_dependencia: int = Field(foreign_key="tipo_dependencia.id_tipo_dependencia")
    id_datos_generales: int = Field(
        foreign_key="datos_generales_dependencia.id_datos_generales"
    )
    nombre: str = Field(max_length=100)

    # Relaciones
    tipo_dependencia: TipoDependencia = Relationship(back_populates="dependencias")
    datos_generales: DatosGeneralesDependencia = Relationship(
        back_populates="dependencias"
    )
    movimientos: List["Movimiento"] = Relationship(back_populates="dependencia")
