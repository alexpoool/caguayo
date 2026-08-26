from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from decimal import Decimal
from sqlalchemy import Index

if TYPE_CHECKING:
    from .producto import Productos
    from .venta import Ventas


class DetalleVenta(SQLModel, table=True):
    __tablename__ = "detalle_ventas"
    __table_args__ = (
        Index("idx_detalle_venta_producto", "id_producto"),
        Index("idx_detalle_venta_venta", "id_venta"),
    )

    id_detalle: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    id_venta: int = Field(foreign_key="ventas.id_venta")
    id_producto: int = Field(foreign_key="productos.id_producto")
    cantidad: int = Field(gt=0)
    precio_unitario: Decimal = Field(decimal_places=2)
    subtotal: Decimal = Field(decimal_places=2)

    # Relaciones
    venta: "Ventas" = Relationship(back_populates="detalles")
    producto: "Productos" = Relationship(back_populates="detalles_venta")
