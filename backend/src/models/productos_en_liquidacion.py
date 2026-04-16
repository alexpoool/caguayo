from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from decimal import Decimal
from enum import Enum

if TYPE_CHECKING:
    from .producto import Productos
    from .moneda import Moneda
    from .anexo import Anexo
    from .contrato import Factura, VentaEfectivo
    from .liquidacion import Liquidacion


class TipoCompra(str, Enum):
    FACTURA = "FACTURA"
    VENTA_EFECTIVO = "VENTA_EFECTIVO"
    ANEXO = "ANEXO"


class ProductosEnLiquidacion(SQLModel, table=True):
    __tablename__ = "productos_en_liquidacion"

    id_producto_en_liquidacion: Optional[int] = Field(default=None, primary_key=True)
    codigo: str = Field(max_length=50, unique=True)

    id_producto: int = Field(foreign_key="productos.id_producto")
    cantidad: int
    precio: Decimal = Field(decimal_places=4, max_digits=15)
    id_moneda: int = Field(foreign_key="moneda.id_moneda")

    tipo_compra: str = Field(max_length=20)

    id_factura: Optional[int] = Field(
        default=None, foreign_key="factura.id_factura", nullable=True
    )
    id_venta_efectivo: Optional[int] = Field(
        default=None, foreign_key="venta_efectivo.id_venta_efectivo", nullable=True
    )
    id_anexo: Optional[int] = Field(
        default=None, foreign_key="anexo.id_anexo", nullable=True
    )

    id_liquidacion: Optional[int] = Field(
        default=None, foreign_key="liquidacion.id_liquidacion", nullable=True
    )

    liquidada: bool = Field(default=False)
    fecha: datetime = Field(default_factory=datetime.utcnow)
    fecha_liquidacion: Optional[datetime] = None

    producto: "Productos" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[ProductosEnLiquidacion.id_producto]"}
    )
    moneda: "Moneda" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[ProductosEnLiquidacion.id_moneda]"}
    )
    factura: Optional["Factura"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[ProductosEnLiquidacion.id_factura]"}
    )
    venta_efectivo: Optional["VentaEfectivo"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[ProductosEnLiquidacion.id_venta_efectivo]"
        }
    )
    anexo: Optional["Anexo"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[ProductosEnLiquidacion.id_anexo]"}
    )
    liquidacion: Optional["Liquidacion"] = Relationship(
        sa_relationship_kwargs={
            "foreign_keys": "[ProductosEnLiquidacion.id_liquidacion]"
        }
    )
