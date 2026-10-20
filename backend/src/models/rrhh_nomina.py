"""Nómina como cabecera de un lote y detalle por empleado.

Rediseño (Fase 6 v2):

- `nomina` es la **cabecera** del lote: descripción, periodo, rango, moneda,
  tasa y el porcentaje de impuesto con el que se calculó. No guarda importes:
  el detalle vive en `nomina_empleados`.
- `nomina_empleados` relaciona la nómina con cada empleado seleccionado y
  congela sus importes (`salario_base`, `horas_extras`, `bonificaciones`,
  `devengado`, `impuesto`, `deducciones`, `neto_a_cobrar`).
- El estado del lote es `pre_nomina` mientras se edita y `nomina` una vez
  confirmado. Las deducciones y bonificaciones ya no se congelan en tablas
  puente: se suman por empleado dentro del periodo al calcular el lote.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Column, ForeignKey, CheckConstraint, Integer, UniqueConstraint
from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now()


def _today() -> date:
    return date.today()


class RrhhNomina(SQLModel, table=True):
    __tablename__ = "nomina"
    __table_args__ = (
        CheckConstraint("fin_periodo >= inicio_periodo", name="chk_nomina_fechas"),
        CheckConstraint("tasa >= 0", name="chk_nomina_tasa"),
        CheckConstraint(
            "porcentaje_impuesto >= 0 AND porcentaje_impuesto <= 100",
            name="chk_nomina_porcentaje",
        ),
        CheckConstraint(
            "estado IN ('pre_nomina','nomina')", name="chk_nomina_estado"
        ),
    )

    id: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    descripcion: str = Field(max_length=200)
    periodo: date
    inicio_periodo: date
    fin_periodo: date
    moneda_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("moneda.id_moneda", ondelete="RESTRICT", name="fk_nomina_moneda"),
            nullable=False,
        )
    )
    tasa: Decimal = Field(
        default=Decimal("1.0000"), decimal_places=4, max_digits=12
    )
    porcentaje_impuesto: Decimal = Field(
        default=Decimal("0.00"), decimal_places=2, max_digits=5
    )
    estado: str = Field(default="pre_nomina", max_length=20)
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )


class RrhhNominaEmpleado(SQLModel, table=True):
    """Detalle congelado de un empleado dentro de una nómina."""

    __tablename__ = "nomina_empleados"
    __table_args__ = (
        UniqueConstraint(
            "nomina_id", "empleados_id", name="uq_nomina_empleados"
        ),
        CheckConstraint("salario_base >= 0", name="chk_nomina_emp_salario_base"),
        CheckConstraint("horas_extras >= 0", name="chk_nomina_emp_horas_extras"),
        CheckConstraint("deducciones >= 0", name="chk_nomina_emp_deducciones"),
        CheckConstraint("bonificaciones >= 0", name="chk_nomina_emp_bonificaciones"),
        CheckConstraint("devengado >= 0", name="chk_nomina_emp_devengado"),
        CheckConstraint("impuesto >= 0", name="chk_nomina_emp_impuesto"),
        CheckConstraint("neto_a_cobrar >= 0", name="chk_nomina_emp_neto"),
    )

    id_nomina_empleado: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    empleados_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey(
                "empleados.id", ondelete="CASCADE", name="fk_nomina_emp_empleado"
            ),
            nullable=False,
        )
    )
    nomina_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("nomina.id", ondelete="CASCADE", name="fk_nomina_emp_nomina"),
            nullable=False,
        )
    )
    salario_base: Decimal = Field(
        default=Decimal("0.00"), decimal_places=2, max_digits=12
    )
    horas_extras: Decimal = Field(
        default=Decimal("0.00"), decimal_places=2, max_digits=12
    )
    deducciones: Decimal = Field(
        default=Decimal("0.00"), decimal_places=2, max_digits=12
    )
    bonificaciones: Decimal = Field(
        default=Decimal("0.00"), decimal_places=2, max_digits=12
    )
    # Alias del neto: se guarda el mismo valor que `neto_a_cobrar` para
    # conservar las columnas pedidas por el usuario.
    salario_neto: Decimal = Field(
        default=Decimal("0.00"), decimal_places=2, max_digits=12
    )
    devengado: Decimal = Field(
        default=Decimal("0.00"), decimal_places=2, max_digits=12
    )
    impuesto: Decimal = Field(
        default=Decimal("0.00"), decimal_places=2, max_digits=12
    )
    neto_a_cobrar: Decimal = Field(
        default=Decimal("0.00"), decimal_places=2, max_digits=12
    )
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )


class RrhhPago(SQLModel, table=True):
    __tablename__ = "pagos"
    __table_args__ = (
        CheckConstraint("monto > 0", name="chk_pagos_monto"),
    )

    id: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    nomina_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("nomina.id", ondelete="CASCADE", name="fk_pagos_nomina"),
            nullable=False,
        )
    )
    fecha_pago: date = Field(default_factory=_today)
    monto: Decimal = Field(decimal_places=2, max_digits=12)
    metodo_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("tipos_pago.id_tipo_pago", ondelete="RESTRICT", name="fk_pagos_metodo"),
            nullable=False,
        )
    )
    referencia: Optional[str] = Field(default=None, max_length=50)
    observaciones: Optional[str] = None
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
