from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    from .dependencia import Dependencia
    from .anexo import Anexo
    from .producto import Productos
    from .liquidacion import Liquidacion


class TipoMovimiento(SQLModel, table=True):
    __tablename__ = "tipo_movimiento"

    id_tipo_movimiento: Optional[int] = Field(default=None, primary_key=True)
    tipo: str = Field(
        max_length=20, unique=True
    )  # 'AJUSTE', 'MERMA', 'DONACION', 'RECEPCION', 'DEVOLUCION'
    factor: int  # 1 o -1

    # Relaciones
    movimientos: List["Movimiento"] = Relationship(back_populates="tipo_movimiento")


class Movimiento(SQLModel, table=True):
    __tablename__ = "movimiento"

    id_movimiento: Optional[int] = Field(default=None, primary_key=True)
    id_tipo_movimiento: int = Field(foreign_key="tipo_movimiento.id_tipo_movimiento")
    id_dependencia: int = Field(foreign_key="dependencia.id_dependencia")
    id_anexo: int = Field(foreign_key="anexo.id_anexo")
    id_producto: int = Field(foreign_key="productos.id_producto")
    cantidad: int
    fecha: datetime = Field(default_factory=datetime.utcnow)
    observacion: Optional[str] = None
    id_liquidacion: Optional[int] = Field(
        default=None, foreign_key="liquidacion.id_liquidacion"
    )
    confirmacion: bool = False

    # Relaciones
    tipo_movimiento: TipoMovimiento = Relationship(back_populates="movimientos")
    dependencia: "Dependencia" = Relationship(back_populates="movimientos")
    anexo: "Anexo" = Relationship(back_populates="movimientos")
    producto: "Productos" = Relationship(back_populates="movimientos")
    liquidacion: Optional["Liquidacion"] = Relationship(back_populates="movimientos")
