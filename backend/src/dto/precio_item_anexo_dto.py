from sqlmodel import SQLModel, Field
from typing import Optional
from decimal import Decimal


class PrecioItemAnexoCreate(SQLModel):
    id_moneda: int = Field(gt=0)
    precio_venta: Decimal = Field(ge=0)
    precio_compra: Optional[Decimal] = Field(default=None, ge=0)


class PrecioItemAnexoRead(SQLModel):
    id_precio_item_anexo: int
    id_item_anexo: int
    id_moneda: int
    precio_venta: Decimal
    precio_compra: Optional[Decimal] = None
