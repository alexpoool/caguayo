from sqlmodel import SQLModel
from typing import Optional
from decimal import Decimal


class FichaTarifaCreate(SQLModel):
    categoria: str
    tarifa_horaria: Decimal = Decimal("0")


class FichaTarifaUpdate(SQLModel):
    categoria: Optional[str] = None
    tarifa_horaria: Optional[Decimal] = None


class FichaTarifaRead(SQLModel):
    id_tarifa: int
    categoria: str
    tarifa_horaria: Decimal
