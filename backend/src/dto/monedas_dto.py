from sqlmodel import SQLModel
from typing import Optional


class MonedaBase(SQLModel):
    nombre: str
    denominacion: str
    simbolo: str


class MonedaCreate(MonedaBase):
    pass


class MonedaRead(MonedaBase):
    id_moneda: int


class MonedaUpdate(SQLModel):
    nombre: Optional[str] = None
    denominacion: Optional[str] = None
    simbolo: Optional[str] = None
