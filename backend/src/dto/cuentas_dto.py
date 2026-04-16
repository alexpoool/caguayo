from sqlmodel import SQLModel
from typing import Optional
from .monedas_dto import MonedaRead


class CuentaBase(SQLModel):
    id_cliente: Optional[int] = None
    id_dependencia: Optional[int] = None
    id_moneda: Optional[int] = None
    titular: Optional[str] = None
    banco: Optional[str] = None
    sucursal: Optional[int] = None
    numero_cuenta: Optional[str] = None
    direccion: Optional[str] = None


class CuentaCreate(CuentaBase):
    pass


class CuentaRead(CuentaBase):
    id_cuenta: Optional[int] = None
    moneda: Optional[MonedaRead] = None


class CuentaUpdate(SQLModel):
    id_cliente: Optional[int] = None
    id_dependencia: Optional[int] = None
    id_moneda: Optional[int] = None
    titular: Optional[str] = None
    banco: Optional[str] = None
    sucursal: Optional[int] = None
    numero_cuenta: Optional[str] = None
    direccion: Optional[str] = None
