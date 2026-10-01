from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlmodel import Field, SQLModel
from sqlalchemy import Index


class Saldo(SQLModel, table=True):
    """Snapshot acumulado de stock por producto y dependencia.

    Cada fila registra el saldo ACUMULADO hasta `fecha` en UNIDADES
    (cantidad × factor del tipo de movimiento), solo de movimientos
    confirmados. Se inserta al confirmar un movimiento y se recalcula
    al cancelar uno (ver SaldoService).

    El reporte de movimientos por dependencia toma el saldo inicial leyendo
    el snapshot más reciente con `fecha < fecha_inicio` del filtro del usuario.
    El valor monetario se calcula al leer (saldo × precio_compra actual), por
    lo que la tabla no depende de precios.
    """

    __tablename__ = "saldos"
    __table_args__ = (
        Index(
            "idx_saldos_producto_dependencia_fecha",
            "id_producto",
            "id_dependencia",
            "fecha",
        ),
    )

    id_saldo: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    id_producto: int = Field(foreign_key="productos.id_producto")
    id_dependencia: int = Field(foreign_key="dependencia.id_dependencia")
    fecha: datetime
    saldo: Decimal = Field(
        default=Decimal("0"), decimal_places=4, max_digits=15
    )
