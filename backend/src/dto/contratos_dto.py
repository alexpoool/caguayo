from sqlmodel import SQLModel
from typing import Optional, List
from datetime import date
from decimal import Decimal


class TipoContratoBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None


class TipoContratoCreate(TipoContratoBase):
    pass


class TipoContratoRead(TipoContratoBase):
    id_tipo_contrato: int


class TipoContratoUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


class EstadoContratoBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None


class EstadoContratoCreate(EstadoContratoBase):
    pass


class EstadoContratoRead(EstadoContratoBase):
    id_estado_contrato: int


class EstadoContratoUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


class ContratoBase(SQLModel):
    id_cliente: int
    nombre: str
    proforma: Optional[str] = None
    id_estado: int
    fecha: date
    vigencia: date
    id_tipo_contrato: int
    id_moneda: int
    monto: Decimal = Decimal("0.00")
    documento_final: Optional[str] = None


class ContratoCreate(ContratoBase):
    productos: List["ContratoProductoCreate"] = []


class ContratoProductoCreate(SQLModel):
    id_producto: int
    cantidad: int = 1


class ContratoRead(ContratoBase):
    id_contrato: int


class ContratoReadWithDetails(ContratoRead):
    productos: List["ContratoProductoRead"] = []
    estado: Optional["EstadoContratoRead"] = None
    tipo_contrato: Optional["TipoContratoRead"] = None
    moneda: Optional["MonedaRead"] = None
    cliente: Optional["ClienteSimpleRead"] = None


class ContratoProductoRead(SQLModel):
    id_contrato_producto: int
    id_producto: int
    cantidad: int
    producto: Optional["ProductoSimpleRead"] = None


class ContratoUpdate(SQLModel):
    id_cliente: Optional[int] = None
    nombre: Optional[str] = None
    proforma: Optional[str] = None
    id_estado: Optional[int] = None
    fecha: Optional[date] = None
    vigencia: Optional[date] = None
    id_tipo_contrato: Optional[int] = None
    id_moneda: Optional[int] = None
    monto: Optional[Decimal] = None
    documento_final: Optional[str] = None


class ContratoUpdateWithProductos(ContratoUpdate):
    productos: List["ContratoProductoCreate"] = []


class MonedaRead(SQLModel):
    id_moneda: int
    nombre: str
    denominacion: str
    simbolo: str


class ClienteSimpleRead(SQLModel):
    id_cliente: int
    nombre: str
    cedula_rif: Optional[str] = None


class ProductoSimpleRead(SQLModel):
    id_producto: int
    nombre: str
    precio_venta: Decimal


class SuplementoBase(SQLModel):
    id_contrato: int
    nombre: str
    id_estado: int
    fecha: date
    monto: Decimal = Decimal("0.00")
    documento: Optional[str] = None


class SuplementoCreate(SuplementoBase):
    productos: List["SuplementoProductoCreate"] = []


class SuplementoProductoCreate(SQLModel):
    id_producto: int
    cantidad: int = 1


class SuplementoRead(SuplementoBase):
    id_suplemento: int


class SuplementoReadWithDetails(SuplementoRead):
    productos: List["SuplementoProductoRead"] = []
    estado: Optional[EstadoContratoRead] = None


class SuplementoProductoRead(SQLModel):
    id_suplemento_producto: int
    id_producto: int
    cantidad: int
    producto: Optional[ProductoSimpleRead] = None


class SuplementoUpdate(SQLModel):
    id_contrato: Optional[int] = None
    nombre: Optional[str] = None
    id_estado: Optional[int] = None
    fecha: Optional[date] = None
    monto: Optional[Decimal] = None
    documento: Optional[str] = None


class SuplementoUpdateWithProductos(SuplementoUpdate):
    productos: List[SuplementoProductoCreate] = []


class FacturaBase(SQLModel):
    id_contrato: int
    codigo_factura: str
    descripcion: Optional[str] = None
    observaciones: Optional[str] = None
    fecha: date
    monto: Decimal = Decimal("0.00")
    pago_actual: Decimal = Decimal("0.00")


class FacturaCreate(FacturaBase):
    productos: List["FacturaProductoCreate"] = []


class FacturaProductoCreate(SQLModel):
    id_producto: int
    cantidad: int = 1


class FacturaRead(FacturaBase):
    id_factura: int


class FacturaReadWithDetails(FacturaRead):
    productos: List["FacturaProductoRead"] = []


class FacturaProductoRead(SQLModel):
    id_factura_producto: int
    id_producto: int
    cantidad: int
    producto: Optional[ProductoSimpleRead] = None


class FacturaUpdate(SQLModel):
    id_contrato: Optional[int] = None
    codigo_factura: Optional[str] = None
    descripcion: Optional[str] = None
    observaciones: Optional[str] = None
    fecha: Optional[date] = None
    monto: Optional[Decimal] = None
    pago_actual: Optional[Decimal] = None


class FacturaUpdateWithProductos(FacturaUpdate):
    productos: List[FacturaProductoCreate] = []


class VentaEfectivoBase(SQLModel):
    slip: str
    fecha: date
    id_dependencia: int
    cajero: str
    monto: Decimal = Decimal("0.00")


class VentaEfectivoCreate(VentaEfectivoBase):
    productos: List["VentaEfectivoProductoCreate"] = []


class VentaEfectivoProductoCreate(SQLModel):
    id_producto: int
    cantidad: int = 1


class VentaEfectivoRead(VentaEfectivoBase):
    id_venta_efectivo: int


class VentaEfectivoReadWithDetails(VentaEfectivoRead):
    productos: List["VentaEfectivoProductoRead"] = []
    dependencia: Optional["DependenciaSimpleRead"] = None


class VentaEfectivoProductoRead(SQLModel):
    id_venta_efectivo_producto: int
    id_producto: int
    cantidad: int
    producto: Optional[ProductoSimpleRead] = None


class VentaEfectivoUpdate(SQLModel):
    slip: Optional[str] = None
    fecha: Optional[date] = None
    id_dependencia: Optional[int] = None
    cajero: Optional[str] = None
    monto: Optional[Decimal] = None


class VentaEfectivoUpdateWithProductos(VentaEfectivoUpdate):
    productos: List[VentaEfectivoProductoCreate] = []


class DependenciaSimpleRead(SQLModel):
    id_dependencia: int
    nombre: str
