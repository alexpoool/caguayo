from sqlmodel import SQLModel, Field
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from decimal import Decimal
from pydantic import field_validator
from .productos_dto import ProductoSimpleRead

if TYPE_CHECKING:
    from .clientes_dto import ClienteRead

ESTADOS_VALIDOS = {"PENDIENTE", "COMPLETADA", "ANULADA"}


# DTOs para Detalle de Venta
class DetalleVentaBase(SQLModel):
    id_producto: int
    cantidad: int = Field(gt=0)
    precio_unitario: Decimal = Field(ge=0)
    subtotal: Decimal = Field(ge=0)


class DetalleVentaCreate(SQLModel):
    id_producto: int
    cantidad: int = Field(gt=0)
    precio_unitario: Decimal = Field(ge=0)
    subtotal: Optional[Decimal] = Field(default=None, ge=0)


class DetalleVentaRead(DetalleVentaBase):
    id_detalle: int
    id_venta: int
    producto: Optional[ProductoSimpleRead] = None


# DTOs para Ventas
class VentaBase(SQLModel):
    id_cliente: int
    fecha: datetime
    total: Decimal = Field(ge=0)
    estado: str = "PENDIENTE"  # PENDIENTE, COMPLETADA, ANULADA
    observacion: Optional[str] = None

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, v: str) -> str:
        if v not in ESTADOS_VALIDOS:
            raise ValueError(f"estado debe ser uno de {ESTADOS_VALIDOS}")
        return v


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

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ESTADOS_VALIDOS:
            raise ValueError(f"estado debe ser uno de {ESTADOS_VALIDOS}")
        return v
