from sqlmodel import SQLModel
from datetime import datetime
from decimal import Decimal
from typing import Optional, List


# DTOs para Moneda
class MonedaBase(SQLModel):
    nombre: str
    denominacion: str
    simbolo: str


class MonedaCreate(MonedaBase):
    pass


class MonedaRead(MonedaBase):
    id_moneda: int


class MonedaUpdate(SQLModel):
    nombre: Optional[str] = None
    denominacion: Optional[str] = None
    simbolo: Optional[str] = None


# DTOs para Categorias
class CategoriasBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None


class CategoriasCreate(CategoriasBase):
    pass


class CategoriasRead(CategoriasBase):
    id_categoria: int


class CategoriasUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


# DTOs para Subcategorias
class SubcategoriasBase(SQLModel):
    id_categoria: int
    nombre: str
    descripcion: Optional[str] = None


class SubcategoriasCreate(SubcategoriasBase):
    pass


class SubcategoriasRead(SubcategoriasBase):
    id_subcategoria: int
    categoria: Optional[CategoriasRead] = None


class SubcategoriasUpdate(SQLModel):
    id_categoria: Optional[int] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


# DTOs para Productos
class ProductosBase(SQLModel):
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
    subcategoria: Optional[SubcategoriasRead] = None
    moneda_compra_rel: Optional[MonedaRead] = None
    moneda_venta_rel: Optional[MonedaRead] = None


class ProductosUpdate(SQLModel):
    id_subcategoria: Optional[int] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    moneda_compra: Optional[int] = None
    precio_compra: Optional[Decimal] = None
    moneda_venta: Optional[int] = None
    precio_venta: Optional[Decimal] = None
    precio_minimo: Optional[Decimal] = None


# DTOs para Ventas
class VentasBase(SQLModel):
    id_anexo: int
    id_producto: int
    codigo: str
    cantidad: int
    moneda_venta: int
    monto: Decimal
    id_transaccion: int
    observacion: Optional[str] = None


class VentasCreate(VentasBase):
    pass


class VentasRead(VentasBase):
    id_venta: int
    id_liquidacion: Optional[int] = None
    confirmacion: bool = False
    fecha_registro: datetime
    producto: Optional[ProductosRead] = None
    moneda_venta_rel: Optional[MonedaRead] = None


class VentasUpdate(SQLModel):
    id_anexo: Optional[int] = None
    id_producto: Optional[int] = None
    codigo: Optional[str] = None
    cantidad: Optional[int] = None
    moneda_venta: Optional[int] = None
    monto: Optional[Decimal] = None
    id_transaccion: Optional[int] = None
    id_liquidacion: Optional[int] = None
    observacion: Optional[str] = None
    confirmacion: Optional[bool] = None


# DTOs para Movimientos
class MovimientoBase(SQLModel):
    id_tipo_movimiento: int
    id_dependencia: int
    id_anexo: int
    id_producto: int
    cantidad: int
    observacion: Optional[str] = None


class MovimientoCreate(MovimientoBase):
    pass


class MovimientoRead(MovimientoBase):
    id_movimiento: int
    fecha: datetime
    id_liquidacion: Optional[int] = None
    confirmacion: bool = False
    tipo_movimiento: Optional["TipoMovimientoRead"] = None
    dependencia: Optional["DependenciaRead"] = None
    producto: Optional[ProductosRead] = None


class MovimientoUpdate(SQLModel):
    id_tipo_movimiento: Optional[int] = None
    id_dependencia: Optional[int] = None
    id_anexo: Optional[int] = None
    id_producto: Optional[int] = None
    cantidad: Optional[int] = None
    observacion: Optional[str] = None
    id_liquidacion: Optional[int] = None
    confirmacion: Optional[bool] = None


# DTOs para Tipo Movimiento
class TipoMovimientoBase(SQLModel):
    tipo: str  # 'AJUSTE', 'MERMA', 'DONACION', 'RECEPCION', 'DEVOLUCION'
    factor: int  # 1 o -1


class TipoMovimientoCreate(TipoMovimientoBase):
    pass


class TipoMovimientoRead(TipoMovimientoBase):
    id_tipo_movimiento: int


class TipoMovimientoUpdate(SQLModel):
    tipo: Optional[str] = None
    factor: Optional[int] = None


# DTOs para Dependencia (simplificado)
class DependenciaRead(SQLModel):
    id_dependencia: int
    id_tipo_dependencia: int
    id_datos_generales: int
    nombre: str


# DTOs para Dashboard
class DashboardStats(SQLModel):
    total_productos: int
    total_ventas: int
    total_movimientos: int
    total_categorias: int
    ventas_mes_actual: Decimal
    productos_stock_bajo: List[ProductosRead]


# Export all DTOs
__all__ = [
    "MonedaBase",
    "MonedaCreate",
    "MonedaRead",
    "MonedaUpdate",
    "CategoriasBase",
    "CategoriasCreate",
    "CategoriasRead",
    "CategoriasUpdate",
    "SubcategoriasBase",
    "SubcategoriasCreate",
    "SubcategoriasRead",
    "SubcategoriasUpdate",
    "ProductosBase",
    "ProductosCreate",
    "ProductosRead",
    "ProductosUpdate",
    "VentasBase",
    "VentasCreate",
    "VentasRead",
    "VentasUpdate",
    "MovimientoBase",
    "MovimientoCreate",
    "MovimientoRead",
    "MovimientoUpdate",
    "TipoMovimientoBase",
    "TipoMovimientoCreate",
    "TipoMovimientoRead",
    "TipoMovimientoUpdate",
    "DependenciaRead",
    "DashboardStats",
]
