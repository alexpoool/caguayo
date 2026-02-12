from sqlmodel import SQLModel
from typing import Optional, List
from datetime import datetime
from .ventas_dto import VentaRead


class ClienteBase(SQLModel):
    nombre: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    cedula_rif: Optional[str] = None
    direccion: Optional[str] = None
    activo: bool = True


class ClienteCreate(ClienteBase):
    pass


class ClienteRead(ClienteBase):
    id_cliente: int
    fecha_registro: datetime


class ClienteReadWithVentas(ClienteRead):
    ventas: List[VentaRead] = []


class ClienteUpdate(SQLModel):
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    cedula_rif: Optional[str] = None
    direccion: Optional[str] = None
    activo: Optional[bool] = None
