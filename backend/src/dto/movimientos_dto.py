from sqlmodel import SQLModel
from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import validator
from .dependencias_dto import DependenciaRead
from .productos_dto import ProductosRead
from .convenios_dto import ClienteRead, AnexoRead
from .monedas_dto import MonedaRead


class TipoMovimientoBase(SQLModel):
    tipo: str
    factor: int


class TipoMovimientoCreate(TipoMovimientoBase):
    pass


class TipoMovimientoRead(TipoMovimientoBase):
    id_tipo_movimiento: int


class TipoMovimientoUpdate(SQLModel):
    tipo: Optional[str] = None
    factor: Optional[int] = None


class MovimientoBase(SQLModel):
    id_tipo_movimiento: int
    id_dependencia: int
    id_producto: int
    cantidad: int
    codigo: Optional[str] = None
    observacion: Optional[str] = None
    id_cliente: Optional[int] = None
    precio_compra: Optional[Decimal] = None
    moneda_compra: Optional[int] = None
    precio_venta: Optional[Decimal] = None
    moneda_venta: Optional[int] = None


class MovimientoCreate(MovimientoBase):
    pass


class MovimientoRead(MovimientoBase):
    class Config:
        from_attributes = True

    id_movimiento: int
    fecha: datetime
    estado: str = "pendiente"
    codigo: Optional[str] = None
    tipo_movimiento: Optional[TipoMovimientoRead] = None
    dependencia: Optional[DependenciaRead] = None
    producto: Optional[ProductosRead] = None
    cliente: Optional[ClienteRead] = None
    moneda_compra_rel: Optional[MonedaRead] = None
    moneda_venta_rel: Optional[MonedaRead] = None

    @validator("precio_compra", "precio_venta", pre=True)
    def parse_decimal(cls, v):
        if v is None:
            return None
        return float(v)


class MovimientoUpdate(SQLModel):
    id_tipo_movimiento: Optional[int] = None
    id_dependencia: Optional[int] = None
    id_producto: Optional[int] = None
    cantidad: Optional[int] = None
    observacion: Optional[str] = None
    estado: Optional[str] = None
    codigo: Optional[str] = None
    id_cliente: Optional[int] = None
    precio_compra: Optional[Decimal] = None
    moneda_compra: Optional[int] = None
    precio_venta: Optional[Decimal] = None
    moneda_venta: Optional[int] = None


class DestinoAjuste(SQLModel):
    id_dependencia: int
    cantidad: int


class AjusteCreate(SQLModel):
    id_movimiento_origen: int
    destinos: list[DestinoAjuste]
    fecha: Optional[str] = None
    observacion: Optional[str] = None


class MovimientoAjusteRead(SQLModel):
    id_movimiento: int
    tipo: str
    cantidad: int
    id_dependencia: int
    dependencia_nombre: Optional[str] = None
