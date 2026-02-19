from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .cuenta import Cuenta
    from .usuarios import Usuario
    from .movimiento import Movimiento


class TipoDependencia(SQLModel, table=True):
    __tablename__ = "tipo_dependencia"

    id_tipo_dependencia: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=20, unique=True)
    descripcion: Optional[str] = None

    dependencias: List["Dependencia"] = Relationship(back_populates="tipo_dependencia")


class Dependencia(SQLModel, table=True):
    __tablename__ = "dependencia"

    id_dependencia: Optional[int] = Field(default=None, primary_key=True)
    id_tipo_dependencia: int = Field(foreign_key="tipo_dependencia.id_tipo_dependencia")
    codigo_padre: Optional[int] = Field(
        default=None, foreign_key="dependencia.id_dependencia"
    )
    nombre: str = Field(max_length=100)
    direccion: str = Field(max_length=255)
    telefono: str = Field(max_length=20)
    email: Optional[str] = Field(default=None, max_length=100)
    web: Optional[str] = Field(default=None, max_length=100)
    id_provincia: Optional[int] = Field(
        default=None, foreign_key="provincia.id_provincia"
    )
    id_municipio: Optional[int] = Field(
        default=None, foreign_key="municipio.id_municipio"
    )
    descripcion: Optional[str] = None

    tipo_dependencia: "TipoDependencia" = Relationship(back_populates="dependencias")
    padre: Optional["Dependencia"] = Relationship(
        back_populates="subdependencias",
        sa_relationship_kwargs={"remote_side": "Dependencia.id_dependencia"},
    )
    subdependencias: List["Dependencia"] = Relationship(back_populates="padre")
    cuentas: List["Cuenta"] = Relationship(
        back_populates="dependencia", sa_relationship_kwargs={"lazy": "selectin"}
    )
    provincia: Optional["Provincia"] = Relationship(back_populates="dependencias")
    municipio: Optional["Municipio"] = Relationship(back_populates="dependencias")
    usuarios: List["Usuario"] = Relationship(back_populates="dependencia")
    movimientos: List["Movimiento"] = Relationship(back_populates="dependencia")


class Provincia(SQLModel, table=True):
    __tablename__ = "provincia"

    id_provincia: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, unique=True)

    municipios: List["Municipio"] = Relationship(back_populates="provincia")
    dependencias: List["Dependencia"] = Relationship(back_populates="provincia")


class Municipio(SQLModel, table=True):
    __tablename__ = "municipio"

    id_municipio: Optional[int] = Field(default=None, primary_key=True)
    id_provincia: int = Field(foreign_key="provincia.id_provincia")
    nombre: str = Field(max_length=100)

    provincia: "Provincia" = Relationship(back_populates="municipios")
    dependencias: List["Dependencia"] = Relationship(back_populates="municipio")
