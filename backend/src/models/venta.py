from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from decimal import Decimal
from datetime import datetime

if TYPE_CHECKING:
    from .anexo import Anexo
    from .producto import Productos
    from .moneda import Moneda
    from .transaccion import Transaccion
    from .liquidacion import Liquidacion


class Ventas(SQLModel, table=True):
    __tablename__ = "ventas"

    id_venta: Optional[int] = Field(default=None, primary_key=True)
    id_anexo: int = Field(foreign_key="anexo.id_anexo")
    id_producto: int = Field(foreign_key="productos.id_producto")
    codigo: str = Field(max_length=50)
    cantidad: int
    moneda_venta: int = Field(foreign_key="moneda.id_moneda")
    monto: Decimal
    id_transaccion: int = Field(foreign_key="transaccion.id_transaccion")
    id_liquidacion: Optional[int] = Field(
        default=None, foreign_key="liquidacion.id_liquidacion"
    )
    observacion: Optional[str] = None
    confirmacion: bool = False
    fecha_registro: datetime = Field(default_factory=datetime.utcnow)

    # Relaciones
    anexo: "Anexo" = Relationship(back_populates="ventas")
    producto: "Productos" = Relationship(back_populates="ventas")
    moneda_venta_rel: "Moneda" = Relationship(back_populates="ventas")
    transaccion: "Transaccion" = Relationship(back_populates="ventas")
    liquidacion: Optional["Liquidacion"] = Relationship(back_populates="ventas")
