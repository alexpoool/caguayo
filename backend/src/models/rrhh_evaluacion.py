"""Evaluaciones, objetivos y metas (script v3, sección 7).

Ajuste al esquema original (decidido): `evaluaciones.estado` no existía en el
SQL v3 pero la funcionalidad «Editar evaluación mientras esté en borrador» lo
exige. Se añade con valores ('borrador', 'finalizada').
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Column, ForeignKey, CheckConstraint, Integer, Numeric
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
        CheckConstraint(
            "(puntualidad_estrellas IS NULL OR puntualidad_estrellas BETWEEN 0 AND 10)"
            " AND (productividad_estrellas IS NULL OR productividad_estrellas BETWEEN 0 AND 10)"
            " AND (trabajo_equipo_estrellas IS NULL OR trabajo_equipo_estrellas BETWEEN 0 AND 10)"
            " AND (calidad_estrellas IS NULL OR calidad_estrellas BETWEEN 0 AND 10)",
            name="chk_evaluacion_estrellas",
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
    # Criterios: la **escala** elegida (FK a `calificaciones`, cuyo `valor` es
    # el último número: 5, 10 o 100) y la puntuación de cada criterio en
    # estrellas (0–10; None = sin puntuar). ON DELETE SET NULL en la escala.
    escala_criterios_id: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey(
                "calificaciones.id_calificaciones",
                ondelete="SET NULL",
                name="fk_evaluaciones_escala_criterios",
            ),
        ),
    )
    puntualidad_estrellas: Optional[int] = None
    productividad_estrellas: Optional[int] = None
    trabajo_equipo_estrellas: Optional[int] = None
    calidad_estrellas: Optional[int] = None
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
    """Objetivo de un empleado: se **define** aquí (siempre editable) y se
    **califica** en la evaluación (la valoración de sus metas promedia a
    `resultado_objetivo`)."""

    __tablename__ = "objetivos"

    id_objetivos: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    empleado_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("empleados.id", ondelete="CASCADE", name="fk_objetivos_empleado"),
            nullable=False,
        )
    )
    nombre: str = Field(max_length=255)
    # Media (1–5) de las valoraciones de sus metas; None sin metas puntuadas.
    resultado_objetivo: Optional[Decimal] = Field(
        default=None, sa_column=Column(Numeric(3, 2))
    )
    # Rango en el que el objetivo cuenta para las evaluaciones cuyo periodo
    # lo solape; sin fechas cuenta siempre.
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
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
    # 1–5: se puntúa en la evaluación (su promedio por objetivo es el
    # `resultado_objetivo`).
    valoracion: Optional[int] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    observaciones: Optional[str] = None
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
