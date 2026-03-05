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
    id_provincia: Optional[int] = None
    id_municipio: Optional[int] = None
    tipo_relacion: str
    id_tipo_cliente: Optional[int] = None
    estado: str = "ACTIVO"


class ClienteCreate(ClienteBase):
    pass


class ClienteRead(ClienteBase):
    id_cliente: int
    fecha_registro: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None
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
    id_provincia: Optional[int] = None
    id_municipio: Optional[int] = None
    tipo_relacion: Optional[str] = None
    id_tipo_cliente: Optional[int] = None
    estado: Optional[str] = None
    activo: Optional[bool] = None


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
