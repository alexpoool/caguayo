"""Evaluaciones, objetivos y metas (script v3, sección 7).

Ajuste al esquema original (decidido): `evaluaciones.estado` no existía en el
SQL v3 pero la funcionalidad «Editar evaluación mientras esté en borrador» lo
exige. Se añade con valores ('borrador', 'finalizada').
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Column, ForeignKey, CheckConstraint, Integer
from sqlmodel import Field, SQLModel


def _today() -> date:
    return date.today()


def _now() -> datetime:
    return datetime.now()


class RrhhEvaluacion(SQLModel, table=True):
    __tablename__ = "evaluaciones"
    __table_args__ = (
        CheckConstraint("fin_periodo >= inicio_periodo", name="chk_evaluacion_fechas"),
        CheckConstraint(
            "promedio_objetivos IS NULL OR promedio_objetivos BETWEEN 0 AND 100",
            name="chk_evaluacion_promedio_objetivos",
        ),
        CheckConstraint(
            "estado IN ('borrador','finalizada')",
            name="chk_evaluacion_estado",
        ),
    )

    id: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    empleado_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("empleados.id", ondelete="CASCADE", name="fk_evaluaciones_empleado"),
            nullable=False,
        )
    )
    evaluador_id: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey(
                "empleados.id", ondelete="SET NULL", name="fk_evaluaciones_evaluador"
            ),
        ),
    )
    periodo: str = Field(max_length=20)
    # FK al catálogo `tipos_evaluaciones` (antes VARCHAR con CHECK de 4 valores).
    tipo_evaluacion_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey(
                "tipos_evaluaciones.id_tipos_evaluaciones",
                ondelete="RESTRICT",
                name="fk_evaluaciones_tipo",
            ),
            nullable=False,
        )
    )
    estado: str = Field(default="borrador", max_length=20)
    inicio_periodo: date
    fin_periodo: date
    # Criterios FK a calificaciones (1-5). ON DELETE SET NULL.
    puntualidad: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey(
                "calificaciones.id_calificaciones",
                ondelete="SET NULL",
                name="fk_evaluaciones_puntualidad",
            ),
        ),
    )
    productividad: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey(
                "calificaciones.id_calificaciones",
                ondelete="SET NULL",
                name="fk_evaluaciones_productividad",
            ),
        ),
    )
    trabajo_equipo: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey(
                "calificaciones.id_calificaciones",
                ondelete="SET NULL",
                name="fk_evaluaciones_trabajo_equipo",
            ),
        ),
    )
    calidad: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey(
                "calificaciones.id_calificaciones",
                ondelete="SET NULL",
                name="fk_evaluaciones_calidad",
            ),
        ),
    )
    promedio_objetivos: Optional[Decimal] = Field(
        default=None, decimal_places=2, max_digits=5
    )
    comentarios: Optional[str] = None
    fecha: date = Field(default_factory=_today)
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )


class RrhhObjetivo(SQLModel, table=True):
    __tablename__ = "objetivos"
    __table_args__ = (
        CheckConstraint(
            "valoracion IS NULL OR valoracion BETWEEN 1 AND 5",
            name="chk_objetivos_valoracion",
        ),
    )

    id_objetivos: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    evaluacion_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("evaluaciones.id", ondelete="CASCADE", name="fk_objetivos_evaluacion"),
            nullable=False,
        )
    )
    nombre: str = Field(max_length=255)
    resultado_objetivo: Optional[str] = None
    valoracion: Optional[int] = None
    observaciones: Optional[str] = None
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )


class RrhhMeta(SQLModel, table=True):
    __tablename__ = "metas"
    __table_args__ = (
        CheckConstraint(
            "valoracion IS NULL OR valoracion BETWEEN 1 AND 5",
            name="chk_metas_valoracion",
        ),
    )

    id_metas: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    objetivo_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("objetivos.id_objetivos", ondelete="CASCADE", name="fk_metas_objetivo"),
            nullable=False,
        )
    )
    nombre: str = Field(max_length=255)
    resultado_meta: Optional[int] = None
    valoracion: Optional[int] = None
    observaciones: Optional[str] = None
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
