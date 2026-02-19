from sqlmodel import SQLModel
from typing import Optional


class TipoCuentaBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None


class TipoCuentaCreate(TipoCuentaBase):
    pass


class TipoCuentaRead(TipoCuentaBase):
    id_tipo_cuenta: int


class TipoCuentaUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
