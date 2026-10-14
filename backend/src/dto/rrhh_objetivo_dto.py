"""DTOs de objetivos y metas (Fase 8, reorganización por empleado).

Los objetivos se **definen** en el empleado (siempre editables) y se
**califican** en la evaluación: la valoración (1–5) de las metas promedia a
`resultado_objetivo`, y el promedio de esos resultados es
`evaluaciones.promedio_objetivos` (0–100).
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import field_validator
from sqlmodel import Field, SQLModel


class RrhhMetaRead(SQLModel):
    id_metas: int
    objetivo_id: int
    nombre: str
    resultado_meta: Optional[int] = None
    # Se puntúa en la evaluación; la definición de la meta no lo incluye.
    valoracion: Optional[int] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    observaciones: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RrhhObjetivoRead(SQLModel):
    id_objetivos: int
    empleado_id: int
    nombre: str
    # Media (1–5) de las valoraciones de sus metas; None sin puntuar.
    resultado_objetivo: Optional[Decimal] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    observaciones: Optional[str] = None
    # Derivados.
    aporte: Optional[Decimal] = None  # resultado_objetivo → 0–100
    total_metas: int = 0
    metas: list[RrhhMetaRead] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RrhhObjetivoDetalle(RrhhObjetivoRead):
    """Detalle del objetivo con su empleado (cabecera de la pantalla de metas)."""

    empleado_nombre: Optional[str] = None
    empleado_codigo: Optional[str] = None


class RrhhObjetivoCreate(SQLModel):
    empleado_id: int
    nombre: str = Field(min_length=1, max_length=255)
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    observaciones: Optional[str] = None

    @field_validator("fecha_fin")
    @classmethod
    def _fin_posterior(cls, v, info):
        if v and info.data.get("fecha_inicio") and v < info.data["fecha_inicio"]:
            raise ValueError("El fin no puede ser anterior al inicio")
        return v


class RrhhObjetivoUpdate(SQLModel):
    """Edición parcial de la definición; siempre permitida."""

    nombre: Optional[str] = Field(default=None, min_length=1, max_length=255)
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    observaciones: Optional[str] = None


class RrhhMetaCreate(SQLModel):
    nombre: str = Field(min_length=1, max_length=255)
    resultado_meta: Optional[int] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    observaciones: Optional[str] = None

    @field_validator("fecha_fin")
    @classmethod
    def _fin_posterior(cls, v, info):
        if v and info.data.get("fecha_inicio") and v < info.data["fecha_inicio"]:
            raise ValueError("El fin no puede ser anterior al inicio")
        return v


class RrhhMetaUpdate(SQLModel):
    """Edición parcial de la definición; siempre permitida (sin valoración:
    eso se califica en la evaluación)."""

    nombre: Optional[str] = Field(default=None, min_length=1, max_length=255)
    resultado_meta: Optional[int] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    observaciones: Optional[str] = None


class RrhhMetaValoracion(SQLModel):
    """Calificación de una meta desde la evaluación (1–5)."""

    valoracion: int = Field(ge=1, le=5)
