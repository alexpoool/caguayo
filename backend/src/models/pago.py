from typing import Optional
from datetime import date
from decimal import Decimal
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Column, ForeignKey


class Pago(SQLModel, table=True):
    __tablename__ = "pago"

    id_pago: Optional[int] = Field(default=None, primary_key=True)
    id_factura: int = Field(
        sa_column=Column(
            ForeignKey("factura.id_factura", ondelete="CASCADE"), nullable=False
        )
    )
    fecha: date = Field(default=date.today())
    monto: Decimal = Field(default=Decimal("0.00"))
    id_moneda: Optional[int] = Field(default=None, foreign_key="moneda.id_moneda")
    tipo_pago: str = Field(max_length=50, default="TRANSFERENCIA")
    referencia: Optional[str] = Field(default=None, max_length=100)
    observaciones: Optional[str] = None
