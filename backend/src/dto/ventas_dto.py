from sqlmodel import SQLModel
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from decimal import Decimal
from .productos_dto import ProductoSimpleRead

if TYPE_CHECKING:
    from .clientes_dto import ClienteRead


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
    # Usamos string forward reference para evitar import circular en tiempo de carga
    cliente: Optional["ClienteRead"] = None
    detalles: List[DetalleVentaRead] = []


class VentaUpdate(SQLModel):
    id_cliente: Optional[int] = None
    fecha: Optional[datetime] = None
    observacion: Optional[str] = None
    estado: Optional[str] = None
