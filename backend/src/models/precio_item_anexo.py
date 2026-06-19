from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from decimal import Decimal

if TYPE_CHECKING:
    from .item_anexo import ItemAnexo
    from .moneda import Moneda


class PrecioItemAnexo(SQLModel, table=True):
    __tablename__ = "precio_item_anexo"

    id_precio_item_anexo: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_kwargs={"autoincrement": True},
    )
    id_item_anexo: int = Field(foreign_key="item_anexo.id_item_anexo")
    id_moneda: int = Field(foreign_key="moneda.id_moneda")
    precio_venta: Decimal = Field(decimal_places=4, max_digits=15)
    precio_compra: Optional[Decimal] = Field(
        default=None, decimal_places=4, max_digits=15
    )

    item_anexo: "ItemAnexo" = Relationship(back_populates="precios")
    moneda: "Moneda" = Relationship(back_populates="precios_item_anexo")
