"""DTOs de objetivos (Fase 8 v2 — objetivos ponderados).

El objetivo se **define** en el empleado con su `periodo_inicio`/
`periodo_fin` (obligatorios: delimitan en qué evaluaciones puede
seleccionarse) y su `peso` fijo (**número natural 1–100**), que dice cuánto
aporta al promedio ponderado de la evaluación que lo incluya.

La puntuación (estrellas 0–5, valoración y recomendaciones) vive en la
relación N:M `evaluaciones_objetivos`, gestionada desde
`dto/rrhh_evaluacion_dto.py`.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import field_validator
from sqlmodel import Field, SQLModel


class RrhhObjetivoRead(SQLModel):
    id_objetivos: int
    empleado_id: int
    nombre: str
    # Periodo obligatorio en el que el objetivo está disponible.
    periodo_inicio: date
    periodo_fin: date
    # Peso fijo (natural 1–100): cuánto aporta al promedio ponderado.
    peso: Decimal
    observaciones: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RrhhObjetivoDetalle(RrhhObjetivoRead):
    """Detalle del objetivo con su empleado (cabecera de la ficha)."""

    empleado_nombre: Optional[str] = None
    empleado_codigo: Optional[str] = None


class RrhhObjetivoCreate(SQLModel):
    empleado_id: int
    nombre: str = Field(min_length=1, max_length=255)
    periodo_inicio: date
    periodo_fin: date
    # El peso nace con el objetivo y se copia a cada evaluación que lo
    # seleccione (allí es editable por fila). Número natural 1–100 (decisión
    # de usuario): el servicio lo guarda como Decimal en `NUMERIC(6,2)`.
    peso: int = Field(default=1, ge=1, le=100)
    observaciones: Optional[str] = None

    @field_validator("periodo_fin")
    @classmethod
    def _fin_posterior(cls, v, info):
        if info.data.get("periodo_inicio") and v < info.data["periodo_inicio"]:
            raise ValueError("El fin no puede ser anterior al inicio")
        return v


class RrhhObjetivoUpdate(SQLModel):
    """Edición parcial de la definición; siempre permitida.

    Cambiar el periodo no arrastra las filas ya seleccionadas en
    evaluaciones (la selección es explícita); sí decide qué objetivos
    aparecen como candidatos en las evaluaciones futuras.
    """

    nombre: Optional[str] = Field(default=None, min_length=1, max_length=255)
    periodo_inicio: Optional[date] = None
    periodo_fin: Optional[date] = None
    # Número natural 1–100 (igual que el alta).
    peso: Optional[int] = Field(default=None, ge=1, le=100)
    observaciones: Optional[str] = None

    @field_validator("periodo_fin")
    @classmethod
    def _fin_posterior(cls, v, info):
        inicio = info.data.get("periodo_inicio")
        if v is not None and inicio is not None and v < inicio:
            raise ValueError("El fin no puede ser anterior al inicio")
        return v


__all__ = [
    "RrhhObjetivoRead",
    "RrhhObjetivoDetalle",
    "RrhhObjetivoCreate",
    "RrhhObjetivoUpdate",
]
