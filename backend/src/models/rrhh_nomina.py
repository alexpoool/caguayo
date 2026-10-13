"""Nómina, detalle aplicado y pagos (script v3, secciones 9 y tablas puente).

Ajuste decidido: `nomina` guarda los totales como agregados de conveniencia,
pero el detalle de qué deducciones/bonificaciones componen cada nómina se
persiste en `nomina_deducciones`/`nomina_bonificaciones` (con `monto_aplicado`)
para garantizar trazabilidad y evitar doble cobro.

Inmutabilidad: una nómina en estado 'pagada' solo puede anularse (con auditoría
en la tabla `log`); el servicio lo hace explícito, y el CHECK
`chk_neto_coherente` protege la coherencia del total en BD.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Column, ForeignKey, CheckConstraint, Integer
from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now()


def _today() -> date:
    return date.today()


class RrhhNomina(SQLModel, table=True):
    __tablename__ = "nomina"
    __table_args__ = (
        CheckConstraint("salario_base >= 0", name="chk_nomina_salario_base"),
        CheckConstraint("horas_extras >= 0", name="chk_nomina_horas_extras"),
        CheckConstraint("deducciones >= 0", name="chk_nomina_deducciones"),
        CheckConstraint("bonificaciones >= 0", name="chk_nomina_bonificaciones"),
        CheckConstraint(
            "salario_neto IS NULL OR salario_neto >= 0", name="chk_nomina_neto"
        ),
        CheckConstraint("fin_periodo >= inicio_periodo", name="chk_nomina_fechas"),
        CheckConstraint(
            "estado IN ('pendiente','pagada','anulada')", name="chk_nomina_estado"
        ),
        CheckConstraint(
            "salario_neto IS NULL OR salario_neto <= (salario_base + horas_extras + bonificaciones - deducciones)",
            name="chk_nomina_neto_coherente",
        ),
    )

    id: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    empleado_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("empleados.id", ondelete="CASCADE", name="fk_nomina_empleado"),
            nullable=False,
        )
    )
    periodo: date
    inicio_periodo: date
    fin_periodo: date
    salario_base: Decimal = Field(decimal_places=2, max_digits=10)
    horas_extras: Decimal = Field(default=Decimal("0.00"), decimal_places=2, max_digits=10)
    deducciones: Decimal = Field(default=Decimal("0.00"), decimal_places=2, max_digits=10)
    bonificaciones: Decimal = Field(default=Decimal("0.00"), decimal_places=2, max_digits=10)
    salario_neto: Optional[Decimal] = Field(default=None, decimal_places=2, max_digits=10)
    estado: str = Field(default="pendiente", max_length=20)
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )


class RrhhNominaDeduccion(SQLModel, table=True):
    """Detalle de deducciones aplicadas a una nómina (trazabilidad)."""

    __tablename__ = "nomina_deducciones"
    __table_args__ = (
        CheckConstraint("monto_aplicado >= 0", name="chk_nomina_ded_monto"),
    )

    id: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    nomina_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("nomina.id", ondelete="CASCADE", name="fk_nomina_ded_nomina"),
            nullable=False,
        )
    )
    deduccion_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey(
                "deducciones.id_deducciones",
                ondelete="RESTRICT",
                name="fk_nomina_ded_deduccion",
            ),
            nullable=False,
        )
    )
    monto_aplicado: Decimal = Field(decimal_places=2, max_digits=10)
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )


class RrhhNominaBonificacion(SQLModel, table=True):
    """Detalle de bonificaciones aplicadas a una nómina (trazabilidad)."""

    __tablename__ = "nomina_bonificaciones"
    __table_args__ = (
        CheckConstraint("monto_aplicado >= 0", name="chk_nomina_bon_monto"),
    )

    id: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    nomina_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("nomina.id", ondelete="CASCADE", name="fk_nomina_bon_nomina"),
            nullable=False,
        )
    )
    bonificacion_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey(
                "bonificaciones.id_bonificaciones",
                ondelete="RESTRICT",
                name="fk_nomina_bon_bonificacion",
            ),
            nullable=False,
        )
    )
    monto_aplicado: Decimal = Field(decimal_places=2, max_digits=10)
    created_at: datetime = Field(
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
    monto: Decimal = Field(decimal_places=2, max_digits=10)
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
