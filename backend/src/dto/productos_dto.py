from sqlmodel import SQLModel
from typing import Optional
from decimal import Decimal
from .monedas_dto import MonedaRead
from .categorias_dto import SubcategoriasRead


class ProductosBase(SQLModel):
    codigo: Optional[str] = None
    id_subcategoria: int
    nombre: str
    descripcion: Optional[str] = None
    moneda_compra: int
    precio_compra: Decimal
    moneda_venta: int
    precio_venta: Decimal
    precio_minimo: Decimal


class ProductosCreate(ProductosBase):
    pass


class ProductosRead(ProductosBase):
    id_producto: int
    codigo: Optional[str] = None
    subcategoria: Optional[SubcategoriasRead] = None
    moneda_compra_rel: Optional[MonedaRead] = None
    moneda_venta_rel: Optional[MonedaRead] = None
    # Campo calculado - cantidad total de movimientos confirmados
    cantidad: int = 0


class ProductosUpdate(SQLModel):
    codigo: Optional[str] = None
    id_subcategoria: Optional[int] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    moneda_compra: Optional[int] = None
    precio_compra: Optional[Decimal] = None
    moneda_venta: Optional[int] = None
    precio_venta: Optional[Decimal] = None
    precio_minimo: Optional[Decimal] = None


# DTOs simplificados para Productos en Ventas (sin relaciones lazy)
class ProductoSimpleRead(SQLModel):
    id_producto: int
    codigo: Optional[str] = None
    nombre: str
    descripcion: Optional[str] = None
    precio_venta: Decimal
    precio_minimo: Decimal
    # Campo calculado - cantidad total de movimientos confirmados
    cantidad: int = 0
