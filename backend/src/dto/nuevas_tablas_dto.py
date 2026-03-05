from sqlmodel import SQLModel
from typing import Optional, List
from datetime import date


# ============== CONTRATO ==============
class ContratoBase(SQLModel):
    id_cliente: int
    nombre_contrato: str
    proforma: Optional[str] = None
    estado: str
    fecha: date
    vigencia: date
    tipo: Optional[str] = None
    id_moneda: int
    productos: Optional[dict] = None
    monto: Optional[float] = None
    documento_final: Optional[str] = None


class ContratoCreate(ContratoBase):
    pass


class ContratoRead(ContratoBase):
    id_contrato: int


class ContratoUpdate(SQLModel):
    id_cliente: Optional[int] = None
    nombre_contrato: Optional[str] = None
    proforma: Optional[str] = None
    estado: Optional[str] = None
    fecha: Optional[date] = None
    vigencia: Optional[date] = None
    tipo: Optional[str] = None
    id_moneda: Optional[int] = None
    productos: Optional[dict] = None
    monto: Optional[float] = None
    documento_final: Optional[str] = None


# ============== CONTRATO PRODUCTO ==============
class ContratoProductoBase(SQLModel):
    id_contrato: int
    id_producto: int
    cantidad: int = 1
    precio_unitario: float


class ContratoProductoCreate(ContratoProductoBase):
    pass


class ContratoProductoRead(ContratoProductoBase):
    id_contrato_producto: int


class ContratoProductoUpdate(SQLModel):
    id_contrato: Optional[int] = None
    id_producto: Optional[int] = None
    cantidad: Optional[int] = None
    precio_unitario: Optional[float] = None


# ============== SUPLEMENTO ==============
class SuplementoBase(SQLModel):
    id_contrato: int
    nombre_suplemento: str
    estado: str
    fecha: date
    id_moneda: int
    productos: Optional[dict] = None
    monto: Optional[float] = None
    documento: Optional[str] = None


class SuplementoCreate(SuplementoBase):
    pass


class SuplementoRead(SuplementoBase):
    id_suplemento: int


class SuplementoUpdate(SQLModel):
    id_contrato: Optional[int] = None
    nombre_suplemento: Optional[str] = None
    estado: Optional[str] = None
    fecha: Optional[date] = None
    id_moneda: Optional[int] = None
    productos: Optional[dict] = None
    monto: Optional[float] = None
    documento: Optional[str] = None


# ============== SUPLEMENTO PRODUCTO ==============
class SuplementoProductoBase(SQLModel):
    id_suplemento: int
    id_producto: int
    cantidad: int = 1
    precio_unitario: float


class SuplementoProductoCreate(SuplementoProductoBase):
    pass


class SuplementoProductoRead(SuplementoProductoBase):
    id_suplemento_producto: int


class SuplementoProductoUpdate(SQLModel):
    id_suplemento: Optional[int] = None
    id_producto: Optional[int] = None
    cantidad: Optional[int] = None
    precio_unitario: Optional[float] = None


# ============== FACTURA ==============
class FacturaBase(SQLModel):
    id_contrato: int
    codigo: str
    descripcion: Optional[str] = None
    observaciones: Optional[str] = None
    fecha: date
    id_moneda: int
    productos: Optional[dict] = None
    monto: Optional[float] = None


class FacturaCreate(FacturaBase):
    pass


class FacturaRead(FacturaBase):
    id_factura: int


class FacturaUpdate(SQLModel):
    id_contrato: Optional[int] = None
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    observaciones: Optional[str] = None
    fecha: Optional[date] = None
    id_moneda: Optional[int] = None
    productos: Optional[dict] = None
    monto: Optional[float] = None


# ============== FACTURA PRODUCTO ==============
class FacturaProductoBase(SQLModel):
    id_factura: int
    id_producto: int
    cantidad: int = 1
    precio_unitario: float


class FacturaProductoCreate(FacturaProductoBase):
    pass


class FacturaProductoRead(FacturaProductoBase):
    id_factura_producto: int


class FacturaProductoUpdate(SQLModel):
    id_factura: Optional[int] = None
    id_producto: Optional[int] = None
    cantidad: Optional[int] = None
    precio_unitario: Optional[float] = None


# ============== PAGO ==============
class PagoBase(SQLModel):
    id_factura: int
    numero_cheque_transferencia: Optional[str] = None
    monto: float
    numero_factura_RODAS: str
    fecha: date
    id_moneda: int


class PagoCreate(PagoBase):
    pass


class PagoRead(PagoBase):
    id_pago: int


class PagoUpdate(SQLModel):
    id_factura: Optional[int] = None
    numero_cheque_transferencia: Optional[str] = None
    monto: Optional[float] = None
    numero_factura_RODAS: Optional[str] = None
    fecha: Optional[date] = None
    id_moneda: Optional[int] = None


# ============== VENTA EFECTIVO ==============
class VentaEfectivoBase(SQLModel):
    slip: Optional[str] = None
    fecha: date
    id_dependencia: int
    id_producto: Optional[int] = None
    cajero: str
    productos: Optional[dict] = None
    monto: Optional[float] = None


class VentaEfectivoCreate(VentaEfectivoBase):
    pass


class VentaEfectivoRead(VentaEfectivoBase):
    id_venta_efectivo: int


class VentaEfectivoUpdate(SQLModel):
    slip: Optional[str] = None
    fecha: Optional[date] = None
    id_dependencia: Optional[int] = None
    id_producto: Optional[int] = None
    cajero: Optional[str] = None
    productos: Optional[dict] = None
    monto: Optional[float] = None


# ============== VENTA EFECTIVO PRODUCTO ==============
class VentaEfectivoProductoBase(SQLModel):
    id_venta_efectivo: int
    id_producto: int
    cantidad: int = 1
    precio_unitario: float


class VentaEfectivoProductoCreate(VentaEfectivoProductoBase):
    pass


class VentaEfectivoProductoRead(VentaEfectivoProductoBase):
    id_venta_efectivo_producto: int


class VentaEfectivoProductoUpdate(SQLModel):
    id_venta_efectivo: Optional[int] = None
    id_producto: Optional[int] = None
    cantidad: Optional[int] = None
    precio_unitario: Optional[float] = None
