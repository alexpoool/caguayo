from sqlmodel import SQLModel, Field
from typing import Optional
from decimal import Decimal
from pydantic import model_validator
from .monedas_dto import MonedaRead
from .categorias_dto import SubcategoriasRead


class ProductosBase(SQLModel):
    codigo: Optional[str] = None
    id_subcategoria: int
    nombre: str = Field(min_length=1, max_length=150)
    descripcion: Optional[str] = None
    moneda_compra: int
    precio_compra: Decimal = Field(ge=0)
    moneda_venta: int
    precio_venta: Decimal = Field(ge=0)
    precio_minimo: Decimal = Field(ge=0)


class ProductosCreate(ProductosBase):
    @model_validator(mode="after")
    def validar_precio_venta_minimo(self):
        if self.precio_minimo is not None and self.precio_venta < self.precio_minimo:
            raise ValueError("precio_venta no puede ser menor que precio_minimo")
        return self


class ProductosRead(ProductosBase):
    id_producto: int
    codigo: Optional[str] = None
    subcategoria: Optional["SubcategoriasRead"] = None
    moneda_compra_rel: Optional[MonedaRead] = None
    moneda_venta_rel: Optional[MonedaRead] = None
    cantidad: int = 0
    stock: int = 0

    model_config = {"validate_assignment": False}


class ProductosUpdate(SQLModel):
    codigo: Optional[str] = None
    id_subcategoria: Optional[int] = None
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=150)
    descripcion: Optional[str] = None
    moneda_compra: Optional[int] = None
    precio_compra: Optional[Decimal] = Field(default=None, ge=0)
    moneda_venta: Optional[int] = None
    precio_venta: Optional[Decimal] = Field(default=None, ge=0)
    precio_minimo: Optional[Decimal] = Field(default=None, ge=0)


# DTOs simplificados para Productos en Ventas (sin relaciones lazy)
class ProductoSimpleRead(SQLModel):
    id_producto: int
    codigo: Optional[str] = None
    nombre: str
    descripcion: Optional[str] = None
    precio_venta: Decimal
    precio_minimo: Optional[Decimal] = None
    cantidad: int = 0
    stock: int = 0
