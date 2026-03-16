from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from decimal import Decimal

if TYPE_CHECKING:
    from .dependencia import Dependencia
    from .producto import Productos
    from .cliente import Cliente
    from .moneda import Moneda
    from .anexo import Anexo
    from .convenio import Convenio
    from .liquidacion import Liquidacion


class TipoMovimiento(SQLModel, table=True):
    __tablename__ = "tipo_movimiento"

    id_tipo_movimiento: Optional[int] = Field(default=None, primary_key=True)
    tipo: str = Field(max_length=20, unique=True)
    factor: int

    movimientos: List["Movimiento"] = Relationship(back_populates="tipo_movimiento")


class Movimiento(SQLModel, table=True):
    __tablename__ = "movimiento"

    id_movimiento: Optional[int] = Field(default=None, primary_key=True)
    id_tipo_movimiento: int = Field(foreign_key="tipo_movimiento.id_tipo_movimiento")
    id_dependencia: int = Field(foreign_key="dependencia.id_dependencia")
    id_anexo: Optional[int] = Field(default=None, foreign_key="anexo.id_anexo")
    id_producto: int = Field(foreign_key="productos.id_producto")
    cantidad: int
    fecha: datetime = Field(default_factory=datetime.utcnow)
    observacion: Optional[str] = None
    id_liquidacion: Optional[int] = Field(
        default=None, foreign_key="liquidacion.id_liquidacion"
    )
    estado: str = Field(default="pendiente", max_length=20)
    codigo: Optional[str] = Field(default=None, max_length=100)
    id_convenio: Optional[int] = Field(default=None, foreign_key="convenio.id_convenio")
    id_cliente: Optional[int] = Field(default=None, foreign_key="clientes.id_cliente")
    precio_compra: Optional[Decimal] = Field(
        default=None, decimal_places=4, max_digits=15
    )
    moneda_compra: Optional[int] = Field(default=None, foreign_key="moneda.id_moneda")
    precio_venta: Optional[Decimal] = Field(
        default=None, decimal_places=4, max_digits=15
    )
    moneda_venta: Optional[int] = Field(default=None, foreign_key="moneda.id_moneda")
    id_factura: Optional[int] = Field(default=None, foreign_key="factura.id_factura")
    id_venta_efectivo: Optional[int] = Field(
        default=None, foreign_key="venta_efectivo.id_venta_efectivo"
    )
    id_contrato: Optional[int] = Field(default=None, foreign_key="contrato.id_contrato")

    tipo_movimiento: TipoMovimiento = Relationship(back_populates="movimientos")
    dependencia: "Dependencia" = Relationship(back_populates="movimientos")
    producto: "Productos" = Relationship(back_populates="movimientos")
    cliente: Optional["Cliente"] = Relationship(back_populates="movimientos")
    moneda_compra_rel: Optional["Moneda"] = Relationship(
        back_populates="movimientos_compra",
        sa_relationship_kwargs={"foreign_keys": "Movimiento.moneda_compra"},
    )
    moneda_venta_rel: Optional["Moneda"] = Relationship(
        back_populates="movimientos_venta",
        sa_relationship_kwargs={"foreign_keys": "Movimiento.moneda_venta"},
    )
