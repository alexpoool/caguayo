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


# DTOs simplificados para Productos en Ventas (sin relaciones lazy)
class ProductoSimpleRead(SQLModel):
    id_producto: int
    nombre: str
    descripcion: Optional[str] = None
    precio_venta: Decimal
    precio_minimo: Decimal
    stock: int = 0


# DTOs para Detalle de Venta
class DetalleVentaBase(SQLModel):
    id_producto: int
    cantidad: int
    precio_unitario: Decimal
    subtotal: Decimal


class DetalleVentaCreate(SQLModel):
    id_producto: int
    cantidad: int
    precio_unitario: Decimal
    subtotal: Optional[Decimal] = None


class DetalleVentaRead(DetalleVentaBase):
    id_detalle: int
    id_venta: int
    producto: Optional[ProductoSimpleRead] = None


# DTOs para Ventas
class VentaBase(SQLModel):
    id_cliente: int
    fecha: datetime
    total: Decimal
    estado: str = "PENDIENTE"  # PENDIENTE, COMPLETADA, ANULADA
    observacion: Optional[str] = None


class VentaCreate(SQLModel):
    id_cliente: int
    fecha: Optional[datetime] = None
    observacion: Optional[str] = None
    detalles: List[DetalleVentaCreate]


class VentaRead(VentaBase):
    id_venta: int
    fecha_registro: datetime
    fecha_actualizacion: Optional[datetime] = None
    cliente: Optional["ClienteRead"] = None
    detalles: List[DetalleVentaRead] = []


class VentaUpdate(SQLModel):
    id_cliente: Optional[int] = None
    fecha: Optional[datetime] = None
    observacion: Optional[str] = None
    estado: Optional[str] = None


# DTOs para Clientes
class ClienteBase(SQLModel):
    nombre: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    cedula_rif: Optional[str] = None
    direccion: Optional[str] = None
    activo: bool = True


class ClienteCreate(ClienteBase):
    pass


class ClienteRead(ClienteBase):
    id_cliente: int
    fecha_registro: datetime


class ClienteReadWithVentas(ClienteRead):
    ventas: List[VentaRead] = []


class ClienteUpdate(SQLModel):
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    cedula_rif: Optional[str] = None
    direccion: Optional[str] = None
    activo: Optional[bool] = None


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
    "ProductoSimpleRead",
    "DetalleVentaBase",
    "DetalleVentaCreate",
    "DetalleVentaRead",
    "VentaBase",
    "VentaCreate",
    "VentaRead",
    "VentaUpdate",
    "ClienteBase",
    "ClienteCreate",
    "ClienteRead",
    "ClienteReadWithVentas",
    "ClienteUpdate",
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
