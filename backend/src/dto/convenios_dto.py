from sqlmodel import SQLModel, Field
from typing import Optional, List
from datetime import date
from decimal import Decimal
from pydantic import field_validator
import re
from .precio_item_anexo_dto import PrecioItemAnexoCreate, PrecioItemAnexoRead

EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"


class TipoClienteBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None


class TipoClienteCreate(TipoClienteBase):
    pass


class TipoClienteRead(TipoClienteBase):
    id_tipo_cliente: int


class TipoClienteUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


# DTOs para TipoProveedor
class TipoProveedorBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None


class TipoProveedorCreate(TipoProveedorBase):
    pass


class TipoProveedorRead(TipoProveedorBase):
    id_tipo_proveedor: int


class TipoProveedorUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


class ClienteBase(SQLModel):
    codigo: str
    id_tipo_cliente: Optional[int] = None
    nombre: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validar_email(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not re.match(EMAIL_REGEX, v):
            raise ValueError("Email inválido")
        return v


class ClienteCreate(ClienteBase):
    pass


class ClienteRead(ClienteBase):
    id_cliente: int
    tipo_cliente: Optional[TipoClienteRead] = None


class ClienteUpdate(SQLModel):
    codigo: Optional[str] = None
    id_tipo_cliente: Optional[int] = None
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validar_email(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not re.match(EMAIL_REGEX, v):
            raise ValueError("Email inválido")
        return v


# Alias to avoid conflict with clientes_dto.py
ConvenioClienteBase = ClienteBase
ConvenioClienteCreate = ClienteCreate
ConvenioClienteRead = ClienteRead
ConvenioClienteUpdate = ClienteUpdate


class TipoConvenioBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None


class TipoConvenioCreate(TipoConvenioBase):
    pass


class TipoConvenioRead(TipoConvenioBase):
    id_tipo_convenio: int


class TipoConvenioUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


class ConvenioBase(SQLModel):
    id_cliente: int = Field(gt=0)
    nombre_convenio: str = Field(min_length=1)
    fecha: date
    vigencia: date
    id_tipo_convenio: int = Field(gt=0)
    codigo: Optional[str] = None


class ConvenioCreate(ConvenioBase):
    @field_validator("vigencia")
    @classmethod
    def vigencia_no_anterior_a_fecha(cls, v: date, info) -> date:
        fecha = info.data.get("fecha")
        if fecha and v < fecha:
            raise ValueError("La vigencia no puede ser anterior a la fecha de inicio")
        return v

    @field_validator("fecha")
    @classmethod
    def fecha_no_futura(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("La fecha no puede ser futura")
        return v


class ConvenioRead(ConvenioBase):
    id_convenio: int
    cliente: Optional[ClienteRead] = None
    tipo_convenio: Optional[TipoConvenioRead] = None


class ConvenioUpdate(SQLModel):
    id_cliente: Optional[int] = Field(default=None, gt=0)
    nombre_convenio: Optional[str] = Field(default=None, min_length=1)
    fecha: Optional[date] = None
    vigencia: Optional[date] = None
    id_tipo_convenio: Optional[int] = Field(default=None, gt=0)

    @field_validator("vigencia")
    @classmethod
    def vigencia_no_anterior_a_fecha(cls, v: Optional[date], info) -> Optional[date]:
        if v is None:
            return v
        fecha = info.data.get("fecha")
        if fecha and v < fecha:
            raise ValueError("La vigencia no puede ser anterior a la fecha de inicio")
        return v

    @field_validator("fecha")
    @classmethod
    def fecha_no_futura(cls, v: Optional[date]) -> Optional[date]:
        if v is not None and v > date.today():
            raise ValueError("La fecha no puede ser futura")
        return v


class AnexoBase(SQLModel):
    id_convenio: int = Field(gt=0)
    nombre_anexo: str = Field(min_length=1)
    fecha: date
    codigo_anexo: Optional[str] = None
    id_dependencia: Optional[int] = None
    comision: Optional[Decimal] = None


class ItemAnexoBase(SQLModel):
    id_producto: int = Field(gt=0)
    entrada: int = Field(gt=0)
    vendido: int = Field(default=0, ge=0)
    precio_venta: Decimal = Field(ge=0)
    id_moneda: int = Field(gt=0)
    codigo: Optional[str] = None


class ItemAnexoCreate(ItemAnexoBase):
    precios: Optional[List[PrecioItemAnexoCreate]] = None


class ItemAnexoRead(ItemAnexoBase):
    id_item_anexo: int
    id_anexo: int
    precio_compra: Decimal
    codigo: Optional[str] = None
    cantidad_liquidada: int = 0
    precios: Optional[List[PrecioItemAnexoRead]] = None


class AnexoCreate(AnexoBase):
    items: Optional[List[ItemAnexoCreate]] = None
    comision: Optional[Decimal] = Field(default=None, ge=0, le=100)

    @field_validator("fecha")
    @classmethod
    def fecha_no_futura(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("La fecha no puede ser futura")
        return v


class AnexoRead(AnexoBase):
    id_anexo: int
    numero_anexo: Optional[str] = None
    convenios: Optional[ConvenioRead] = None
    items_anexo: Optional[List[ItemAnexoRead]] = None


class AnexoUpdate(SQLModel):
    id_convenio: Optional[int] = Field(default=None, gt=0)
    nombre_anexo: Optional[str] = Field(default=None, min_length=1)
    fecha: Optional[date] = None
    codigo_anexo: Optional[str] = None
    id_dependencia: Optional[int] = None
    comision: Optional[Decimal] = Field(default=None, ge=0, le=100)

    @field_validator("fecha")
    @classmethod
    def fecha_no_futura(cls, v: Optional[date]) -> Optional[date]:
        if v is not None and v > date.today():
            raise ValueError("La fecha no puede ser futura")
        return v


class ClienteSimpleRead(SQLModel):
    id_cliente: int
    codigo: str
    nombre: str


class ConvenioSimpleRead(SQLModel):
    id_convenio: int
    nombre_convenio: str
