from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, ForeignKey
from typing import Optional, List, TYPE_CHECKING
from decimal import Decimal
from datetime import datetime
from enum import Enum

if TYPE_CHECKING:
    from .cliente import Cliente
    from .detalle_venta import DetalleVenta


class EstadoVenta(str, Enum):
    PENDIENTE = "PENDIENTE"
    COMPLETADA = "COMPLETADA"
    ANULADA = "ANULADA"


class Ventas(SQLModel, table=True):
    __tablename__ = "ventas"

    id_venta: Optional[int] = Field(default=None, primary_key=True)
    id_cliente: int = Field(
        sa_column=Column(
            ForeignKey("clientes.id_cliente", ondelete="CASCADE"), nullable=False
        )
    )
    fecha: datetime = Field(default_factory=datetime.utcnow)
    total: Decimal = Field(default=0, decimal_places=2)
    estado: EstadoVenta = Field(default=EstadoVenta.PENDIENTE)
    observacion: Optional[str] = None
    fecha_registro: datetime = Field(default_factory=datetime.utcnow)
    fecha_actualizacion: Optional[datetime] = None

    # Relaciones
    cliente: "Cliente" = Relationship(back_populates="ventas")
    detalles: List["DetalleVenta"] = Relationship(back_populates="venta")
