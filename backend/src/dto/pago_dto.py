from typing import Optional
from datetime import date
from decimal import Decimal
from sqlmodel import SQLModel


class PagoBase(SQLModel):
    id_factura: int
    fecha: date
    monto: Decimal = Decimal("0.00")
    id_moneda: Optional[int] = None
    tipo_pago: str = "TRANSFERENCIA"
    referencia: Optional[str] = None
    observaciones: Optional[str] = None


class PagoCreate(PagoBase):
    pass


class PagoRead(PagoBase):
    id_pago: int


class PagoUpdate(SQLModel):
    fecha: Optional[date] = None
    monto: Optional[Decimal] = None
    id_moneda: Optional[int] = None
    tipo_pago: Optional[str] = None
    referencia: Optional[str] = None
    observaciones: Optional[str] = None
