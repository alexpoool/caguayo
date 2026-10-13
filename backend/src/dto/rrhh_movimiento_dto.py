"""DTOs del submódulo RRHH — Deducciones y bonificaciones (Fase 5).

Las dos entidades son simétricas (mismos campos y reglas, tablas distintas),
así que comparten la base `RrhhMovimientoBase` y solo cambia el nombre del
tipo.

El dinero efectivo no se guarda aquí: `valor` es un importe fijo o un
porcentaje, según el campo `es_porcentaje` del tipo. La conversión a dinero
la hace el dominio (`monto_aplicado`).
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlmodel import Field, SQLModel


class RrhhMovimientoBase(SQLModel):
    empleado_id: int
    valor: Decimal = Field(decimal_places=2, max_digits=10, ge=0)
    inicio_periodo: date
    fin_periodo: date
    observaciones: Optional[str] = None


class RrhhDeduccionBase(RrhhMovimientoBase):
    tipo_deducciones_id: int


class RrhhBonificacionBase(RrhhMovimientoBase):
    tipo_bonificaciones_id: int


class RrhhDeduccionCreate(RrhhDeduccionBase):
    pass


class RrhhBonificacionCreate(RrhhBonificacionBase):
    pass


class RrhhDeduccionUpdate(SQLModel):
    """Edición parcial: solo los campos enviados se aplican."""

    tipo_deducciones_id: Optional[int] = None
    valor: Optional[Decimal] = Field(default=None, decimal_places=2, max_digits=10, ge=0)
    inicio_periodo: Optional[date] = None
    fin_periodo: Optional[date] = None
    observaciones: Optional[str] = None


class RrhhBonificacionUpdate(SQLModel):
    tipo_bonificaciones_id: Optional[int] = None
    valor: Optional[Decimal] = Field(default=None, decimal_places=2, max_digits=10, ge=0)
    inicio_periodo: Optional[date] = None
    fin_periodo: Optional[date] = None
    observaciones: Optional[str] = None


class RrhhDeduccionRead(RrhhDeduccionBase):
    id_deducciones: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RrhhBonificacionRead(RrhhBonificacionBase):
    id_bonificaciones: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RrhhMovimientoListado(SQLModel):
    """Fila del listado, con el empleado/tipo resueltos y el monto calculado.

    `monto` es el dinero efectivo: para tipos fijos es el `valor`, y para
    porcentuales es el porcentaje del salario del empleado.
    """

    empleado_id: int
    valor: Decimal
    inicio_periodo: date
    fin_periodo: date
    observaciones: Optional[str] = None
    empleado_codigo: Optional[str] = None
    empleado_nombre: Optional[str] = None
    departamento_nombre: Optional[str] = None
    tipo_nombre: Optional[str] = None
    es_porcentaje: bool = False
    salario: Optional[Decimal] = None
    monto: Decimal = Decimal("0.00")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RrhhDeduccionListado(RrhhMovimientoListado):
    id_deducciones: int
    tipo_deducciones_id: int


class RrhhBonificacionListado(RrhhMovimientoListado):
    id_bonificaciones: int
    tipo_bonificaciones_id: int


# ── Vista consolidada ──────────────────────────────────────────────────────


class RrhhConsolidadoEmpleado(SQLModel):
    """Totales de los movimientos que cubren el periodo, por empleado."""

    empleado_id: int
    empleado_codigo: Optional[str] = None
    empleado_nombre: str
    departamento_nombre: Optional[str] = None
    salario: Optional[Decimal] = None
    total_deducciones: Decimal = Decimal("0.00")
    total_bonificaciones: Decimal = Decimal("0.00")
    saldo: Decimal = Decimal("0.00")
    cantidad_deducciones: int = 0
    cantidad_bonificaciones: int = 0


class RrhhConsolidado(SQLModel):
    """Resumen de los movimientos que cubren un rango de fechas."""

    desde: Optional[date] = None
    hasta: Optional[date] = None
    total_deducciones: Decimal = Decimal("0.00")
    total_bonificaciones: Decimal = Decimal("0.00")
    saldo: Decimal = Decimal("0.00")
    cantidad_empleados: int = 0
    empleados: list[RrhhConsolidadoEmpleado] = Field(default_factory=list)


__all__ = [
    "RrhhMovimientoBase",
    "RrhhDeduccionBase",
    "RrhhBonificacionBase",
    "RrhhDeduccionCreate",
    "RrhhBonificacionCreate",
    "RrhhDeduccionUpdate",
    "RrhhBonificacionUpdate",
    "RrhhDeduccionRead",
    "RrhhBonificacionRead",
    "RrhhMovimientoListado",
    "RrhhDeduccionListado",
    "RrhhBonificacionListado",
    "RrhhConsolidadoEmpleado",
    "RrhhConsolidado",
]
