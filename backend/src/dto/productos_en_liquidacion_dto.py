from sqlmodel import SQLModel, Field
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from decimal import Decimal
from pydantic import field_validator

TIPOS_COMPRA_VALIDOS = {"FACTURA", "VENTA_EFECTIVO", "ANEXO", "COMPRA VENTA"}

if TYPE_CHECKING:
    from .productos_dto import ProductoSimpleRead
    from .monedas_dto import MonedaRead


class ProductosEnLiquidacionBase(SQLModel):
    id_producto: int = Field(gt=0)
    cantidad: int = Field(gt=0)
    precio: Decimal = Field(ge=0)
    id_moneda: int = Field(gt=0)
    tipo_compra: str
    id_factura: Optional[int] = None
    id_venta_efectivo: Optional[int] = None
    id_anexo: Optional[int] = None
    liquidada: bool = False

    @field_validator("tipo_compra")
    @classmethod
    def validar_tipo_compra(cls, v: str) -> str:
        if v not in TIPOS_COMPRA_VALIDOS:
            raise ValueError(f"tipo_compra debe ser uno de {TIPOS_COMPRA_VALIDOS}")
        return v


class ProductosEnLiquidacionCreate(ProductosEnLiquidacionBase):
    pass


class AnexoSimpleRead(SQLModel):
    id_anexo: int
    nombre_anexo: str


class FacturaInfo(SQLModel):
    id_factura: int
    codigo_factura: str
    monto: float
    pagado: float
    esta_pagada: bool


class ProductosEnLiquidacionRead(ProductosEnLiquidacionBase):
    id_producto_en_liquidacion: int
    codigo: str
    fecha: datetime
    fecha_liquidacion: Optional[datetime] = None
    producto: Optional["ProductoSimpleRead"] = None
    moneda: Optional["MonedaRead"] = None
    cantidad_original: Optional[int] = None
    cantidad_liquidada: Optional[int] = None
    id_cliente: Optional[int] = None
    anexo: Optional["AnexoSimpleRead"] = None
    info_factura: Optional[FacturaInfo] = None


class ProductosEnLiquidacionUpdate(SQLModel):
    cantidad: Optional[int] = Field(default=None, gt=0)
    precio: Optional[Decimal] = Field(default=None, ge=0)
    id_moneda: Optional[int] = Field(default=None, gt=0)
    liquidada: Optional[bool] = None
    fecha_liquidacion: Optional[datetime] = None


# Rebuild forward references
from .productos_dto import ProductoSimpleRead  # noqa: E402
from .monedas_dto import MonedaRead  # noqa: E402

AnexoSimpleRead.model_rebuild()
FacturaInfo.model_rebuild()
ProductosEnLiquidacionRead.model_rebuild()
