"""DTOs del submódulo RRHH — Catálogos base (Fase 1).

Los catálogos (`tipos_contrato`, `tipos_deducciones`, `tipos_bonificaciones`,
`tipos_pago`, `tipos_evaluaciones`, `periodo_evaluaciones` y `calificaciones`)
comparten la misma forma: un nombre único, una descripción opcional y, salvo
`calificaciones`, un flag `activo`. Se modela con una base genérica y una
clase concreta por catálogo, para que cada endpoint tenga su `response_model`
explícito.
"""

from datetime import datetime
from typing import Literal, Optional

from sqlmodel import SQLModel


# ── Base genérica ───────────────────────────────────────────────────────────


class _RrhhCatalogoBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None


class _RrhhCatalogoConActivo(_RrhhCatalogoBase):
    activo: bool = True


class _RrhhCatalogoRead(SQLModel):
    """Solo los metadatos comunes; cada lectura concreta extiende esto."""

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ── Tipo de contrato ────────────────────────────────────────────────────────


class RrhhTipoContratoCreate(_RrhhCatalogoConActivo):
    pass


class RrhhTipoContratoUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None


class RrhhTipoContratoRead(_RrhhCatalogoConActivo, _RrhhCatalogoRead):
    id_tipo_contrato: int


# ── Tipo de deducción ───────────────────────────────────────────────────────


class RrhhTipoDeduccionCreate(_RrhhCatalogoConActivo):
    es_porcentaje: bool = False


class RrhhTipoDeduccionUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    es_porcentaje: Optional[bool] = None
    activo: Optional[bool] = None


class RrhhTipoDeduccionRead(_RrhhCatalogoConActivo, _RrhhCatalogoRead):
    id_tipos_deducciones: int
    es_porcentaje: bool = False


# ── Tipo de bonificación ────────────────────────────────────────────────────


class RrhhTipoBonificacionCreate(_RrhhCatalogoConActivo):
    es_porcentaje: bool = False


class RrhhTipoBonificacionUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    es_porcentaje: Optional[bool] = None
    activo: Optional[bool] = None


class RrhhTipoBonificacionRead(_RrhhCatalogoConActivo, _RrhhCatalogoRead):
    id_tipos_bonificaciones: int
    es_porcentaje: bool = False


# ── Tipo de pago ────────────────────────────────────────────────────────────


class RrhhTipoPagoCreate(_RrhhCatalogoConActivo):
    pass


class RrhhTipoPagoUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None


class RrhhTipoPagoRead(_RrhhCatalogoConActivo, _RrhhCatalogoRead):
    id_tipo_pago: int


# ── Tipo de evaluación ──────────────────────────────────────────────────────


class RrhhTipoEvaluacionCreate(_RrhhCatalogoConActivo):
    pass


class RrhhTipoEvaluacionUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None


class RrhhTipoEvaluacionRead(_RrhhCatalogoConActivo, _RrhhCatalogoRead):
    id_tipos_evaluaciones: int


# ── Periodo ─────────────────────────────────────────────────────────────────


class RrhhPeriodoEvaluacionCreate(_RrhhCatalogoConActivo):
    pass


class RrhhPeriodoEvaluacionUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None


class RrhhPeriodoEvaluacionRead(_RrhhCatalogoConActivo, _RrhhCatalogoRead):
    id_periodo_evaluacion: int
    # Derivado de `pago_x_resultado`; nunca se escribe desde el formulario.
    pagado_x_resultado: bool = False


# ── Calificación ────────────────────────────────────────────────────────────


class RrhhCalificacionCreate(SQLModel):
    """`calificaciones` no tiene columna `activo` (decidido en Fase 0)."""

    nombre: str
    # Escala de puntuación completa: su valor es el último número
    # (5 → escala 1–5, 10 → 1–10, 100 → 1–100). Solo esas tres.
    valor: Literal[5, 10, 100]
    descripcion: Optional[str] = None


class RrhhCalificacionUpdate(SQLModel):
    nombre: Optional[str] = None
    valor: Optional[Literal[5, 10, 100]] = None
    descripcion: Optional[str] = None


class RrhhCalificacionRead(_RrhhCatalogoBase, _RrhhCatalogoRead):
    id_calificaciones: int
    valor: int
