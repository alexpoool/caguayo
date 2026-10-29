from sqlmodel import SQLModel, Field
from typing import Optional, List
from datetime import date
from decimal import Decimal
from src.dto.productos_dto import ProductoSimpleRead


class ItemOfertaTiendaBase(SQLModel):
    id_producto: int = Field(gt=0)
    cantidad: int = Field(gt=0)
    precio_venta: Decimal = Field(ge=0)
    id_moneda: int = Field(gt=0)
    codigo: Optional[str] = None


class ItemOfertaTiendaCreate(ItemOfertaTiendaBase):
    id_anexo: Optional[int] = None


class ItemOfertaTiendaRead(ItemOfertaTiendaBase):
    id_item_oferta_tienda: int
    id_oferta_tienda: int
    precio_compra: Decimal
    id_anexo: Optional[int] = None
    producto: Optional[ProductoSimpleRead] = None


class OfertaTiendaBase(SQLModel):
    id_contrato: int = Field(gt=0)
    codigo_oferta: Optional[str] = Field(default=None, min_length=1)
    descripcion: Optional[str] = None
    observaciones: Optional[str] = None
    fecha: date
    monto: Decimal = Field(default=Decimal("0.00"), ge=0)


class OfertaTiendaCreate(OfertaTiendaBase):
    id_moneda: Optional[int] = None
    items: Optional[List[ItemOfertaTiendaCreate]] = None
    monto: Optional[Decimal] = Field(default=None, ge=0)


class OfertaTiendaRead(OfertaTiendaBase):
    id_oferta_tienda: int
    estado: str = "ACTIVA"
    id_factura: Optional[int] = None
    # Documento generado al convertir la oferta (factura o pre-factura)
    tipo_factura: Optional[str] = None
    codigo_factura: Optional[str] = None


class OfertaTiendaReadWithDetails(OfertaTiendaRead):
    items: Optional[List[ItemOfertaTiendaRead]] = None


class OfertaTiendaUpdate(SQLModel):
    id_contrato: Optional[int] = Field(default=None, gt=0)
    codigo_oferta: Optional[str] = Field(default=None, min_length=1)
    descripcion: Optional[str] = None
    observaciones: Optional[str] = None
    fecha: Optional[date] = None
    monto: Optional[Decimal] = Field(default=None, ge=0)
    items: Optional[List[ItemOfertaTiendaCreate]] = None
