"""DTOs del submódulo RRHH — Departamentos y Puestos (Fase 2)."""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlmodel import SQLModel


# ── Departamentos ───────────────────────────────────────────────────────────


class RrhhDepartamentoBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None
    responsable: Optional[int] = None  # FK a empleados(id)
    activo: bool = True


class RrhhDepartamentoCreate(RrhhDepartamentoBase):
    pass


class RrhhDepartamentoUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    responsable: Optional[int] = None
    activo: Optional[bool] = None


class RrhhDepartamentoRead(RrhhDepartamentoBase):
    id_departamento: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RrhhDepartamentoListado(RrhhDepartamentoRead):
    """Departamento en el listado, con datos agregados resueltos en lote."""

    responsable_nombre: Optional[str] = None
    total_puestos: int = 0
    total_empleados: int = 0


class RrhhDepartamentoDetalle(RrhhDepartamentoRead):
    """Departamento con el nombre del responsable y sus puestos."""

    responsable_nombre: Optional[str] = None
    puestos: list["RrhhPuestoRead"] = []
    total_empleados: int = 0


# ── Puestos ─────────────────────────────────────────────────────────────────


class RrhhPuestoBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None
    departamento_id: Optional[int] = None
    salario_minimo: Optional[Decimal] = None
    salario_maximo: Optional[Decimal] = None
    activo: bool = True


class RrhhPuestoCreate(RrhhPuestoBase):
    pass


class RrhhPuestoUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    departamento_id: Optional[int] = None
    salario_minimo: Optional[Decimal] = None
    salario_maximo: Optional[Decimal] = None
    activo: Optional[bool] = None


class RrhhPuestoRead(RrhhPuestoBase):
    id_puesto: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RrhhPuestoListado(RrhhPuestoRead):
    """Puesto en el listado, con datos agregados resueltos en lote."""

    departamento_nombre: Optional[str] = None
    total_empleados: int = 0


class RrhhPuestoDetalle(RrhhPuestoRead):
    """Puesto con el nombre de su departamento y sus empleados."""

    departamento_nombre: Optional[str] = None
    total_empleados: int = 0


# Resuelve forward refs para RrhhDepartamentoDetalle.puestos
RrhhDepartamentoDetalle.model_rebuild()
