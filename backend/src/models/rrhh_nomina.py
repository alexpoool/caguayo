"""Nómina como cabecera de un lote y detalle por empleado.

Rediseño (Fase 6 v2):

- `nomina` es la **cabecera** del lote: descripción, periodo (FK al catálogo
  `periodo_evaluaciones`), rango, moneda, tasa y el porcentaje de impuesto con
  el que se calculó. No guarda importes: el detalle vive en
  `nomina_empleados`.
- `nomina_empleados` relaciona la nómina con cada empleado seleccionado y
  congela sus importes (`salario_base`, `horas_extras`, `bonificaciones`,
  `devengado`, `impuesto`, `deducciones`, `neto_a_cobrar`).
- El estado del lote es `pre_nomina` mientras se edita y `nomina` una vez
  confirmado. Las deducciones y bonificaciones ya no se congelan en tablas
  puente: se suman por empleado dentro del periodo al calcular el lote.
- El pago también es **por empleado**: `nomina_empleados` guarda la fecha,
  el monto, el método (`tipos_pago`) y la referencia. Ya no existe la tabla
  `pagos`.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Column, ForeignKey, CheckConstraint, Integer, UniqueConstraint
from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now()


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
            "estado IN ('pre_nomina','nomina','anulada')", name="chk_nomina_estado"
        ),
    )

    id: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    descripcion: str = Field(max_length=200)
    # Referencia al catálogo compartido de periodos. Nullable para los lotes
    # históricos creados antes de existir la FK.
    periodo_id: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey(
                "periodo_evaluaciones.id_periodo_evaluacion",
                ondelete="RESTRICT",
                name="fk_nomina_periodo",
            ),
            nullable=True,
        ),
    )
    inicio_periodo: date
    fin_periodo: date
    moneda_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("moneda.id_moneda", ondelete="RESTRICT", name="fk_nomina_moneda"),
            nullable=False,
        )
    )
    # Método de pago por defecto del lote; se propone al registrar los pagos.
    metodo_pago_id: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey(
                "tipos_pago.id_tipo_pago",
                ondelete="RESTRICT",
                name="fk_nomina_metodo_pago",
            ),
            nullable=True,
        ),
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
        CheckConstraint(
            "monto IS NULL OR monto > 0", name="chk_nomina_emp_monto"
        ),
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
    # ── Pago del empleado (null mientras esté pendiente) ──────────────────
    fecha_pago: Optional[date] = None
    monto: Optional[Decimal] = Field(
        default=None, decimal_places=2, max_digits=12
    )
    metodo_id: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey(
                "tipos_pago.id_tipo_pago",
                ondelete="RESTRICT",
                name="fk_nomina_emp_metodo",
            ),
            nullable=True,
        ),
    )
    referencia: Optional[str] = Field(default=None, max_length=50)
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
