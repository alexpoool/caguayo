from sqlmodel import SQLModel
from typing import Optional
from datetime import datetime
from .dependencias_dto import DependenciaRead
from .productos_dto import ProductosRead


# DTOs para Tipo Movimiento
class TipoMovimientoBase(SQLModel):
    tipo: str  # 'AJUSTE', 'MERMA', 'DONACION', 'RECEPCION', 'DEVOLUCION'
    factor: int  # 1 o -1


class TipoMovimientoCreate(TipoMovimientoBase):
    pass


class TipoMovimientoRead(TipoMovimientoBase):
    id_tipo_movimiento: int


class TipoMovimientoUpdate(SQLModel):
    tipo: Optional[str] = None
    factor: Optional[int] = None


# DTOs para Movimientos
class MovimientoBase(SQLModel):
    id_tipo_movimiento: int
    id_dependencia: int
    id_anexo: int
    id_producto: int
    cantidad: int
    observacion: Optional[str] = None


class MovimientoCreate(MovimientoBase):
    pass


class MovimientoRead(MovimientoBase):
    id_movimiento: int
    fecha: datetime
    id_liquidacion: Optional[int] = None
    confirmacion: bool = False
    tipo_movimiento: Optional[TipoMovimientoRead] = None
    dependencia: Optional[DependenciaRead] = None
    producto: Optional[ProductosRead] = None


class MovimientoUpdate(SQLModel):
    id_tipo_movimiento: Optional[int] = None
    id_dependencia: Optional[int] = None
    id_anexo: Optional[int] = None
    id_producto: Optional[int] = None
    cantidad: Optional[int] = None
    observacion: Optional[str] = None
    id_liquidacion: Optional[int] = None
    confirmacion: Optional[bool] = None
