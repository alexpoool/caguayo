from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Column, String, Boolean, Date
from datetime import date

if TYPE_CHECKING:
    from .venta import Ventas
    from .convenio import Convenio
    from .movimiento import Movimiento
    from .cuenta import Cuenta
    from .cliente_natural import ClienteNatural
    from .cliente_juridica import ClienteJuridica
    from .cliente_tcp import ClienteTCP
    from .tipo_entidad import TipoEntidad
    from .dependencia import Provincia, Municipio


class Cliente(SQLModel, table=True):
    __tablename__ = "clientes"

    id_cliente: Optional[int] = Field(default=None, primary_key=True)
    numero_cliente: str = Field(max_length=20)
    nombre: str = Field(max_length=200)
    tipo_persona: str = Field(sa_column=Column(String(20)))  # NATURAL, JURIDICA, TCP
    cedula_rif: str = Field(max_length=20, unique=True)
    telefono: Optional[str] = Field(default=None, max_length=20)
    email: Optional[str] = Field(default=None, max_length=100)
    fax: Optional[str] = Field(default=None, max_length=20)
    web: Optional[str] = Field(default=None, max_length=100)
    id_provincia: Optional[int] = Field(
        default=None, foreign_key="provincia.id_provincia"
    )
    id_municipio: Optional[int] = Field(
        default=None, foreign_key="municipio.id_municipio"
    )
    codigo_postal: Optional[str] = Field(default=None, max_length=10)
    direccion: str = Field(sa_column=Column(String))
    tipo_relacion: str = Field(max_length=20)  # CLIENTE, PROVEEDOR, AMBAS
    estado: str = Field(max_length=20)  # ACTIVO, INACTIVO
    fecha_registro: date = Field(default=date.today())
    activo: bool = Field(default=True)

    provincia: Optional["Provincia"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "Cliente.id_provincia",
            "lazy": "selectin",
        },
    )
    municipio: Optional["Municipio"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "Cliente.id_municipio",
            "lazy": "selectin",
        },
    )
    ventas: List["Ventas"] = Relationship(
        back_populates="cliente",
        sa_relationship_kwargs={"lazy": "selectin", "passive_deletes": True},
    )
    convenios: List["Convenio"] = Relationship(
        back_populates="cliente",
        sa_relationship_kwargs={"lazy": "selectin", "passive_deletes": True},
    )
    movimientos: List["Movimiento"] = Relationship(
        back_populates="cliente", sa_relationship_kwargs={"lazy": "selectin"}
    )
    cuentas: List["Cuenta"] = Relationship(
        back_populates="cliente",
        sa_relationship_kwargs={"lazy": "selectin", "passive_deletes": True},
    )
    cliente_natural: Optional["ClienteNatural"] = Relationship(
        back_populates="cliente", sa_relationship_kwargs={"lazy": "selectin"}
    )
    cliente_juridica: Optional["ClienteJuridica"] = Relationship(
        back_populates="cliente", sa_relationship_kwargs={"lazy": "selectin"}
    )
    cliente_tcp: Optional["ClienteTCP"] = Relationship(
        back_populates="cliente", sa_relationship_kwargs={"lazy": "selectin"}
    )
    contratos: List["Contrato"] = Relationship(
        back_populates="cliente",
        sa_relationship_kwargs={"lazy": "selectin", "passive_deletes": True},
    )
