from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import date, datetime
from decimal import Decimal
from enum import Enum

if TYPE_CHECKING:
    from .venta import Ventas
    from .cliente import Cliente
    from .moneda import Moneda
    from .convenio import Convenio
    from .anexo import Anexo
    from .productos_en_liquidacion import ProductosEnLiquidacion


class TipoPago(str, Enum):
    TRANSFERENCIA = "TRANSFERENCIA"
    EFECTIVO = "EFECTIVO"
    CHEQUE = "CHEQUE"
    OTRO = "OTRO"


class Liquidacion(SQLModel, table=True):
    __tablename__ = "liquidacion"

    id_liquidacion: Optional[int] = Field(default=None, primary_key=True)
    codigo: str = Field(max_length=50, unique=True)

    id_cliente: int = Field(foreign_key="clientes.id_cliente")
    id_convenio: Optional[int] = Field(
        default=None, foreign_key="convenio.id_convenio", nullable=True
    )
    id_anexo: Optional[int] = Field(
        default=None, foreign_key="anexo.id_anexo", nullable=True
    )
    id_moneda: int = Field(foreign_key="moneda.id_moneda")

    liquidada: bool = Field(default=False)
    fecha_emision: date = Field(default_factory=date.today)
    fecha_liquidacion: Optional[date] = None
    observaciones: Optional[str] = None

    devengado: Decimal = Field(default=Decimal("0.00"), decimal_places=2, max_digits=15)
    tributario: Decimal = Field(
        default=Decimal("0.00"), decimal_places=2, max_digits=15
    )
    comision_bancaria: Decimal = Field(
        default=Decimal("0.00"), decimal_places=2, max_digits=15
    )
    gasto_empresa: Decimal = Field(
        default=Decimal("0.00"), decimal_places=2, max_digits=15
    )
    importe: Decimal = Field(default=Decimal("0.00"), decimal_places=2, max_digits=15)
    neto_pagar: Decimal = Field(
        default=Decimal("0.00"), decimal_places=2, max_digits=15
    )
    porcentaje_caguayo: Decimal = Field(
        default=Decimal("10.00"), decimal_places=2, max_digits=5
    )
    importe_caguayo: Decimal = Field(
        default=Decimal("0.00"), decimal_places=2, max_digits=15
    )
    tributario_monto: Decimal = Field(
        default=Decimal("0.00"), decimal_places=2, max_digits=15
    )

    tipo_pago: str = Field(default="TRANSFERENCIA", max_length=20)

    cliente: "Cliente" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Liquidacion.id_cliente]"}
    )
    moneda: "Moneda" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Liquidacion.id_moneda]"}
    )
    convenio: Optional["Convenio"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Liquidacion.id_convenio]"}
    )
    anexo: Optional["Anexo"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Liquidacion.id_anexo]"}
    )
    productos_en_liquidacion: List["ProductosEnLiquidacion"] = Relationship(
        back_populates="liquidacion"
    )
