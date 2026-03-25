from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, ForeignKey
from typing import Optional, List, TYPE_CHECKING
from datetime import date
from decimal import Decimal

if TYPE_CHECKING:
    from .cliente import Cliente
    from .moneda import Moneda
    from .dependencia import Dependencia
    from .item_factura import ItemFactura
    from .item_venta_efectivo import ItemVentaEfectivo


class TipoContrato(SQLModel, table=True):
    __tablename__ = "tipo_contrato"

    id_tipo_contrato: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, unique=True)
    descripcion: Optional[str] = None


class EstadoContrato(SQLModel, table=True):
    __tablename__ = "estado_contrato"

    id_estado_contrato: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, unique=True)
    descripcion: Optional[str] = None


class Contrato(SQLModel, table=True):
    __tablename__ = "contrato"

    id_contrato: Optional[int] = Field(default=None, primary_key=True)
    id_cliente: int = Field(
        sa_column=Column(
            ForeignKey("clientes.id_cliente", ondelete="CASCADE"), nullable=False
        )
    )
    nombre: str = Field(max_length=200)
    proforma: Optional[str] = Field(default=None, max_length=100)
    id_estado: int = Field(foreign_key="estado_contrato.id_estado_contrato")
    fecha: date = Field(default=date.today())
    vigencia: date
    id_tipo_contrato: int = Field(foreign_key="tipo_contrato.id_tipo_contrato")
    id_moneda: int = Field(foreign_key="moneda.id_moneda")
    monto: Decimal = Field(default=Decimal("0.00"))
    documento_final: Optional[str] = Field(default=None, max_length=255)
    codigo: Optional[str] = Field(default=None, max_length=50)

    cliente: "Cliente" = Relationship(back_populates="contratos")
    estado: "EstadoContrato" = Relationship()
    tipo_contrato: "TipoContrato" = Relationship()
    moneda: "Moneda" = Relationship()
    suplementos: List["Suplemento"] = Relationship(back_populates="contrato")
    facturas: List["Factura"] = Relationship(back_populates="contrato")


class Suplemento(SQLModel, table=True):
    __tablename__ = "suplemento"

    id_suplemento: Optional[int] = Field(default=None, primary_key=True)
    id_contrato: int = Field(foreign_key="contrato.id_contrato")
    nombre: str = Field(max_length=200)
    id_estado: int = Field(foreign_key="estado_contrato.id_estado_contrato")
    fecha: date = Field(default=date.today())
    monto: Decimal = Field(default=Decimal("0.00"))
    documento: Optional[str] = Field(default=None, max_length=255)
    codigo: Optional[str] = Field(default=None, max_length=50)

    contrato: "Contrato" = Relationship(back_populates="suplementos")
    estado: "EstadoContrato" = Relationship()


class Factura(SQLModel, table=True):
    __tablename__ = "factura"

    id_factura: Optional[int] = Field(default=None, primary_key=True)
    id_contrato: int = Field(foreign_key="contrato.id_contrato")
    codigo_factura: str = Field(max_length=50, unique=True)
    descripcion: Optional[str] = None
    observaciones: Optional[str] = None
    fecha: date = Field(default=date.today())
    monto: Decimal = Field(default=Decimal("0.00"))
    pago_actual: Decimal = Field(default=Decimal("0.00"))
    id_dependencia: Optional[int] = Field(
        default=None, foreign_key="dependencia.id_dependencia"
    )

    contrato: "Contrato" = Relationship(back_populates="facturas")
    items_factura: List["ItemFactura"] = Relationship(
        back_populates="factura", sa_relationship_kwargs={"lazy": "selectin"}
    )


class VentaEfectivo(SQLModel, table=True):
    __tablename__ = "venta_efectivo"

    id_venta_efectivo: Optional[int] = Field(default=None, primary_key=True)
    slip: str = Field(max_length=100)
    fecha: date = Field(default=date.today())
    id_dependencia: int = Field(foreign_key="dependencia.id_dependencia")
    cajero: str = Field(max_length=100)
    monto: Decimal = Field(default=Decimal("0.00"))
    codigo: Optional[str] = Field(default=None, max_length=50)

    dependencia: "Dependencia" = Relationship()
    items_venta_efectivo: List["ItemVentaEfectivo"] = Relationship(
        back_populates="venta_efectivo", sa_relationship_kwargs={"lazy": "selectin"}
    )
