from sqlmodel import SQLModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from .ventas_dto import VentaRead


class ClienteBase(SQLModel):
    nombre: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    cedula_rif: Optional[str] = None
    direccion: Optional[str] = None
    activo: bool = True
    tipo_relacion: str = "CLIENTE"


class ClienteCreate(ClienteBase):
    id_tipo_cliente: Optional[int] = None
    tipo_persona: str = "JURIDICA"
    nombre_artistico: Optional[str] = None
    razon_social: Optional[str] = None
    pagina_web: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    youtube: Optional[str] = None
    spotify: Optional[str] = None
    estado_artista: str = "PENDIENTE"
    fecha_inicio_contrato: Optional[datetime] = None
    fecha_fin_contrato: Optional[datetime] = None
    observaciones: Optional[str] = None
    tipo_relacion: str = "CLIENTE"


class ClienteRead(ClienteBase):
    id_cliente: int
    fecha_registro: datetime
    id_tipo_cliente: Optional[int] = None
    tipo_persona: str = "JURIDICA"
    nombre_artistico: Optional[str] = None
    razon_social: Optional[str] = None
    pagina_web: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    youtube: Optional[str] = None
    spotify: Optional[str] = None
    estado_artista: str = "PENDIENTE"
    fecha_inicio_contrato: Optional[datetime] = None
    fecha_fin_contrato: Optional[datetime] = None
    observaciones: Optional[str] = None
    tipo_relacion: str = "CLIENTE"


class ClienteReadWithVentas(ClienteRead):
    ventas: List[VentaRead] = []


class ClienteUpdate(SQLModel):
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    cedula_rif: Optional[str] = None
    direccion: Optional[str] = None
    activo: Optional[bool] = None
    id_tipo_cliente: Optional[int] = None
    tipo_persona: Optional[str] = None
    nombre_artistico: Optional[str] = None
    razon_social: Optional[str] = None
    pagina_web: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    youtube: Optional[str] = None
    spotify: Optional[str] = None
    estado_artista: Optional[str] = None
    fecha_inicio_contrato: Optional[datetime] = None
    fecha_fin_contrato: Optional[datetime] = None
    observaciones: Optional[str] = None
    tipo_relacion: Optional[str] = None


class ClienteSimpleRead(SQLModel):
    id_cliente: int
    nombre: str
