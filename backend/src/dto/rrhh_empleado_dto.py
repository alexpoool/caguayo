"""DTOs del submódulo RRHH — Empleados (Fase 3).

El código (`codigo_empleado`, `EMP-XXXX`) lo genera la BD con la secuencia
`empleado_codigo_seq`, así que no se acepta en el alta. Los campos de
asignación (puesto, departamento, tipo de contrato y supervisor) se validan
en el servicio, no en el DTO.
"""

from datetime import date, datetime, time
from decimal import Decimal
from typing import Optional

from sqlmodel import Field, SQLModel

ESTADOS_EMPLEADO = ("activo", "suspendido", "vacaciones", "terminado")
TIPOS_ASISTENCIA = ("LIBRE", "NO_LIBRE")


class RrhhEmpleadoBase(SQLModel):
    nombre: str = Field(max_length=100)
    apellido: str = Field(max_length=100)
    fecha_nacimiento: Optional[date] = None
    carnet_identidad: Optional[str] = Field(default=None, max_length=20)
    direccion: Optional[str] = None
    telefono: Optional[str] = Field(default=None, max_length=20)
    correo: Optional[str] = Field(default=None, max_length=100)
    puesto_id: Optional[int] = None
    puesto_descripcion: Optional[str] = None
    departamento_id: Optional[int] = None
    fecha_contratacion: Optional[date] = None
    tipo_contrato_id: Optional[int] = None
    salario: Optional[Decimal] = Field(default=None, decimal_places=2, max_digits=10, ge=0)
    supervisor: Optional[int] = None
    estado: str = "activo"
    tipo_asistencia: str = "NO_LIBRE"
    horas_a_trabajar: Optional[int] = None
    dias_a_trabajar: Optional[int] = None
    horario_inicio: Optional[time] = None
    horario_final: Optional[time] = None
    activo: bool = True


class RrhhEmpleadoCreate(RrhhEmpleadoBase):
    """Alta de empleado. `codigo_empleado` lo genera la BD."""

    fecha_contratacion: Optional[date] = None


class RrhhEmpleadoUpdate(SQLModel):
    """Edición parcial: solo los campos enviados se aplican."""

    nombre: Optional[str] = Field(default=None, max_length=100)
    apellido: Optional[str] = Field(default=None, max_length=100)
    fecha_nacimiento: Optional[date] = None
    carnet_identidad: Optional[str] = Field(default=None, max_length=20)
    direccion: Optional[str] = None
    telefono: Optional[str] = Field(default=None, max_length=20)
    correo: Optional[str] = Field(default=None, max_length=100)
    puesto_id: Optional[int] = None
    puesto_descripcion: Optional[str] = None
    departamento_id: Optional[int] = None
    fecha_contratacion: Optional[date] = None
    tipo_contrato_id: Optional[int] = None
    salario: Optional[Decimal] = Field(default=None, decimal_places=2, max_digits=10, ge=0)
    supervisor: Optional[int] = None
    estado: Optional[str] = None
    tipo_asistencia: Optional[str] = None
    horas_a_trabajar: Optional[int] = None
    dias_a_trabajar: Optional[int] = None
    horario_inicio: Optional[time] = None
    horario_final: Optional[time] = None
    activo: Optional[bool] = None


class RrhhEmpleadoRead(RrhhEmpleadoBase):
    id: int
    codigo_empleado: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RrhhEmpleadoListado(RrhhEmpleadoRead):
    """Fila del listado, con los nombres de las asignaciones resueltos en lote."""

    puesto_nombre: Optional[str] = None
    departamento_nombre: Optional[str] = None
    tipo_contrato_nombre: Optional[str] = None
    supervisor_nombre: Optional[str] = None


class RrhhEmpleadoDetalle(RrhhEmpleadoRead):
    """Detalle con asignaciones resueltas y el usuario vinculado por CI."""

    puesto_nombre: Optional[str] = None
    departamento_nombre: Optional[str] = None
    tipo_contrato_nombre: Optional[str] = None
    supervisor_nombre: Optional[str] = None
    usuario_vinculado: Optional[str] = None


class RrhhEmpleadoBusqueda(SQLModel):
    """Resultado abreviado para el selector de empleados (supervisor, etc.)."""

    id: int
    codigo_empleado: Optional[str] = None
    nombre: str
    apellido: str
    estado: str
    activo: bool
