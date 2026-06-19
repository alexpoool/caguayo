from sqlmodel import SQLModel, Field
from typing import Optional, List
from datetime import date
from decimal import Decimal
from pydantic import field_validator
from src.dto.productos_dto import ProductoSimpleRead


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
    id_cliente: int = Field(gt=0)
    nombre: str = Field(min_length=1)
    proforma: Optional[str] = None
    id_estado: int = Field(gt=0)
    fecha: date
    vigencia: date
    id_tipo_contrato: int = Field(gt=0)
    id_moneda: int = Field(gt=0)
    monto: Decimal = Field(default=Decimal("0.00"), ge=0)
    documento_final: Optional[str] = None
    codigo: Optional[str] = None

    @field_validator("vigencia")
    @classmethod
    def vigencia_no_anterior_a_fecha(cls, v: date, info) -> date:
        fecha = info.data.get("fecha")
        if fecha and v < fecha:
            raise ValueError("La vigencia no puede ser anterior a la fecha de inicio")
        return v


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
    id_cliente: Optional[int] = Field(default=None, gt=0)
    nombre: Optional[str] = Field(default=None, min_length=1)
    proforma: Optional[str] = None
    id_estado: Optional[int] = Field(default=None, gt=0)
    fecha: Optional[date] = None
    vigencia: Optional[date] = None
    id_tipo_contrato: Optional[int] = Field(default=None, gt=0)
    id_moneda: Optional[int] = Field(default=None, gt=0)
    monto: Optional[Decimal] = Field(default=None, ge=0)
    documento_final: Optional[str] = None
    codigo: Optional[str] = None

    @field_validator("vigencia")
    @classmethod
    def vigencia_no_anterior_a_fecha(cls, v: Optional[date], info) -> Optional[date]:
        if v is None:
            return v
        fecha = info.data.get("fecha")
        if fecha and v < fecha:
            raise ValueError("La vigencia no puede ser anterior a la fecha de inicio")
        return v


class MonedaRead(SQLModel):
    id_moneda: int
    nombre: str
    denominacion: str
    simbolo: str


class ClienteSimpleRead(SQLModel):
    id_cliente: int
    codigo: str
    nombre: str


class SuplementoBase(SQLModel):
    id_contrato: int = Field(gt=0)
    nombre: str = Field(min_length=1)
    id_estado: int = Field(gt=0)
    fecha: date
    monto: Decimal = Field(default=Decimal("0.00"), ge=0)
    documento: Optional[str] = None
    codigo: Optional[str] = None


class SuplementoCreate(SuplementoBase):
    pass


class SuplementoRead(SuplementoBase):
    id_suplemento: int


class SuplementoReadWithDetails(SuplementoRead):
    estado: Optional[EstadoContratoRead] = None


class SuplementoUpdate(SQLModel):
    id_contrato: Optional[int] = Field(default=None, gt=0)
    nombre: Optional[str] = Field(default=None, min_length=1)
    id_estado: Optional[int] = Field(default=None, gt=0)
    fecha: Optional[date] = None
    monto: Optional[Decimal] = Field(default=None, ge=0)
    documento: Optional[str] = None
    codigo: Optional[str] = None


class ItemFacturaBase(SQLModel):
    id_producto: int = Field(gt=0)
    cantidad: int = Field(gt=0)
    precio_venta: Decimal = Field(ge=0)
    id_moneda: int = Field(gt=0)
    codigo: Optional[str] = None


class ItemFacturaCreate(ItemFacturaBase):
    id_anexo: Optional[int] = None


class ItemFacturaRead(ItemFacturaBase):
    id_item_factura: int
    id_factura: int
    precio_compra: Decimal
    producto: Optional[ProductoSimpleRead] = None


class FacturaBase(SQLModel):
    id_contrato: int = Field(gt=0)
    codigo_factura: Optional[str] = Field(default=None, min_length=1)
    descripcion: Optional[str] = None
    observaciones: Optional[str] = None
    fecha: date
    monto: Decimal = Field(default=Decimal("0.00"), ge=0)
    pago_actual: Decimal = Field(default=Decimal("0.00"), ge=0)
    id_dependencia: Optional[int] = None


class FacturaCreate(FacturaBase):
    id_moneda: Optional[int] = None
    items: Optional[List[ItemFacturaCreate]] = None
    monto: Optional[Decimal] = Field(default=None, ge=0)


class FacturaRead(FacturaBase):
    id_factura: int


class FacturaReadWithDetails(FacturaRead):
    items: Optional[List[ItemFacturaRead]] = None


class FacturaUpdate(SQLModel):
    id_contrato: Optional[int] = Field(default=None, gt=0)
    codigo_factura: Optional[str] = Field(default=None, min_length=1)
    descripcion: Optional[str] = None
    observaciones: Optional[str] = None
    fecha: Optional[date] = None
    monto: Optional[Decimal] = Field(default=None, ge=0)
    pago_actual: Optional[Decimal] = Field(default=None, ge=0)
    id_dependencia: Optional[int] = None
    id_moneda: Optional[int] = None
    items: Optional[List[ItemFacturaCreate]] = None


class ItemVentaEfectivoBase(SQLModel):
    id_producto: int = Field(gt=0)
    cantidad: int = Field(gt=0)
    precio_venta: Decimal = Field(ge=0)
    id_moneda: int = Field(gt=0)
    codigo: Optional[str] = None


class ItemVentaEfectivoCreate(ItemVentaEfectivoBase):
    pass


class ItemVentaEfectivoRead(ItemVentaEfectivoBase):
    id_item_venta_efectivo: int
    id_venta_efectivo: int
    precio_compra: Decimal


class VentaEfectivoBase(SQLModel):
    slip: str = Field(min_length=1)
    fecha: date
    id_dependencia: int = Field(gt=0)
    cajero: str = Field(min_length=1)
    monto: Decimal = Field(default=Decimal("0.00"), ge=0)
    codigo: Optional[str] = None


class VentaEfectivoCreate(VentaEfectivoBase):
    id_moneda: Optional[int] = None
    items: Optional[List[ItemVentaEfectivoCreate]] = None


class VentaEfectivoRead(VentaEfectivoBase):
    id_venta_efectivo: int


class VentaEfectivoReadWithDetails(VentaEfectivoRead):
    dependencia: Optional["DependenciaSimpleRead"] = None
    items: Optional[List[ItemVentaEfectivoRead]] = None


class VentaEfectivoUpdate(SQLModel):
    slip: Optional[str] = Field(default=None, min_length=1)
    fecha: Optional[date] = None
    id_dependencia: Optional[int] = Field(default=None, gt=0)
    cajero: Optional[str] = Field(default=None, min_length=1)
    monto: Optional[Decimal] = Field(default=None, ge=0)
    codigo: Optional[str] = None


class DependenciaSimpleRead(SQLModel):
    id_dependencia: int
    nombre: str


class ItemAnexoDisponible(SQLModel):
    id_item_anexo: int
    id_anexo: int
    id_producto: int
    cantidad: int
    cantidad_vendida: int
    existencia: int = 0
    precio_venta: Decimal
    precio_compra: Decimal
    id_moneda: int
    codigo: Optional[str] = None
    producto: Optional[ProductoSimpleRead] = None


# Rebuild de modelos para resolver referencias circulares
ItemFacturaRead.model_rebuild()
FacturaReadWithDetails.model_rebuild()
