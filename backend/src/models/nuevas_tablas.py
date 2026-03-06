from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Column, String, Numeric, Date, JSON
from datetime import date

if TYPE_CHECKING:
    from .cliente import Cliente
    from .moneda import Moneda
    from .producto import Productos


class Contrato(SQLModel, table=True):
    __tablename__ = "contrato"

    id_contrato: Optional[int] = Field(default=None, primary_key=True)
    id_cliente: int = Field(foreign_key="clientes.id_cliente")
    nombre_contrato: str = Field(max_length=255)
    proforma: Optional[str] = Field(default=None, max_length=500)
    estado: str = Field(max_length=20)
    fecha: date
    vigencia: date
    tipo: Optional[str] = Field(default=None, max_length=100)
    id_moneda: int = Field(foreign_key="moneda.id_moneda")
    productos: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    monto: Optional[float] = Field(default=None, sa_column=Numeric(10, 2))
    documento_final: Optional[str] = Field(default=None, max_length=500)

    cliente: Optional["Cliente"] = Relationship(back_populates="contratos")
    moneda: Optional["Moneda"] = Relationship(back_populates="contratos")
    suplementos: List["Suplemento"] = Relationship(back_populates="contrato")
    facturas: List["Factura"] = Relationship(back_populates="contrato")
    contrato_productos: List["ContratoProducto"] = Relationship(back_populates="contrato")


class ContratoProducto(SQLModel, table=True):
    __tablename__ = "contrato_producto"

    id_contrato_producto: Optional[int] = Field(default=None, primary_key=True)
    id_contrato: int = Field(foreign_key="contrato.id_contrato")
    id_producto: int = Field(foreign_key="productos.id_producto")
    cantidad: int = Field(default=1)
    precio_unitario: float = Field(sa_column=Numeric(10, 2))

    contrato: Optional["Contrato"] = Relationship(back_populates="contrato_productos")
    producto: Optional["Productos"] = Relationship(back_populates="contrato_productos")


class Suplemento(SQLModel, table=True):
    __tablename__ = "suplemento"

    id_suplemento: Optional[int] = Field(default=None, primary_key=True)
    id_contrato: int = Field(foreign_key="contrato.id_contrato")
    nombre_suplemento: str = Field(max_length=255)
    estado: str = Field(max_length=20)
    fecha: date
    id_moneda: int = Field(foreign_key="moneda.id_moneda")
    productos: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    monto: Optional[float] = Field(default=None, sa_column=Numeric(10, 2))
    documento: Optional[str] = Field(default=None, max_length=500)

    contrato: Optional["Contrato"] = Relationship(back_populates="suplementos")
    moneda: Optional["Moneda"] = Relationship(back_populates="suplementos")
    suplemento_productos: List["SuplementoProducto"] = Relationship(back_populates="suplemento")


class SuplementoProducto(SQLModel, table=True):
    __tablename__ = "suplemento_producto"

    id_suplemento_producto: Optional[int] = Field(default=None, primary_key=True)
    id_suplemento: int = Field(foreign_key="suplemento.id_suplemento")
    id_producto: int = Field(foreign_key="productos.id_producto")
    cantidad: int = Field(default=1)
    precio_unitario: float = Field(sa_column=Numeric(10, 2))

    suplemento: Optional["Suplemento"] = Relationship(back_populates="suplemento_productos")
    producto: Optional["Productos"] = Relationship(back_populates="suplemento_productos")


class Factura(SQLModel, table=True):
    __tablename__ = "factura"

    id_factura: Optional[int] = Field(default=None, primary_key=True)
    id_contrato: int = Field(foreign_key="contrato.id_contrato")
    codigo: str = Field(max_length=50)
    descripcion: Optional[str] = Field(default=None)
    observaciones: Optional[str] = Field(default=None)
    fecha: date
    id_moneda: int = Field(foreign_key="moneda.id_moneda")
    productos: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    monto: Optional[float] = Field(default=None, sa_column=Numeric(10, 2))

    contrato: Optional["Contrato"] = Relationship(back_populates="facturas")
    moneda: Optional["Moneda"] = Relationship(back_populates="facturas")
    factura_productos: List["FacturaProducto"] = Relationship(back_populates="factura")
    pagos: List["Pago"] = Relationship(back_populates="factura")


class FacturaProducto(SQLModel, table=True):
    __tablename__ = "factura_producto"

    id_factura_producto: Optional[int] = Field(default=None, primary_key=True)
    id_factura: int = Field(foreign_key="factura.id_factura")
    id_producto: int = Field(foreign_key="productos.id_producto")
    cantidad: int = Field(default=1)
    precio_unitario: float = Field(sa_column=Numeric(10, 2))

    factura: Optional["Factura"] = Relationship(back_populates="factura_productos")
    producto: Optional["Productos"] = Relationship(back_populates="factura_productos")


class Pago(SQLModel, table=True):
    __tablename__ = "pago"

    id_pago: Optional[int] = Field(default=None, primary_key=True)
    id_factura: int = Field(foreign_key="factura.id_factura")
    numero_cheque_transferencia: Optional[str] = Field(default=None, max_length=50)
    monto: float = Field(sa_column=Numeric(10, 2))
    numero_factura_RODAS: str = Field(max_length=50)
    fecha: date
    id_moneda: int = Field(foreign_key="moneda.id_moneda")

    factura: Optional["Factura"] = Relationship(back_populates="pagos")
    moneda: Optional["Moneda"] = Relationship(back_populates="pagos")


class VentaEfectivo(SQLModel, table=True):
    __tablename__ = "venta_en_efectivo"

    id_venta_efectivo: Optional[int] = Field(default=None, primary_key=True)
    slip: Optional[str] = Field(default=None, max_length=50)
    fecha: date
    id_dependencia: int = Field(foreign_key="dependencia.id_dependencia")
    id_producto: Optional[int] = Field(default=None, foreign_key="productos.id_producto")
    cajero: str = Field(max_length=100)
    productos: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    monto: Optional[float] = Field(default=None, sa_column=Numeric(10, 2))

    dependencia: Optional["Dependencia"] = Relationship(back_populates="ventas_efectivo")
    producto: Optional["Productos"] = Relationship(back_populates="ventas_efectivo")
    venta_efectivo_productos: List["VentaEfectivoProducto"] = Relationship(back_populates="venta_efectivo")


class VentaEfectivoProducto(SQLModel, table=True):
    __tablename__ = "venta_efectivo_producto"

    id_venta_efectivo_producto: Optional[int] = Field(default=None, primary_key=True)
    id_venta_efectivo: int = Field(foreign_key="venta_en_efectivo.id_venta_efectivo")
    id_producto: int = Field(foreign_key="productos.id_producto")
    cantidad: int = Field(default=1)
    precio_unitario: float = Field(sa_column=Numeric(10, 2))

    venta_efectivo: Optional["VentaEfectivo"] = Relationship(back_populates="venta_efectivo_productos")
    producto: Optional["Productos"] = Relationship(back_populates="venta_efectivo_productos")
