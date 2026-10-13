"""DTOs del submódulo RRHH — Catálogos base (Fase 1).

Los cinco catálogos (`tipos_contrato`, `tipos_deducciones`,
`tipos_bonificaciones`, `tipos_pago`, `calificaciones`) comparten la misma
forma: un nombre único, una descripción opcional y, salvo `calificaciones`,
un flag `activo`. Se modela con una base genérica y una clase concreta por
catálogo, para que cada endpoint tenga su `response_model` explícito.
"""

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


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


# ── Calificación ────────────────────────────────────────────────────────────


class RrhhCalificacionCreate(SQLModel):
    """`calificaciones` no tiene columna `activo` (decidido en Fase 0)."""

    nombre: str
    valor: int = Field(ge=1, le=5)
    descripcion: Optional[str] = None


class RrhhCalificacionUpdate(SQLModel):
    nombre: Optional[str] = None
    valor: Optional[int] = Field(default=None, ge=1, le=5)
    descripcion: Optional[str] = None


class RrhhCalificacionRead(_RrhhCatalogoBase, _RrhhCatalogoRead):
    id_calificaciones: int
    valor: int
