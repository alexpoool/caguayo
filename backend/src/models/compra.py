from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, ForeignKey, String
from typing import Optional, List, TYPE_CHECKING
from decimal import Decimal
from datetime import datetime, timezone
from enum import Enum

if TYPE_CHECKING:
    from .cliente import Cliente
    from .detalle_compra import DetalleCompra


class EstadoCompra(str, Enum):
    PENDIENTE = "PENDIENTE"
    COMPLETADA = "COMPLETADA"
    ANULADA = "ANULADA"


class Compra(SQLModel, table=True):
    __tablename__ = "compras"

    id_compra: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    id_cliente: int = Field(
        sa_column=Column(
            ForeignKey("clientes.id_cliente", ondelete="CASCADE"), nullable=False
        )
    )
    fecha: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    total: Decimal = Field(default=0, decimal_places=2)
    estado: str = Field(
        default="PENDIENTE",
        max_length=20,
        sa_column=Column(String(20), nullable=False, server_default="PENDIENTE"),
    )
    observacion: Optional[str] = None
    fecha_registro: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    fecha_actualizacion: Optional[datetime] = None

    # Relaciones
    cliente: "Cliente" = Relationship(back_populates="compras")
    detalles: List["DetalleCompra"] = Relationship(back_populates="compra")
