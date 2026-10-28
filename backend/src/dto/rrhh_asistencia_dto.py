"""DTOs del submódulo RRHH — Asistencia (Fase 4).

La tabla `asistencia` tiene un `UNIQUE (empleado_id, fecha)`: un empleado solo
tiene una marcación por día. Por eso el alta y la corrección son la misma
operación (`PUT /asistencia` con empleado y fecha), y no hay alta ciega.

Los campos de cálculo (`tardanza_minutos`, `horas_trabajadas_minutos`,
`horas_extras_minutos`) no se guardan en la BD: se derivan del horario del
empleado y se calculan al leer.
"""

from datetime import date, datetime, time
from typing import Optional

from sqlmodel import SQLModel

from src.domain.rrhh_asistencia_calc import ESTADOS_ASISTENCIA


class RrhhAsistenciaBase(SQLModel):
    empleado_id: int
    fecha: date
    hora_entrada: Optional[time] = None
    hora_salida: Optional[time] = None
    estado: str = "ausente"
    observaciones: Optional[str] = None


class RrhhAsistenciaCreate(RrhhAsistenciaBase):
    """Alta o corrección de una marcación (la BD ya garantiza 1 por día)."""


class RrhhAsistenciaUpdate(SQLModel):
    """Corrección parcial: solo los campos enviados se aplican."""

    hora_entrada: Optional[time] = None
    hora_salida: Optional[time] = None
    estado: Optional[str] = None
    observaciones: Optional[str] = None


class RrhhAsistenciaRead(RrhhAsistenciaBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RrhhAsistenciaListado(RrhhAsistenciaRead):
    """Marcación con los datos del empleado y los cálculos derivados."""

    empleado_codigo: Optional[str] = None
    empleado_nombre: Optional[str] = None
    departamento_nombre: Optional[str] = None
    # Horario pactado del empleado, para poder mostrar el contexto.
    horario_inicio: Optional[time] = None
    horario_final: Optional[time] = None
    # Cálculos derivados (no persistidos).
    tardanza_minutos: int = 0
    horas_trabajadas_minutos: int = 0
    horas_extras_minutos: int = 0


class RrhhAsistenciaMarcacion(SQLModel):
    """Payload de marcación rápida (entrada o salida del día)."""

    empleado_id: int
    # Si no se envía, se usa la fecha de hoy.
    fecha: Optional[date] = None
    # Si no se envía, se usa la hora actual.
    hora: Optional[time] = None
    observaciones: Optional[str] = None


class RrhhAsistenciaResumenDia(SQLModel):
    """Resumen de un día para un departamento o para toda la empresa."""

    fecha: date
    total_empleados: int = 0
    presentes: int = 0
    ausentes: int = 0
    tardanzas: int = 0
    permisos: int = 0
    vacaciones: int = 0
    feriados: int = 0
    incapacidades: int = 0
    total_tardanza_minutos: int = 0
    total_horas_extras_minutos: int = 0


__all__ = [
    "RrhhAsistenciaBase",
    "RrhhAsistenciaCreate",
    "RrhhAsistenciaUpdate",
    "RrhhAsistenciaRead",
    "RrhhAsistenciaListado",
    "RrhhAsistenciaMarcacion",
    "RrhhAsistenciaResumenDia",
    "ESTADOS_ASISTENCIA",
]
