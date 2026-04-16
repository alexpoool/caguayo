from sqlmodel import SQLModel
from typing import Optional, List
from datetime import date, datetime
from .ventas_dto import VentaRead


class ClienteNaturalData(SQLModel):
    nombre: Optional[str] = None
    primer_apellido: Optional[str] = None
    segundo_apellido: Optional[str] = None
    carnet_identidad: Optional[str] = None
    codigo_expediente: Optional[str] = None
    numero_registro: Optional[str] = None
    catalogo: Optional[str] = None
    es_trabajador: Optional[bool] = False
    ocupacion: Optional[str] = None
    centro_trabajo: Optional[str] = None
    correo_trabajo: Optional[str] = None
    direccion_trabajo: Optional[str] = None
    telefono_trabajo: Optional[str] = None
    en_baja: Optional[bool] = False
    fecha_baja: Optional[date] = None
    vigencia: Optional[date] = None


class ClienteJuridicaData(SQLModel):
    codigo_reup: Optional[str] = None
    id_tipo_entidad: Optional[int] = None


class ClienteTCPData(SQLModel):
    nombre: Optional[str] = None
    primer_apellido: Optional[str] = None
    segundo_apellido: Optional[str] = None
    direccion: Optional[str] = None
    numero_registro_proyecto: Optional[str] = None
    fecha_aprobacion: Optional[date] = None


class ClienteBase(SQLModel):
    model_config = {"populate_by_name": True}

    numero_cliente: Optional[str] = None
    nombre: Optional[str] = None
    tipo_persona: str = "NATURAL"
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
    cliente_natural: Optional[ClienteNaturalData] = None
    cliente_juridica: Optional[ClienteJuridicaData] = None
    cliente_tcp: Optional[ClienteTCPData] = None


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
