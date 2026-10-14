"""DTOs del submódulo RRHH — Evaluaciones, objetivos y metas (Fase 8).

Ciclo de vida (decidido):

    borrador ──finalizar──▶ finalizada   (estado final)

Solo se **edita** mientras está en `borrador` (regla de la funcionalidad
«Editar evaluación mientras esté en borrador»): los criterios, comentarios y
los objetivos/metas son modificables solo ahí. Al finalizar se congela y se
recalcula `promedio_objetivos`.

Como el módulo no usa autenticación en backend (decisión; deuda Fase 10), el
`evaluador_id` viene en el payload.

Dos promedios con escalas distintas:
- `promedio_criterios` (1–5) se **calcula al leer** y no está en la BD.
- `promedio_objetivos` (0–100) **sí está persistido** y se recalcula en cada
  cambio de objetivo/meta.
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


# ── Objetivos y metas ───────────────────────────────────────────────────────


class RrhhObjetivoCreate(SQLModel):
    """Alta de un objetivo dentro de una evaluación (solo en borrador)."""

    nombre: str = Field(min_length=1, max_length=255)
    resultado_objetivo: Optional[str] = None
    # 1–5; si no se envía, el objetivo queda sin puntuar y no entra al promedio.
    valoracion: Optional[int] = Field(default=None, ge=1, le=5)
    observaciones: Optional[str] = None


class RrhhObjetivoUpdate(SQLModel):
    """Edición parcial de un objetivo (solo en borrador)."""

    nombre: Optional[str] = Field(default=None, min_length=1, max_length=255)
    resultado_objetivo: Optional[str] = None
    valoracion: Optional[int] = Field(default=None, ge=1, le=5)
    observaciones: Optional[str] = None


class RrhhMetaCreate(SQLModel):
    """Alta de una meta dentro de un objetivo (solo en borrador)."""

    nombre: str = Field(min_length=1, max_length=255)
    resultado_meta: Optional[int] = None
    valoracion: Optional[int] = Field(default=None, ge=1, le=5)
    observaciones: Optional[str] = None


class RrhhMetaUpdate(SQLModel):
    """Edición parcial de una meta (solo en borrador)."""

    nombre: Optional[str] = Field(default=None, min_length=1, max_length=255)
    resultado_meta: Optional[int] = None
    valoracion: Optional[int] = Field(default=None, ge=1, le=5)
    observaciones: Optional[str] = None


class RrhhMetaRead(SQLModel):
    id_metas: int
    objetivo_id: int
    nombre: str
    resultado_meta: Optional[int] = None
    valoracion: Optional[int] = None
    observaciones: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RrhhObjetivoRead(SQLModel):
    id_objetivos: int
    evaluacion_id: int
    nombre: str
    resultado_objetivo: Optional[str] = None
    valoracion: Optional[int] = None
    observaciones: Optional[str] = None
    # Aporte al promedio global (0–100) de este objetivo suelto.
    aporte: Optional[Decimal] = None
    metas: list[RrhhMetaRead] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RrhhObjetivoDetalle(RrhhObjetivoRead):
    """Detalle de un objetivo para su página de metas.

    Reutiliza la fila del objetivo (con sus metas anidadas) y añade el
    resumen de su evaluación: cabecera, estado (para habilitar el CRUD) y
    el enlace de vuelta.
    """

    evaluacion_estado: str = "borrador"
    periodo: Optional[str] = None
    tipo_evaluacion: Optional[str] = None
    empleado_nombre: Optional[str] = None
    promedio_objetivos: Optional[Decimal] = None


# ── Evaluación ──────────────────────────────────────────────────────────────


class RrhhEvaluacionCreate(SQLModel):
    """Alta de una evaluación; nace en `borrador`."""

    empleado_id: int
    evaluador_id: Optional[int] = None
    periodo: str = Field(min_length=1, max_length=20)
    # FK al catálogo `tipos_evaluaciones` (el servicio exige que exista y esté activo).
    # Default 1 = «Formal», id fijo de la semilla de `add_tipos_evaluaciones`.
    tipo_evaluacion_id: int = Field(default=1)
    inicio_periodo: date
    fin_periodo: date
    # Criterios: ids de `calificaciones` (1–5 resueltos en el servicio).
    puntualidad: Optional[int] = None
    productividad: Optional[int] = None
    trabajo_equipo: Optional[int] = None
    calidad: Optional[int] = None
    comentarios: Optional[str] = None
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
    puntualidad: Optional[int] = None
    productividad: Optional[int] = None
    trabajo_equipo: Optional[int] = None
    calidad: Optional[int] = None
    comentarios: Optional[str] = None
    fecha: Optional[date] = None


class RrhhCriterioEvaluacion(SQLModel):
    """Un criterio con su calificación resuelta, para el radar y las tablas."""

    criterio: str
    etiqueta: str
    # `calificaciones.valor` (1–5) o 0 si todavía no está puntuado.
    valor: int = 0
    calificacion_nombre: Optional[str] = None


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
    puntualidad: Optional[int] = None
    productividad: Optional[int] = None
    trabajo_equipo: Optional[int] = None
    calidad: Optional[int] = None
    promedio_objetivos: Optional[Decimal] = None
    comentarios: Optional[str] = None
    fecha: date


class RrhhEvaluacionRead(RrhhEvaluacionBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RrhhEvaluacionListado(RrhhEvaluacionRead):
    """Fila del listado, con el empleado resuelto y los promedios."""

    empleado_codigo: Optional[str] = None
    empleado_nombre: Optional[str] = None
    departamento_nombre: Optional[str] = None
    evaluador_nombre: Optional[str] = None
    # Los 4 criterios resueltos (valor 0 = sin puntuar): alimentan el radar
    # de la columna «Desempeño» del listado y el del detalle.
    criterios: list[RrhhCriterioEvaluacion] = Field(default_factory=list)
    # Calculados al leer (no persistidos).
    promedio_criterios: Optional[Decimal] = None
    cantidad_objetivos: int = 0
    cantidad_metas: int = 0


class RrhhEvaluacionDetalle(RrhhEvaluacionListado):
    """Detalle completo: objetivos y metas anidados (los criterios vienen del
    listado, que ya los resuelve en lote)."""

    objetivos: list[RrhhObjetivoRead] = Field(default_factory=list)
    # Valoración media de objetivos+metas en 1–5 (el persistido va en 0–100).
    promedio_valoracion_1a5: Optional[Decimal] = None


# ── Reportes ────────────────────────────────────────────────────────────────


class RrhhEvaluacionEmpleadoReporte(SQLModel):
    """Promedios de un empleado en el rango consultado."""

    empleado_id: int
    empleado_codigo: Optional[str] = None
    empleado_nombre: Optional[str] = None
    departamento_nombre: Optional[str] = None
    cantidad_evaluaciones: int = 0
    promedio_criterios: Optional[Decimal] = None
    promedio_objetivos: Optional[Decimal] = None


class RrhhEvaluacionReporte(SQLModel):
    """Reporte consolidado de evaluaciones por rango/departamento/empleado."""

    desde: Optional[date] = None
    hasta: Optional[date] = None
    cantidad_evaluaciones: int = 0
    cantidad_borradores: int = 0
    cantidad_finalizadas: int = 0
    promedio_criterios: Optional[Decimal] = None
    promedio_objetivos: Optional[Decimal] = None
    empleados: list[RrhhEvaluacionEmpleadoReporte] = Field(default_factory=list)


__all__ = [
    "RrhhObjetivoCreate",
    "RrhhObjetivoUpdate",
    "RrhhMetaCreate",
    "RrhhMetaUpdate",
    "RrhhMetaRead",
    "RrhhObjetivoRead",
    "RrhhObjetivoDetalle",
    "RrhhEvaluacionCreate",
    "RrhhEvaluacionUpdate",
    "RrhhCriterioEvaluacion",
    "RrhhEvaluacionBase",
    "RrhhEvaluacionRead",
    "RrhhEvaluacionListado",
    "RrhhEvaluacionDetalle",
    "RrhhEvaluacionEmpleadoReporte",
    "RrhhEvaluacionReporte",
    "TIPOS_EVALUACION",
    "ESTADOS_EVALUACION",
]
