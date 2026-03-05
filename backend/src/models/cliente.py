from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Column, String, Boolean
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
    from .cliente_juridica import ClienteJuridica
    from .nuevas_tablas import Contrato


class Cliente(SQLModel, table=True):
    __tablename__ = "clientes"

    id_cliente: Optional[int] = Field(default=None, primary_key=True)
    numero_cliente: str = Field(max_length=20)
    nombre: str = Field(max_length=150)
    tipo_persona: str = Field(
        sa_column=Column(
            String(20),
            check_constraint="tipo_persona IN ('NATURAL', 'JURIDICA', 'TCP')",
        )
    )
    cedula_rif: Optional[str] = Field(default=None, max_length=20)
    telefono: Optional[str] = Field(default=None, max_length=20)
    email: Optional[str] = Field(default=None, max_length=100)
    fax: Optional[str] = Field(default=None, max_length=20)
    web: Optional[str] = Field(default=None, max_length=100)
    codigo_postal: Optional[str] = Field(default=None, max_length=10)
    nit: Optional[str] = Field(default=None, max_length=20)
    direccion: Optional[str] = Field(default=None, max_length=255)
    id_provincia: Optional[int] = Field(
        default=None, foreign_key="provincia.id_provincia"
    )
    id_municipio: Optional[int] = Field(
        default=None, foreign_key="municipio.id_municipio"
    )
    tipo_relacion: str = Field(
        max_length=20,
        sa_column=Column(
            String(20),
            check_constraint="tipo_relacion IN ('CLIENTE', 'PROVEEDOR', 'AMBAS')",
        ),
    )
    id_tipo_cliente: Optional[int] = Field(
        default=None, foreign_key="tipo_cliente.id_tipo_cliente"
    )
    estado: str = Field(default="ACTIVO", sa_column=Column(String(20)))
    fecha_registro: Optional[datetime] = Field(default=None)
    fecha_actualizacion: Optional[datetime] = Field(default=None)
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
    cliente_juridica: Optional["ClienteJuridica"] = Relationship(
        back_populates="cliente"
    )
    contratos: List["Contrato"] = Relationship(back_populates="cliente")
