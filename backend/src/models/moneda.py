from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .producto import Productos
    from .venta import Ventas


class Moneda(SQLModel, table=True):
    __tablename__ = "moneda"

    id_moneda: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=50, unique=True)
    denominacion: str = Field(max_length=100)
    simbolo: str = Field(max_length=5, unique=True)

    # Relaciones
    productos_compra: List["Productos"] = Relationship(
        back_populates="moneda_compra_rel",
        sa_relationship_kwargs={"foreign_keys": "Productos.moneda_compra"},
    )
    productos_venta: List["Productos"] = Relationship(
        back_populates="moneda_venta_rel",
        sa_relationship_kwargs={"foreign_keys": "Productos.moneda_venta"},
    )
