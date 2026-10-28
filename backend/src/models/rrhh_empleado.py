"""Empleados, departamentos y puestos del módulo RRHH (script v3, secciones 2-3).

Nota sobre la relación circular `empleados` ↔ `departamentos`: el SQL original
crea `empleados` sin las FKs a `puestos`/`departamentos` y las agrega después
con ALTER TABLE. En el modelo la FK de `departamentos.responsable` se declara
con `use_alter=True` para que `create_all` (BDs nuevas) la emita como ALTER al
final, igual que el script original.
"""

from datetime import date, datetime, time
from decimal import Decimal
from typing import Optional

from sqlalchemy import Column, ForeignKey, CheckConstraint, Integer
from sqlmodel import Field, SQLModel


def _today() -> date:
    return date.today()


def _now() -> datetime:
    return datetime.now()


class RrhhDepartamento(SQLModel, table=True):
    __tablename__ = "departamentos"
    __table_args__ = (
        CheckConstraint(
            "responsable IS NULL OR responsable > 0",
            name="chk_departamentos_responsable",
        ),
    )

    id_departamento: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    nombre: str = Field(max_length=100, unique=True)
    descripcion: Optional[str] = None
    # FK a empleados(id) declarada con use_alter para romper el ciclo con la
    # tabla empleados (ver docstring del módulo).
    responsable: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey(
                "empleados.id",
                ondelete="SET NULL",
                use_alter=True,
                name="fk_departamentos_responsable",
            ),
        ),
    )
    activo: bool = Field(default=True)
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )


class RrhhPuesto(SQLModel, table=True):
    __tablename__ = "puestos"
    __table_args__ = (
        CheckConstraint(
            "salario_minimo IS NULL OR salario_minimo >= 0",
            name="chk_puesto_salario_minimo",
        ),
        CheckConstraint(
            "salario_maximo IS NULL OR salario_maximo >= 0",
            name="chk_puesto_salario_maximo",
        ),
        CheckConstraint(
            "salario_minimo IS NULL OR salario_maximo IS NULL OR salario_maximo >= salario_minimo",
            name="chk_puesto_rango_salario",
        ),
    )

    id_puesto: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    nombre: str = Field(max_length=100)
    descripcion: Optional[str] = None
    departamento_id: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey(
                "departamentos.id_departamento",
                ondelete="SET NULL",
                name="fk_puestos_departamento",
            ),
        ),
    )
    salario_minimo: Optional[Decimal] = Field(
        default=None, decimal_places=2, max_digits=10
    )
    salario_maximo: Optional[Decimal] = Field(
        default=None, decimal_places=2, max_digits=10
    )
    activo: bool = Field(default=True)
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )


class RrhhEmpleado(SQLModel, table=True):
    __tablename__ = "empleados"
    __table_args__ = (
        CheckConstraint(
            "fecha_nacimiento IS NULL OR (fecha_nacimiento >= '1900-01-01' AND fecha_nacimiento <= CURRENT_DATE)",
            name="chk_empleados_fecha_nacimiento",
        ),
        CheckConstraint(
            "salario IS NULL OR salario >= 0",
            name="chk_empleados_salario",
        ),
        CheckConstraint(
            "horas_a_trabajar IS NULL OR horas_a_trabajar > 0",
            name="chk_empleados_horas_a_trabajar",
        ),
        CheckConstraint(
            "dias_a_trabajar IS NULL OR dias_a_trabajar > 0",
            name="chk_empleados_dias_a_trabajar",
        ),
        CheckConstraint(
            "horario_inicio IS NULL OR horario_final IS NULL OR horario_final > horario_inicio",
            name="chk_empleados_horario",
        ),
        CheckConstraint(
            "estado IN ('activo','suspendido','vacaciones','terminado')",
            name="chk_empleados_estado",
        ),
        CheckConstraint(
            "tipo_asistencia IN ('LIBRE','NO_LIBRE')",
            name="chk_empleados_tipo_asistencia",
        ),
    )

    id: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    # Código visible y único; se captura manualmente en el alta (no se edita).
    codigo_empleado: Optional[str] = Field(default=None, max_length=20, unique=True)
    nombre: str = Field(max_length=100)
    apellido: str = Field(max_length=100)
    fecha_nacimiento: Optional[date] = None
    carnet_identidad: Optional[str] = Field(default=None, max_length=20, unique=True)
    direccion: Optional[str] = None
    telefono: Optional[str] = Field(default=None, max_length=20)
    correo: Optional[str] = Field(default=None, max_length=100, unique=True)
    puesto_id: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("puestos.id_puesto", ondelete="SET NULL", name="fk_empleados_puesto"),
        ),
    )
    puesto_descripcion: Optional[str] = None
    departamento_id: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey(
                "departamentos.id_departamento", ondelete="SET NULL", name="fk_empleados_departamento"
            ),
        ),
    )
    fecha_contratacion: date = Field(default_factory=_today)
    tipo_contrato_id: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey(
                "tipos_contrato.id_tipo_contrato",
                ondelete="SET NULL",
                name="fk_empleados_tipo_contrato",
            ),
        ),
    )
    salario: Optional[Decimal] = Field(default=None, decimal_places=2, max_digits=10)
    # Auto-referencia a empleados(id); se resuelve con la misma FK diferida que
    # el script original (ALTER TABLE al final).
    supervisor: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey(
                "empleados.id", ondelete="SET NULL", use_alter=True, name="fk_empleados_supervisor"
            ),
        ),
    )
    estado: str = Field(default="activo", max_length=20)
    tipo_asistencia: str = Field(default="NO_LIBRE", max_length=20)
    horas_a_trabajar: Optional[int] = None
    dias_a_trabajar: Optional[int] = None
    horario_inicio: Optional[time] = None
    horario_final: Optional[time] = None
    activo: bool = Field(default=True)
    created_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
    updated_at: datetime = Field(
        default_factory=_now, sa_column_kwargs={"server_default": "CURRENT_TIMESTAMP"}
    )
