from sqlmodel import SQLModel
from typing import Optional
from .tipo_cuenta_dto import TipoCuentaRead


class CuentaBase(SQLModel):
    id_dependencia: Optional[int] = None
    id_cliente: Optional[int] = None
    id_tipo_cuenta: Optional[int] = None
    id_moneda: Optional[int] = None
    titular: str
    banco: str
    numero_cuenta: Optional[str] = None
    numero_tarjeta: Optional[str] = None
    sucursal: Optional[int] = None
    direccion: str


class CuentaCreate(CuentaBase):
    pass


class CuentaRead(CuentaBase):
    id_cuenta: int
    activo: bool = True
    tipo_cuenta: Optional[TipoCuentaRead] = None


class CuentaUpdate(SQLModel):
    id_dependencia: Optional[int] = None
    id_cliente: Optional[int] = None
    id_tipo_cuenta: Optional[int] = None
    id_moneda: Optional[int] = None
    titular: Optional[str] = None
    banco: Optional[str] = None
    numero_cuenta: Optional[str] = None
    numero_tarjeta: Optional[str] = None
    sucursal: Optional[int] = None
    direccion: Optional[str] = None
    activo: Optional[bool] = None
