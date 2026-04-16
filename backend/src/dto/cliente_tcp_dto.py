from sqlmodel import SQLModel
from typing import Optional
from datetime import date


class ClienteTCPBase(SQLModel):
    nombre: str
    primer_apellido: str
    segundo_apellido: Optional[str] = None
    direccion: Optional[str] = None
    numero_registro_proyecto: Optional[str] = None
    fecha_aprobacion: Optional[date] = None


class ClienteTCPCreate(ClienteTCPBase):
    id_cliente: int


class ClienteTCPRead(ClienteTCPBase):
    id_cliente: int


class ClienteTCPUpdate(SQLModel):
    nombre: Optional[str] = None
    primer_apellido: Optional[str] = None
    segundo_apellido: Optional[str] = None
    direccion: Optional[str] = None
    numero_registro_proyecto: Optional[str] = None
    fecha_aprobacion: Optional[date] = None
