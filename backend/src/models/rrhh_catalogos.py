"""Catálogos base del módulo RRHH.

Equivalen a las tablas 1 del script `rrhh.sql` v3. Los nombres de clase llevan
el prefijo `Rrhh` para no colisionar con `TipoContrato` (ventas) y `Pago`
(ventas) ya existentes en el paquete de modelos.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now()


class RrhhTipoContrato(SQLModel, table=True):
    __tablename__ = "tipos_contrato"

    id_tipo_contrato: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    nombre: str = Field(max_length=50, unique=True)
    descripcion: Optional[str] = None
    activo: bool = Field(default=True)
    created_at: datetime = Field(default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"})
    updated_at: datetime = Field(default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"})


class RrhhTipoDeduccion(SQLModel, table=True):
    __tablename__ = "tipos_deducciones"

    id_tipos_deducciones: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    nombre: str = Field(max_length=100, unique=True)
    descripcion: Optional[str] = None
    es_porcentaje: bool = Field(default=False)
    activo: bool = Field(default=True)
    created_at: datetime = Field(default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"})
    updated_at: datetime = Field(default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"})


class RrhhTipoBonificacion(SQLModel, table=True):
    __tablename__ = "tipos_bonificaciones"

    id_tipos_bonificaciones: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    nombre: str = Field(max_length=100, unique=True)
    descripcion: Optional[str] = None
    es_porcentaje: bool = Field(default=False)
    activo: bool = Field(default=True)
    created_at: datetime = Field(default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"})
    updated_at: datetime = Field(default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"})


class RrhhTipoEvaluacion(SQLModel, table=True):
    """Tipos de evaluación (catálogo nuevo, sembrado por su migración).

    `evaluaciones.tipo_evaluacion_id` es FK con `ON DELETE RESTRICT` a esta
    tabla: los tipos en uso se desactivan en vez de eliminarse.
    """

    __tablename__ = "tipos_evaluaciones"

    id_tipos_evaluaciones: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    nombre: str = Field(max_length=50, unique=True)
    descripcion: Optional[str] = None
    activo: bool = Field(default=True)
    created_at: datetime = Field(default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"})
    updated_at: datetime = Field(default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"})


class RrhhPeriodoEvaluacion(SQLModel, table=True):
    """Periodo de evaluación reutilizable (catálogo).

    Sustituye el texto libre de `evaluaciones.periodo` en el alta: la
    evaluación guarda la FK y conserva el nombre en el texto por
    compatibilidad con listados y filtros históricos.
    """

    __tablename__ = "periodo_evaluaciones"

    id_periodo_evaluacion: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    nombre: str = Field(max_length=100, unique=True)
    descripcion: Optional[str] = None
    activo: bool = Field(default=True)
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )


class RrhhCalificacion(SQLModel, table=True):
    __tablename__ = "calificaciones"

    id_calificaciones: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    nombre: str = Field(max_length=100, unique=True)
    # Escala de puntuación completa: el valor es su último número
    # (5, 10 o 100; CHECK `chk_calificaciones_valor` en BD).
    valor: int = Field(ge=1, le=100)
    descripcion: Optional[str] = None
    created_at: datetime = Field(default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"})
    updated_at: datetime = Field(default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"})


class RrhhTipoPago(SQLModel, table=True):
    __tablename__ = "tipos_pago"

    id_tipo_pago: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    nombre: str = Field(max_length=30, unique=True)
    descripcion: Optional[str] = None
    activo: bool = Field(default=True)
    created_at: datetime = Field(default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"})
    updated_at: datetime = Field(default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"})


# Re-export del tipo decimal usado por el resto del módulo en catálogos.
__all__ = [
    "RrhhTipoContrato",
    "RrhhTipoDeduccion",
    "RrhhTipoBonificacion",
    "RrhhTipoEvaluacion",
    "RrhhPeriodoEvaluacion",
    "RrhhCalificacion",
    "RrhhTipoPago",
    "Decimal",
]
