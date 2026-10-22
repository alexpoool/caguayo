"""Pago por resultado: lote por periodo de evaluación y detalle por empleado.

El lote reparte un monto total entre los empleados evaluados en un periodo:

- `promedio_general` y `suma_coeficientes_empleados` se calculan (no vienen
  del formulario) y se persisten para que el detalle y los reportes no
  dependan de recalcular en cada lectura.
- `coeficiente = puntuacion / promedio_general`.
- `monto_individual = (coeficiente × monto) / suma_coeficientes_empleados`.

Los importes y coeficientes se recalculan cuando cambia la puntuación de una
evaluación del periodo.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    ForeignKey,
    Integer,
    UniqueConstraint,
)
from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now()


class RrhhPagoResultado(SQLModel, table=True):
    __tablename__ = "pago_x_resultado"
    __table_args__ = (
        UniqueConstraint(
            "periodo_evaluacion_id",
            name="uq_pago_resultado_periodo",
        ),
        CheckConstraint("fin_periodo >= inicio_periodo", name="chk_pago_resultado_fechas"),
        CheckConstraint("monto > 0", name="chk_pago_resultado_monto"),
        CheckConstraint(
            "promedio_general >= 0", name="chk_pago_resultado_promedio"
        ),
        CheckConstraint(
            "suma_coeficientes_empleados >= 0",
            name="chk_pago_resultado_suma_coeficientes",
        ),
    )

    id_pago_x_resultado: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    periodo_evaluacion_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey(
                "periodo_evaluaciones.id_periodo_evaluacion",
                ondelete="RESTRICT",
                name="fk_pago_resultado_periodo",
            ),
            nullable=False,
        )
    )
    descripcion: Optional[str] = None
    inicio_periodo: date = Field(sa_column=Column(Date, nullable=False))
    fin_periodo: date = Field(sa_column=Column(Date, nullable=False))
    monto: Decimal = Field(decimal_places=2, max_digits=12)
    promedio_general: Decimal = Field(
        default=Decimal("0.0000"), decimal_places=4, max_digits=8
    )
    suma_coeficientes_empleados: Decimal = Field(
        default=Decimal("0.0000"), decimal_places=4, max_digits=14
    )
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )


class RrhhPagoResultadoEmpleado(SQLModel, table=True):
    __tablename__ = "pago_x_resultado_empleado"
    __table_args__ = (
        UniqueConstraint(
            "pago_x_resultado_id",
            "empleado_id",
            name="uq_pago_resultado_empleado",
        ),
        CheckConstraint("puntuacion >= 0", name="chk_pago_resultado_emp_puntuacion"),
        CheckConstraint("coeficiente >= 0", name="chk_pago_resultado_emp_coeficiente"),
        CheckConstraint(
            "monto_individual >= 0", name="chk_pago_resultado_emp_monto"
        ),
    )

    id_pago_x_resultado_empleado: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    pago_x_resultado_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey(
                "pago_x_resultado.id_pago_x_resultado",
                ondelete="CASCADE",
                name="fk_pago_resultado_emp_lote",
            ),
            nullable=False,
        )
    )
    empleado_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey(
                "empleados.id", ondelete="CASCADE", name="fk_pago_resultado_emp_empleado"
            ),
            nullable=False,
        )
    )
    evaluacion_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey(
                "evaluaciones.id",
                ondelete="CASCADE",
                name="fk_pago_resultado_emp_evaluacion",
            ),
            nullable=False,
        )
    )
    puntuacion: Decimal = Field(decimal_places=4, max_digits=8)
    coeficiente: Decimal = Field(decimal_places=4, max_digits=12)
    monto_individual: Decimal = Field(decimal_places=2, max_digits=12)
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
