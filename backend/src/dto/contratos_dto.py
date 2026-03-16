from sqlmodel import SQLModel
from typing import Optional, List
from datetime import date
from decimal import Decimal
from src.dto.convenios_dto import AnexoProductoCreate


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


class FacturaBase(SQLModel):
    id_contrato: int
    codigo_factura: str
    descripcion: Optional[str] = None
    observaciones: Optional[str] = None
    fecha: date
    monto: Decimal = Decimal("0.00")
    pago_actual: Decimal = Decimal("0.00")


class FacturaCreate(FacturaBase):
    id_moneda: Optional[int] = None
    productos: Optional[List[AnexoProductoCreate]] = None


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


class VentaEfectivoBase(SQLModel):
    slip: str
    fecha: date
    id_dependencia: int
    cajero: str
    monto: Decimal = Decimal("0.00")


class VentaEfectivoCreate(VentaEfectivoBase):
    id_moneda: Optional[int] = None
    productos: Optional[List[AnexoProductoCreate]] = None


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
