"""Evaluaciones, objetivos y la relación N:M (rediseño «Evaluaciones v2»).

El modelo v2 de la Fase 8 (decidido con el usuario) elimina `metas` y los
criterios con escala: la evaluación se compone **solo de objetivos
seleccionados y ponderados**:

- `objetivos`: `periodo_inicio`/`periodo_fin` obligatorios (deciden en qué
  evaluaciones entra) y `peso` fijo, **número natural 1–100** (decisión de
  usuario; el DTO acota el rango, el CHECK de BD sigue siendo `> 0`).
- `evaluaciones_objetivos` (N:M): copia editable del `peso`, las estrellas
  del objetivo (`resultado`, 0–5; NULL = sin puntuar) y sus textos
  (`valoracion`, `recomendaciones`).
- `evaluaciones.promedio_objetivos`: **promedio ponderado 0–5**
  (Σ resultado×peso / Σ pesos de las filas puntuadas), persistido en la
  columna homónima; `evaluaciones.recomendaciones` guarda las
  recomendaciones generales de la evaluación.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Column,
    ForeignKey,
    CheckConstraint,
    Integer,
    Numeric,
    UniqueConstraint,
)
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
            "promedio_objetivos IS NULL OR promedio_objetivos BETWEEN 0 AND 5",
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
            ForeignKey(
                "empleados.id", ondelete="CASCADE", name="fk_evaluaciones_empleado"
            ),
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
    # Promedio ponderado 0–5 de las filas de `evaluaciones_objetivos`
    # puntuadas (Σ estrellas×peso / Σ pesos); NULL sin puntuar.
    promedio_objetivos: Optional[Decimal] = Field(
        default=None, decimal_places=2, max_digits=4
    )
    comentarios: Optional[str] = None
    # Recomendaciones generales de la evaluación (texto libre).
    recomendaciones: Optional[str] = None
    fecha: date = Field(default_factory=_today)
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )


class RrhhObjetivo(SQLModel, table=True):
    """Objetivo de un empleado: se **define** aquí con su periodo y su peso
    fijo, y se **selecciona y puntúa** en la evaluación
    (`evaluaciones_objetivos`)."""

    __tablename__ = "objetivos"
    __table_args__ = (CheckConstraint("peso > 0", name="chk_objetivos_peso"),)

    id_objetivos: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    empleado_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey(
                "empleados.id", ondelete="CASCADE", name="fk_objetivos_empleado"
            ),
            nullable=False,
        )
    )
    nombre: str = Field(max_length=255)
    # Rango en el que el objetivo puede seleccionarse: solapa con el periodo
    # de la evaluación. Obligatorio (decidido en el rework).
    periodo_inicio: date
    periodo_fin: date
    # Peso fijo del objetivo (> 0): cuánto aporta al promedio ponderado.
    # Se copia a la fila de evaluación al seleccionarlo.
    peso: Decimal = Field(
        default=Decimal("1"),
        sa_column=Column(Numeric(6, 2), nullable=False, server_default="1"),
    )
    observaciones: Optional[str] = None
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )


class RrhhEvaluacionObjetivo(SQLModel, table=True):
    """Fila del N:M evaluación ↔ objetivo: el peso de esta evaluación y su
    puntuación (estrellas 0–5) con los textos del evaluador."""

    __tablename__ = "evaluaciones_objetivos"
    __table_args__ = (
        CheckConstraint("peso > 0", name="chk_evaluaciones_objetivos_peso"),
        CheckConstraint(
            "resultado IS NULL OR resultado BETWEEN 0 AND 5",
            name="chk_evaluaciones_objetivos_resultado",
        ),
        UniqueConstraint(
            "id_evaluacion", "id_objetivo", name="uq_evaluaciones_objetivo"
        ),
    )

    id_evaluaciones_objetivo: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    id_evaluacion: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey(
                "evaluaciones.id",
                ondelete="CASCADE",
                name="fk_evaluaciones_objetivos_evaluacion",
            ),
            nullable=False,
        )
    )
    id_objetivo: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey(
                "objetivos.id_objetivos",
                ondelete="CASCADE",
                name="fk_evaluaciones_objetivos_objetivo",
            ),
            nullable=False,
        )
    )
    # Copia del `peso` del objetivo en el momento de seleccionarlo; la
    # evaluación puede ajustarlo (es el que entra en la fórmula).
    peso: Decimal = Field(
        default=Decimal("1"),
        sa_column=Column(Numeric(6, 2), nullable=False),
    )
    # Estrellas del objetivo en esta evaluación (0–5; NULL = sin puntuar).
    resultado: Optional[int] = None
    # Texto libre: apreciación cualitativa sobre este objetivo.
    valoracion: Optional[str] = None
    # Texto libre: qué debería hacer el empleado respecto a este objetivo.
    recomendaciones: Optional[str] = None
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
