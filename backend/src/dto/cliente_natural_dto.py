from sqlmodel import SQLModel
from typing import Optional
from datetime import date


class ClienteNaturalBase(SQLModel):
    nombre: str
    primer_apellido: str
    segundo_apellido: Optional[str] = None
    carnet_identidad: str
    codigo_expediente: Optional[str] = None
    numero_registro: Optional[str] = None
    catalogo: Optional[str] = None
    es_trabajador: bool = False
    ocupacion: Optional[str] = None
    centro_trabajo: Optional[str] = None
    correo_trabajo: Optional[str] = None
    direccion_trabajo: Optional[str] = None
    telefono_trabajo: Optional[str] = None
    en_baja: bool = False
    fecha_baja: Optional[date] = None
    vigencia: Optional[date] = None


class ClienteNaturalCreate(ClienteNaturalBase):
    id_cliente: int


class ClienteNaturalRead(ClienteNaturalBase):
    id_cliente: int


class ClienteNaturalUpdate(SQLModel):
    nombre: Optional[str] = None
    primer_apellido: Optional[str] = None
    segundo_apellido: Optional[str] = None
    carnet_identidad: Optional[str] = None
    codigo_expediente: Optional[str] = None
    numero_registro: Optional[str] = None
    catalogo: Optional[str] = None
    es_trabajador: Optional[bool] = None
    ocupacion: Optional[str] = None
    centro_trabajo: Optional[str] = None
    correo_trabajo: Optional[str] = None
    direccion_trabajo: Optional[str] = None
    telefono_trabajo: Optional[str] = None
    en_baja: Optional[bool] = None
    fecha_baja: Optional[date] = None
    vigencia: Optional[date] = None
