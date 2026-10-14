"""DTOs del submódulo RRHH — Solicitudes de vacaciones y permisos (Fase 7).

Ciclo de vida (decidido):

    pendiente ──aprobar──▶ aprobada   (estado final)
       ├─────rechazar────▶ rechazada  (estado final)
       └─────cancelar────▶ cancelada  (estado final)

Como el módulo no usa autenticación en backend (decisión; deuda para la Fase
10), las operaciones reciben el `empleado_id` de quien las ejecuta en el
propio payload. Al aprobar/rechazar se guarda ese id en `aprobado_por` (el
decisor) y la fecha; al cancelar se registra la decisión del solicitante o de
RRHH. La identidad real se resolverá con el token cuando llegue la Fase 10.
"""

from datetime import date, datetime
from typing import Optional

from pydantic import field_validator
from sqlmodel import SQLModel

from src.domain.rrhh_solicitud_calc import ESTADOS_SOLICITUD, TIPOS_SOLICITUD


class RrhhSolicitudCreate(SQLModel):
    """Alta de una solicitud de vacaciones o permiso."""

    empleado_id: int
    tipo: str
    fecha_inicio: date
    fecha_fin: date
    motivo: Optional[str] = None

    @field_validator("tipo")
    @classmethod
    def _tipo_valido(cls, v: str) -> str:
        if v not in TIPOS_SOLICITUD:
            raise ValueError(f"Tipo inválido. Debe ser uno de: {', '.join(TIPOS_SOLICITUD)}")
        return v

    @field_validator("fecha_fin")
    @classmethod
    def _fin_posterior(cls, v, info):
        inicio = info.data.get("fecha_inicio")
        if inicio is not None and v < inicio:
            raise ValueError("La fecha de fin debe ser posterior o igual a la de inicio")
        return v


class RrhhSolicitudAccion(SQLModel):
    """Payload de aprobar, rechazar o cancelar.

    `empleado_id` es quien ejecuta la acción: el aprobador (al aprobar o
    rechazar) o el cancelador (al cancelar).
    """

    empleado_id: int
    observaciones: Optional[str] = None


class RrhhSolicitudBase(SQLModel):
    empleado_id: int
    tipo: str
    fecha_inicio: date
    fecha_fin: date
    motivo: Optional[str] = None
    estado: str
    aprobado_por: Optional[int] = None
    fecha_aprobacion: Optional[datetime] = None
    observaciones: Optional[str] = None


class RrhhSolicitudRead(RrhhSolicitudBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RrhhSolicitudListado(RrhhSolicitudRead):
    """Solicitud con el solicitante, el decisor y los días resueltos."""

    empleado_codigo: Optional[str] = None
    empleado_nombre: Optional[str] = None
    departamento_nombre: Optional[str] = None
    aprobador_nombre: Optional[str] = None
    supervisor_id: Optional[int] = None
    supervisor_nombre: Optional[str] = None
    # Días naturales que cubre (calculado, no persistido).
    dias: int = 0


class RrhhSolicitudCalendario(SQLModel):
    """Fila del calendario de equipo (ausencias por rango)."""

    id: int
    empleado_id: int
    empleado_nombre: Optional[str] = None
    departamento_nombre: Optional[str] = None
    tipo: str
    estado: str
    fecha_inicio: date
    fecha_fin: date
    dias: int = 0
    motivo: Optional[str] = None


class RrhhSolicitudResumenEstado(SQLModel):
    """Conteo de solicitudes por estado (para los filtros de la pantalla)."""

    estado: str
    cantidad: int = 0


__all__ = [
    "RrhhSolicitudCreate",
    "RrhhSolicitudAccion",
    "RrhhSolicitudBase",
    "RrhhSolicitudRead",
    "RrhhSolicitudListado",
    "RrhhSolicitudCalendario",
    "RrhhSolicitudResumenEstado",
    "ESTADOS_SOLICITUD",
    "TIPOS_SOLICITUD",
]
