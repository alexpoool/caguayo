from sqlmodel import SQLModel, Field
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from decimal import Decimal
from pydantic import field_validator
from .productos_dto import ProductoSimpleRead

if TYPE_CHECKING:
    from .clientes_dto import ClienteRead

ESTADOS_VALIDOS_COMPRA = {"PENDIENTE", "COMPLETADA", "ANULADA"}


# DTOs para Detalle de Compra
class DetalleCompraBase(SQLModel):
    id_producto: int
    cantidad: int = Field(gt=0)
    precio_unitario: Decimal = Field(ge=0)
    subtotal: Decimal = Field(ge=0)


class DetalleCompraCreate(SQLModel):
    id_producto: int
    cantidad: int = Field(gt=0)
    precio_unitario: Decimal = Field(ge=0)
    subtotal: Optional[Decimal] = Field(default=None, ge=0)


class DetalleCompraRead(DetalleCompraBase):
    id_detalle: int
    id_compra: int
    producto: Optional[ProductoSimpleRead] = None


# DTOs para Compras
class CompraBase(SQLModel):
    id_cliente: int
    fecha: datetime
    total: Decimal = Field(ge=0)
    estado: str = "PENDIENTE"
    observacion: Optional[str] = None

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, v: str) -> str:
        if v not in ESTADOS_VALIDOS_COMPRA:
            raise ValueError(f"estado debe ser uno de {ESTADOS_VALIDOS_COMPRA}")
        return v


class CompraCreate(SQLModel):
    id_cliente: int
    fecha: Optional[datetime] = None
    observacion: Optional[str] = None
    detalles: List[DetalleCompraCreate]


class CompraRead(CompraBase):
    id_compra: int
    fecha_registro: datetime
    fecha_actualizacion: Optional[datetime] = None
    cliente: Optional["ClienteRead"] = None
    detalles: List[DetalleCompraRead] = []


class CompraUpdate(SQLModel):
    id_cliente: Optional[int] = None
    fecha: Optional[datetime] = None
    observacion: Optional[str] = None
    estado: Optional[str] = None

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ESTADOS_VALIDOS_COMPRA:
            raise ValueError(f"estado debe ser uno de {ESTADOS_VALIDOS_COMPRA}")
        return v
