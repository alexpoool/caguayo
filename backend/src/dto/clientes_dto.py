from sqlmodel import SQLModel
from typing import Optional, List
from datetime import date, datetime
from .ventas_dto import VentaRead


class ClienteBase(SQLModel):
    model_config = {"populate_by_name": True}

    numero_cliente: Optional[str] = None
    nombre: Optional[str] = None
    tipo_persona: Optional[str] = None
    cedula_rif: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    fax: Optional[str] = None
    web: Optional[str] = None
    id_provincia: Optional[int] = None
    id_municipio: Optional[int] = None
    codigo_postal: Optional[str] = None
    direccion: Optional[str] = None
    tipo_relacion: Optional[str] = None
    estado: Optional[str] = None
    fecha_registro: Optional[datetime] = None
    activo: Optional[bool] = None


class ClienteCreate(ClienteBase):
    pass


class ClienteRead(ClienteBase):
    id_cliente: int = 0


class ClienteReadWithVentas(ClienteRead):
    ventas: List[VentaRead] = []


class ClienteUpdate(SQLModel):
    numero_cliente: Optional[str] = None
    nombre: Optional[str] = None
    tipo_persona: Optional[str] = None
    cedula_rif: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    fax: Optional[str] = None
    web: Optional[str] = None
    id_provincia: Optional[int] = None
    id_municipio: Optional[int] = None
    codigo_postal: Optional[str] = None
    direccion: Optional[str] = None
    tipo_relacion: Optional[str] = None
    estado: Optional[str] = None
    fecha_registro: Optional[datetime] = None
    activo: Optional[bool] = None


class ClienteSimpleRead(SQLModel):
    id_cliente: int
    numero_cliente: Optional[str] = None
    nombre: Optional[str] = None
    cedula_rif: Optional[str] = None
    tipo_persona: Optional[str] = None
    estado: Optional[str] = None
    activo: Optional[bool] = None
