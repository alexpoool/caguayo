from sqlmodel import SQLModel
from typing import Optional, List
from datetime import date
from decimal import Decimal


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
    id_tipo_cliente: Optional[int] = None
    nombre: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None


class ClienteCreate(ClienteBase):
    pass


class ClienteRead(ClienteBase):
    id_cliente: int
    tipo_cliente: Optional[TipoClienteRead] = None


class ClienteUpdate(SQLModel):
    id_tipo_cliente: Optional[int] = None
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None


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
    id_cliente: int
    nombre_convenio: str
    fecha: date
    vigencia: date
    id_tipo_convenio: int
    codigo: Optional[str] = None


class ConvenioCreate(ConvenioBase):
    pass


class ConvenioRead(ConvenioBase):
    id_convenio: int
    cliente: Optional[ClienteRead] = None
    tipo_convenio: Optional[TipoConvenioRead] = None


class ConvenioUpdate(SQLModel):
    id_cliente: Optional[int] = None
    nombre_convenio: Optional[str] = None
    fecha: Optional[date] = None
    vigencia: Optional[date] = None
    id_tipo_convenio: Optional[int] = None


class AnexoBase(SQLModel):
    id_convenio: int
    id_moneda: Optional[int] = None
    nombre_anexo: str
    fecha: date
    codigo_anexo: Optional[str] = None
    id_dependencia: Optional[int] = None
    comision: Optional[Decimal] = None


class ItemAnexoBase(SQLModel):
    id_producto: int
    cantidad: int
    precio_venta: Decimal
    id_moneda: int
    codigo: Optional[str] = None


class ItemAnexoCreate(ItemAnexoBase):
    pass


class ItemAnexoRead(ItemAnexoBase):
    id_item_anexo: int
    id_anexo: int
    precio_compra: Decimal
    codigo: Optional[str] = None


class AnexoCreate(AnexoBase):
    items: Optional[List[ItemAnexoCreate]] = None


class AnexoRead(AnexoBase):
    id_anexo: int
    numero_anexo: Optional[str] = None
    convenios: Optional[ConvenioRead] = None
    items_anexo: Optional[List[ItemAnexoRead]] = None


class AnexoUpdate(SQLModel):
    id_convenio: Optional[int] = None
    id_moneda: Optional[int] = None
    nombre_anexo: Optional[str] = None
    fecha: Optional[date] = None
    codigo_anexo: Optional[str] = None
    id_dependencia: Optional[int] = None
    comision: Optional[Decimal] = None


class ClienteSimpleRead(SQLModel):
    id_cliente: int
    nombre: str


class ConvenioSimpleRead(SQLModel):
    id_convenio: int
    nombre_convenio: str
