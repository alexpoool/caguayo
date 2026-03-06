from sqlmodel import SQLModel
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    from .ventas_dto import VentaRead


class ClienteBase(SQLModel):
    numero_cliente: str
    nombre: str
    tipo_persona: str
    cedula_rif: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    fax: Optional[str] = None
    web: Optional[str] = None
    codigo_postal: Optional[str] = None
    nit: Optional[str] = None
    direccion: Optional[str] = None
    activo: bool = True
    id_provincia: Optional[int] = None
    id_municipio: Optional[int] = None
    tipo_relacion: Optional[str] = None
    id_tipo_cliente: Optional[int] = None
    estado: str = "ACTIVO"


class ClienteCreate(ClienteBase):
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


class ClienteRead(ClienteBase):
    id_cliente: int
    fecha_registro: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None
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
    activo: bool = True


class ClienteUpdate(SQLModel):
    numero_cliente: Optional[str] = None
    nombre: Optional[str] = None
    tipo_persona: Optional[str] = None
    cedula_rif: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    fax: Optional[str] = None
    web: Optional[str] = None
    codigo_postal: Optional[str] = None
    nit: Optional[str] = None
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
    id_provincia: Optional[int] = None
    id_municipio: Optional[int] = None
    tipo_relacion: Optional[str] = None
    estado: Optional[str] = None


class ClienteSimpleRead(SQLModel):
    id_cliente: int
    numero_cliente: str
    nombre: str
    cedula_rif: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    tipo_relacion: str


class ClienteReadWithVentas(ClienteRead):
    ventas: List["VentaRead"] = []
