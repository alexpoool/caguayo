from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from decimal import Decimal
from sqlalchemy import Index

if TYPE_CHECKING:
    from .producto import Productos
    from .compra import Compra


class DetalleCompra(SQLModel, table=True):
    __tablename__ = "detalle_compras"
    __table_args__ = (
        Index("idx_detalle_compras_compra", "id_compra"),
        Index("idx_detalle_compras_producto", "id_producto"),
    )

    id_detalle: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    id_compra: int = Field(foreign_key="compras.id_compra")
    id_producto: int = Field(foreign_key="productos.id_producto")
    cantidad: int = Field(gt=0)
    precio_unitario: Decimal = Field(decimal_places=2)
    subtotal: Decimal = Field(decimal_places=2)

    # Relaciones
    compra: "Compra" = Relationship(back_populates="detalles")
    producto: "Productos" = Relationship(back_populates="detalles_compra")
