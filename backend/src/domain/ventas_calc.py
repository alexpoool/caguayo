from decimal import Decimal
from typing import List
from pydantic import BaseModel, computed_field


class DetalleCalculo(BaseModel):
    cantidad: Decimal
    precio_unitario: Decimal

    @computed_field
    @property
    def subtotal(self) -> Decimal:
        return self.cantidad * self.precio_unitario


class CalculadoraVentas(BaseModel):
    detalles: List[DetalleCalculo]

    @computed_field
    @property
    def total(self) -> Decimal:
        return sum((detalle.subtotal for detalle in self.detalles), Decimal("0.00"))
