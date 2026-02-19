from sqlmodel import SQLModel
from typing import Optional
from .tipo_cuenta_dto import TipoCuentaRead


class CuentaBase(SQLModel):
    id_dependencia: Optional[int] = None
    id_tipo_cuenta: Optional[int] = None
    titular: str
    banco: str
    sucursal: Optional[int] = None
    direccion: str


class CuentaCreate(CuentaBase):
    pass


class CuentaRead(CuentaBase):
    id_cuenta: int
    tipo_cuenta: Optional[TipoCuentaRead] = None


class CuentaUpdate(SQLModel):
    id_dependencia: Optional[int] = None
    id_tipo_cuenta: Optional[int] = None
    titular: Optional[str] = None
    banco: Optional[str] = None
    sucursal: Optional[int] = None
    direccion: Optional[str] = None
