"""DTOs del submódulo RRHH — Evaluaciones (Fase 8 v2 — objetivos ponderados).

Ciclo de vida (decidido):

    borrador ──finalizar──▶ finalizada   (estado final)

Mientras está en `borrador` se edita la cabecera, se seleccionan objetivos
(N:M) y se puntúan sus filas (estrellas 0–5, valoración y recomendaciones).
Al finalizar se recalcula `promedio_objetivos` y todo queda congelado. La
*definición* de objetivos (nombre, periodo, peso) vive en el empleado y es
siempre editable: véase `dto/rrhh_objetivo_dto.py`.

Como el módulo no usa autenticación en backend (decisión; deuda Fase 10), el
`evaluador_id` viene en el payload.

La nota de la evaluación es el **promedio ponderado** de sus filas
puntuadas (Σ estrellas×peso / Σ pesos), 0–5, persistido en
`evaluaciones.promedio_objetivos` y recalculado en las borradores; las
finalizadas quedan congeladas.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import field_validator
from sqlmodel import Field, SQLModel

from src.domain.rrhh_evaluacion_calc import (
    ESTADOS_EVALUACION,
    TIPOS_EVALUACION,
    validar_fechas,
)

# `TIPOS_EVALUACION` se reexporta aquí por compatibilidad: la validación real
# vive ahora en el catálogo `tipos_evaluaciones` (FK desde `evaluaciones`).


# ── Evaluación ──────────────────────────────────────────────────────────────


class RrhhEvaluacionCreate(SQLModel):
    """Alta de una evaluación; nace en `borrador` (sin objetivos aún)."""

    empleado_id: int
    evaluador_id: Optional[int] = None
    periodo: str = Field(min_length=1, max_length=20)
    # FK al catálogo `tipos_evaluaciones` (el servicio exige que exista y esté activo).
    # Default 1 = «Formal», id fijo de la semilla de `add_tipos_evaluaciones`.
    tipo_evaluacion_id: int = Field(default=1)
    inicio_periodo: date
    fin_periodo: date
    comentarios: Optional[str] = None
    # Recomendaciones generales de la evaluación (texto libre).
    recomendaciones: Optional[str] = None
    fecha: Optional[date] = None

    @field_validator("fin_periodo")
    @classmethod
    def _fin_posterior(cls, v, info):
        inicio = info.data.get("inicio_periodo")
        if inicio is not None:
            error = validar_fechas(inicio, v)
            if error:
                raise ValueError(error)
        return v


class RrhhEvaluacionUpdate(SQLModel):
    """Edición parcial; el servicio exige que esté en `borrador`."""

    evaluador_id: Optional[int] = None
    periodo: Optional[str] = Field(default=None, min_length=1, max_length=20)
    tipo_evaluacion_id: Optional[int] = None
    inicio_periodo: Optional[date] = None
    fin_periodo: Optional[date] = None
    comentarios: Optional[str] = None
    recomendaciones: Optional[str] = None
    fecha: Optional[date] = None


class RrhhEvaluacionBase(SQLModel):
    empleado_id: int
    evaluador_id: Optional[int] = None
    periodo: str
    tipo_evaluacion_id: int
    # Nombre resuelto del catálogo `tipos_evaluaciones` (solo lectura).
    tipo_evaluacion: Optional[str] = None
    estado: str
    inicio_periodo: date
    fin_periodo: date
    # Promedio ponderado 0–5 (None sin filas puntuadas).
    promedio_objetivos: Optional[Decimal] = None
    comentarios: Optional[str] = None
    recomendaciones: Optional[str] = None
    fecha: date


class RrhhEvaluacionRead(RrhhEvaluacionBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RrhhEvaluacionListado(RrhhEvaluacionRead):
    """Fila del listado, con el empleado resuelto y los conteos."""

    empleado_codigo: Optional[str] = None
    empleado_nombre: Optional[str] = None
    departamento_nombre: Optional[str] = None
    evaluador_nombre: Optional[str] = None
    # Objetivos del empleado en alcance del periodo y los ya seleccionados.
    cantidad_objetivos: int = 0
    cantidad_seleccionados: int = 0


# ── Objetivos en la evaluación (N:M) ────────────────────────────────────────


class RrhhEvaluacionObjetivoRead(SQLModel):
    """Un objetivo del empleado con su fila de evaluación si está seleccionado.

    El detalle lista los objetivos **en alcance** del periodo de la
    evaluación; si alguno quedó seleccionado y luego su periodo cambió, se
    añade igualmente (todo lo que cuenta en el promedio debe verse).
    """

    # Fila en `evaluaciones_objetivos`; `None` = aún no seleccionado.
    fila_id: Optional[int] = None
    id_objetivo: int
    nombre: str
    periodo_inicio: date
    periodo_fin: date
    # Peso fijo del objetivo (el de partida al seleccionarlo).
    peso_objetivo: Decimal
    seleccionado: bool = False
    # Peso efectivo de la fila (si está seleccionado); si no, el del objetivo.
    peso: Decimal
    # Estrellas 0–5 (None = sin puntuar); solo con `seleccionado`.
    resultado: Optional[int] = None
    valoracion: Optional[str] = None
    recomendaciones: Optional[str] = None


class RrhhEvaluacionObjetivoSeleccion(SQLModel):
    """Selección masiva de objetivos en la evaluación (solo `borrador`).

    Cada objetivo entra con su `peso` copiado; después la evaluación puede
    ajustar el peso por fila al puntuarla.
    """

    objetivo_ids: list[int] = Field(min_length=1)


class RrhhEvaluacionObjetivoCalificar(SQLModel):
    """Puntuación/edición de una fila seleccionada (solo `borrador`).

    Todos los campos son opcionales (edición parcial); `resultado` son las
    estrellas 0–5 del objetivo en esta evaluación.
    """

    # Número natural 1–100 (peso del objetivo: decisión de usuario).
    peso: Optional[int] = Field(default=None, ge=1, le=100)
    resultado: Optional[int] = Field(default=None, ge=0, le=5)
    valoracion: Optional[str] = None
    recomendaciones: Optional[str] = None


class RrhhEvaluacionDetalle(RrhhEvaluacionListado):
    """Detalle completo: objetivos en alcance con su fila (los de cabecera
    vienen del listado, que ya resuelve en lote)."""

    objetivos: list[RrhhEvaluacionObjetivoRead] = Field(default_factory=list)


# ── Reportes ────────────────────────────────────────────────────────────────


class RrhhEvaluacionEmpleadoReporte(SQLModel):
    """Promedio ponderado medio (0–5) de un empleado en el rango consultado."""

    empleado_id: int
    empleado_codigo: Optional[str] = None
    empleado_nombre: Optional[str] = None
    departamento_nombre: Optional[str] = None
    cantidad_evaluaciones: int = 0
    promedio_objetivos: Optional[Decimal] = None


class RrhhEvaluacionReporte(SQLModel):
    """Reporte consolidado de evaluaciones por rango/departamento/empleado."""

    desde: Optional[date] = None
    hasta: Optional[date] = None
    cantidad_evaluaciones: int = 0
    cantidad_borradores: int = 0
    cantidad_finalizadas: int = 0
    promedio_objetivos: Optional[Decimal] = None
    empleados: list[RrhhEvaluacionEmpleadoReporte] = Field(default_factory=list)


__all__ = [
    "RrhhEvaluacionCreate",
    "RrhhEvaluacionUpdate",
    "RrhhEvaluacionBase",
    "RrhhEvaluacionRead",
    "RrhhEvaluacionListado",
    "RrhhEvaluacionObjetivoRead",
    "RrhhEvaluacionObjetivoSeleccion",
    "RrhhEvaluacionObjetivoCalificar",
    "RrhhEvaluacionDetalle",
    "RrhhEvaluacionEmpleadoReporte",
    "RrhhEvaluacionReporte",
    "TIPOS_EVALUACION",
    "ESTADOS_EVALUACION",
]
