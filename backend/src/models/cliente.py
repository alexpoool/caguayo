from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Column, String, Boolean, ARRAY, Integer
from datetime import datetime

if TYPE_CHECKING:
    from .venta import Ventas
    from .tipo_cliente import TipoCliente
    from .convenio import Convenio
    from .movimiento import Movimiento
    from .dependencia import Provincia, Municipio
    from .especialidades_artisticas import EspecialidadesArtisticas
    from .cuenta import Cuenta
    from .cliente_natural import ClienteNatural
    from .cliente_tcp import ClienteTCP


class Cliente(SQLModel, table=True):
    __tablename__ = "clientes"

    id_cliente: Optional[int] = Field(default=None, primary_key=True)
    id_tipo_cliente: Optional[int] = Field(
        default=None, foreign_key="tipo_cliente.id_tipo_cliente"
    )
    nombre: Optional[str] = Field(default=None, max_length=150)
    email: Optional[str] = Field(default=None, max_length=100)
    direccion: Optional[str] = Field(default=None, max_length=255)
    tipo_persona: str = Field(default="JURIDICA", sa_column=Column(String(20)))
    nombre_artistico: Optional[str] = Field(default=None, max_length=150)
    telefono_principal: Optional[str] = Field(default=None, max_length=20)
    telefono_secundario: Optional[str] = Field(default=None, max_length=20)
    telefono: Optional[str] = Field(default=None, max_length=20)
    direccion_fiscal: Optional[str] = Field(default=None, max_length=255)
    direccion_estudio: Optional[str] = Field(default=None)
    especialidad_id: Optional[int] = Field(
        default=None, foreign_key="especialidades_artisticas.id_especialidad"
    )
    estilo_artistico: Optional[str] = Field(default=None, max_length=100)
    tecnicas_principales: Optional[List[str]] = Field(
        default=None, sa_column=Column(ARRAY(String))
    )
    ano_inicio_carrera: Optional[int] = Field(default=None)
    estado: str = Field(default="ACTIVO", sa_column=Column(String(20)))
    fecha_registro: Optional[str] = Field(default=None, max_length=100)
    fecha_ultima_actualizacion: Optional[str] = Field(default=None, max_length=100)
    etiquetas: Optional[List[str]] = Field(
        default=None, sa_column=Column(ARRAY(String))
    )
    id_provincia: Optional[int] = Field(
        default=None, foreign_key="provincia.id_provincia"
    )
    id_municipio: Optional[int] = Field(
        default=None, foreign_key="municipio.id_municipio"
    )
    cedula_rif: Optional[str] = Field(default=None, max_length=20)
    tipo_relacion: str = Field(default="CLIENTE", max_length=20)
    fax: Optional[str] = Field(default=None, max_length=20)
    web: Optional[str] = Field(default=None, max_length=100)
    numero_cliente: Optional[str] = Field(default=None, max_length=50)
    codigo_postal: Optional[str] = Field(default=None, max_length=20)
    nit: Optional[str] = Field(default=None, max_length=20)
    activo: bool = Field(default=True)

    tipo_cliente: Optional["TipoCliente"] = Relationship(back_populates="clientes")
    especialidad: Optional["EspecialidadesArtisticas"] = Relationship(
        back_populates="clientes"
    )
    provincia: Optional["Provincia"] = Relationship(
        back_populates="clientes",
        sa_relationship_kwargs={"foreign_keys": "Cliente.id_provincia"},
    )
    municipio: Optional["Municipio"] = Relationship(
        back_populates="clientes",
        sa_relationship_kwargs={"foreign_keys": "Cliente.id_municipio"},
    )
    ventas: List["Ventas"] = Relationship(back_populates="cliente")
    convenios: List["Convenio"] = Relationship(back_populates="cliente")
    movimientos: List["Movimiento"] = Relationship(back_populates="cliente")
    cuentas: List["Cuenta"] = Relationship(back_populates="cliente")
    cliente_natural: Optional["ClienteNatural"] = Relationship(back_populates="cliente")
    cliente_tcp: Optional["ClienteTCP"] = Relationship(back_populates="cliente")
