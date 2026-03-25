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
    codigo: Optional[str] = None


class ContratoCreate(ContratoBase):
    pass


class ContratoRead(ContratoBase):
    id_contrato: int


class ContratoReadWithDetails(ContratoRead):
    estado: Optional["EstadoContratoRead"] = None
    tipo_contrato: Optional["TipoContratoRead"] = None
    moneda: Optional["MonedaRead"] = None
    cliente: Optional["ClienteSimpleRead"] = None


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


class MonedaRead(SQLModel):
    id_moneda: int
    nombre: str
    denominacion: str
    simbolo: str


class ClienteSimpleRead(SQLModel):
    id_cliente: int
    nombre: str
    cedula_rif: Optional[str] = None


class SuplementoBase(SQLModel):
    id_contrato: int
    nombre: str
    id_estado: int
    fecha: date
    monto: Decimal = Decimal("0.00")
    documento: Optional[str] = None
    codigo: Optional[str] = None


class SuplementoCreate(SuplementoBase):
    pass


class SuplementoRead(SuplementoBase):
    id_suplemento: int


class SuplementoReadWithDetails(SuplementoRead):
    estado: Optional[EstadoContratoRead] = None


class SuplementoUpdate(SQLModel):
    id_contrato: Optional[int] = None
    nombre: Optional[str] = None
    id_estado: Optional[int] = None
    fecha: Optional[date] = None
    monto: Optional[Decimal] = None
    documento: Optional[str] = None


class ItemFacturaBase(SQLModel):
    id_producto: int
    cantidad: int
    precio_venta: Decimal
    id_moneda: int


class ItemFacturaCreate(ItemFacturaBase):
    pass


class ItemFacturaRead(ItemFacturaBase):
    id_item_factura: int
    id_factura: int
    precio_compra: Decimal


class FacturaBase(SQLModel):
    id_contrato: int
    codigo_factura: Optional[str] = None
    descripcion: Optional[str] = None
    observaciones: Optional[str] = None
    fecha: date
    monto: Decimal = Decimal("0.00")
    pago_actual: Decimal = Decimal("0.00")
    id_dependencia: Optional[int] = None


class FacturaCreate(FacturaBase):
    id_moneda: Optional[int] = None
    items: Optional[List[ItemFacturaCreate]] = None


class FacturaRead(FacturaBase):
    id_factura: int


class FacturaReadWithDetails(FacturaRead):
    pass


class FacturaUpdate(SQLModel):
    id_contrato: Optional[int] = None
    codigo_factura: Optional[str] = None
    descripcion: Optional[str] = None
    observaciones: Optional[str] = None
    fecha: Optional[date] = None
    monto: Optional[Decimal] = None
    pago_actual: Optional[Decimal] = None


class ItemVentaEfectivoBase(SQLModel):
    id_producto: int
    cantidad: int
    precio_venta: Decimal
    id_moneda: int


class ItemVentaEfectivoCreate(ItemVentaEfectivoBase):
    pass


class ItemVentaEfectivoRead(ItemVentaEfectivoBase):
    id_item_venta_efectivo: int
    id_venta_efectivo: int
    precio_compra: Decimal


class VentaEfectivoBase(SQLModel):
    slip: str
    fecha: date
    id_dependencia: int
    cajero: str
    monto: Decimal = Decimal("0.00")
    codigo: Optional[str] = None


class VentaEfectivoCreate(VentaEfectivoBase):
    id_moneda: Optional[int] = None
    items: Optional[List[ItemVentaEfectivoCreate]] = None


class VentaEfectivoRead(VentaEfectivoBase):
    id_venta_efectivo: int


class VentaEfectivoReadWithDetails(VentaEfectivoRead):
    dependencia: Optional["DependenciaSimpleRead"] = None


class VentaEfectivoUpdate(SQLModel):
    slip: Optional[str] = None
    fecha: Optional[date] = None
    id_dependencia: Optional[int] = None
    cajero: Optional[str] = None
    monto: Optional[Decimal] = None


class DependenciaSimpleRead(SQLModel):
    id_dependencia: int
    nombre: str
