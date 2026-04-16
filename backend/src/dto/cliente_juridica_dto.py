from sqlmodel import SQLModel
from typing import Optional


class ClienteJuridicaBase(SQLModel):
    codigo_reup: str
    id_tipo_entidad: Optional[int] = None


class ClienteJuridicaCreate(ClienteJuridicaBase):
    id_cliente: int


class ClienteJuridicaRead(ClienteJuridicaBase):
    id_cliente: int


class ClienteJuridicaUpdate(SQLModel):
    codigo_reup: Optional[str] = None
    id_tipo_entidad: Optional[int] = None
