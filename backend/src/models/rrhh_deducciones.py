"""Deducciones y bonificaciones por empleado (script v3, sección 5).

Regla de solape (decidida): un registro no puede cruzarse con otro del mismo
tipo y empleado. Desde la Fase 6 v2 no hay tablas puente: la nómina suma los
movimientos del empleado que solapan su periodo y congela el total en
`nomina_empleados`.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Column, ForeignKey, CheckConstraint, Integer
from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now()


class RrhhDeduccion(SQLModel, table=True):
    __tablename__ = "deducciones"
    __table_args__ = (
        CheckConstraint("valor >= 0", name="chk_deducciones_valor"),
        CheckConstraint("fin_periodo >= inicio_periodo", name="chk_deducciones_fechas"),
    )

    id_deducciones: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    empleados_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("empleados.id", ondelete="CASCADE", name="fk_deducciones_empleado"),
            nullable=False,
        )
    )
    tipo_deducciones_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey(
                "tipos_deducciones.id_tipos_deducciones",
                ondelete="RESTRICT",
                name="fk_deducciones_tipo",
            ),
            nullable=False,
        )
    )
    valor: Decimal = Field(decimal_places=2, max_digits=10)
    inicio_periodo: date
    fin_periodo: date
    observaciones: Optional[str] = None
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )


class RrhhBonificacion(SQLModel, table=True):
    __tablename__ = "bonificaciones"
    __table_args__ = (
        CheckConstraint("valor >= 0", name="chk_bonificaciones_valor"),
        CheckConstraint("fin_periodo >= inicio_periodo", name="chk_bonificaciones_fechas"),
    )

    id_bonificaciones: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    empleados_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("empleados.id", ondelete="CASCADE", name="fk_bonificaciones_empleado"),
            nullable=False,
        )
    )
    tipo_bonificaciones_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey(
                "tipos_bonificaciones.id_tipos_bonificaciones",
                ondelete="RESTRICT",
                name="fk_bonificaciones_tipo",
            ),
            nullable=False,
        )
    )
    valor: Decimal = Field(decimal_places=2, max_digits=10)
    inicio_periodo: date
    fin_periodo: date
    observaciones: Optional[str] = None
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
