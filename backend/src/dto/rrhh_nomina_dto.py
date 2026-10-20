"""DTOs del submódulo RRHH — Nómina y pagos (Fase 6 v2).

La nómina es una **cabecera de lote** (`descripcion`, `periodo`, rango,
moneda, tasa y porcentaje de impuesto) y el detalle por empleado vive en
`nomina_empleados` con los importes congelados al guardar la selección.

Cálculos (decididos):

- `A cobrar` = horas trabajadas del periodo (extras incluidas) × tarifa
  horaria derivada del salario mensual. Se reparte en `salario_base` (horas
  ordinarias) + `horas_extras` (dinero de las extras).
- `bonificaciones` / `deducciones` = suma de los movimientos del empleado que
  solapan el periodo de la nómina.
- `devengado` = A cobrar + bonificaciones.
- `impuesto` = max(0, devengado − salario promedio) × porcentaje / 100.
- `neto_a_cobrar` = devengado − impuesto − deducciones (nunca negativo).
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import field_validator
from sqlmodel import Field, SQLModel

ESTADOS_NOMINA = ("pre_nomina", "nomina")


class RrhhNominaEmpleadoBase(SQLModel):
    """Importes congelados de un empleado dentro de la nómina."""

    empleado_id: int
    salario_base: Decimal = Field(decimal_places=2, max_digits=12, ge=0)
    horas_extras: Decimal = Field(decimal_places=2, max_digits=12, ge=0)
    deducciones: Decimal = Field(decimal_places=2, max_digits=12, ge=0)
    bonificaciones: Decimal = Field(decimal_places=2, max_digits=12, ge=0)
    salario_neto: Decimal = Field(decimal_places=2, max_digits=12, ge=0)
    devengado: Decimal = Field(decimal_places=2, max_digits=12, ge=0)
    impuesto: Decimal = Field(decimal_places=2, max_digits=12, ge=0)
    neto_a_cobrar: Decimal = Field(decimal_places=2, max_digits=12, ge=0)


class RrhhNominaEmpleadoRead(RrhhNominaEmpleadoBase):
    id_nomina_empleado: int
    empleado_codigo: Optional[str] = None
    empleado_nombre: Optional[str] = None
    puesto_nombre: Optional[str] = None
    departamento_id: Optional[int] = None
    departamento_nombre: Optional[str] = None


class RrhhNominaCandidato(RrhhNominaEmpleadoRead):
    """Empleado activo con sus importes calculados para esta nómina.

    `seleccionado` indica si ya forma parte del lote. `id_nomina_empleado`
    es `None` mientras no se haya guardado.
    """

    id_nomina_empleado: Optional[int] = None
    seleccionado: bool = False


class RrhhNominaBase(SQLModel):
    descripcion: str = Field(min_length=1, max_length=200)
    periodo: date
    inicio_periodo: date
    fin_periodo: date
    moneda_id: int = Field(ge=1)
    tasa: Decimal = Field(default=Decimal("1.0000"), decimal_places=4, max_digits=12, ge=0)
    porcentaje_impuesto: Decimal = Field(
        default=Decimal("0.00"), decimal_places=2, max_digits=5, ge=0, le=100
    )

    @field_validator("fin_periodo")
    @classmethod
    def _fin_posterior(cls, v, info):
        inicio = info.data.get("inicio_periodo")
        if inicio is not None and v < inicio:
            raise ValueError("El fin del periodo debe ser posterior o igual al inicio")
        return v


class RrhhNominaCreate(RrhhNominaBase):
    pass


class RrhhNominaUpdate(SQLModel):
    """Edición parcial de la cabecera (solo en `pre_nomina`)."""

    descripcion: Optional[str] = Field(default=None, min_length=1, max_length=200)
    periodo: Optional[date] = None
    inicio_periodo: Optional[date] = None
    fin_periodo: Optional[date] = None
    moneda_id: Optional[int] = Field(default=None, ge=1)
    tasa: Optional[Decimal] = Field(default=None, decimal_places=4, max_digits=12, ge=0)
    porcentaje_impuesto: Optional[Decimal] = Field(
        default=None, decimal_places=2, max_digits=5, ge=0, le=100
    )


class RrhhNominaRead(RrhhNominaBase):
    id: int
    estado: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RrhhNominaListado(RrhhNominaRead):
    """Fila del listado, con totales del lote y de sus pagos."""

    moneda_nombre: Optional[str] = None
    moneda_simbolo: Optional[str] = None
    cantidad_empleados: int = 0
    total_devengado: Decimal = Decimal("0.00")
    total_deducciones: Decimal = Decimal("0.00")
    total_neto: Decimal = Decimal("0.00")
    total_pagado: Decimal = Decimal("0.00")
    cantidad_pagos: int = 0


class RrhhNominaSeleccion(SQLModel):
    """Empleados elegidos para el lote; el servidor recalcula sus importes."""

    empleado_ids: list[int] = Field(default_factory=list)


class RrhhPagoBase(SQLModel):
    metodo_id: int
    monto: Decimal = Field(decimal_places=2, max_digits=12, gt=0)
    fecha_pago: Optional[date] = None
    referencia: Optional[str] = Field(default=None, max_length=50)
    observaciones: Optional[str] = None


class RrhhPagoRead(RrhhPagoBase):
    id: int
    nomina_id: int
    fecha_pago: date
    metodo_nombre: Optional[str] = None
    created_at: Optional[datetime] = None


class RrhhPagoListado(SQLModel):
    """Fila del listado de pagos: el pago cubre la nómina completa."""

    id: int
    nomina_id: int
    nomina_descripcion: Optional[str] = None
    fecha_pago: date
    monto: Decimal
    metodo_id: int
    metodo_nombre: Optional[str] = None
    referencia: Optional[str] = None
    observaciones: Optional[str] = None
    periodo: date
    inicio_periodo: date
    fin_periodo: date
    estado_nomina: str
    created_at: Optional[datetime] = None


class RrhhNominaDetalle(RrhhNominaListado):
    """Cabecera con el detalle por empleado y los pagos registrados."""

    empleados: list[RrhhNominaEmpleadoRead] = Field(default_factory=list)
    pagos: list[RrhhPagoRead] = Field(default_factory=list)


# ── Reporte de costo ────────────────────────────────────────────────────────


class RrhhCostoDepartamento(SQLModel):
    departamento_id: Optional[int] = None
    departamento_nombre: Optional[str] = None
    cantidad_empleados: int = 0
    salario_base: Decimal = Decimal("0.00")
    horas_extras: Decimal = Decimal("0.00")
    deducciones: Decimal = Decimal("0.00")
    bonificaciones: Decimal = Decimal("0.00")
    salario_neto: Decimal = Decimal("0.00")


class RrhhReporteCosto(SQLModel):
    desde: Optional[date] = None
    hasta: Optional[date] = None
    total_salario_base: Decimal = Decimal("0.00")
    total_horas_extras: Decimal = Decimal("0.00")
    total_deducciones: Decimal = Decimal("0.00")
    total_bonificaciones: Decimal = Decimal("0.00")
    total_neto: Decimal = Decimal("0.00")
    cantidad_nominas: int = 0
    departamentos: list[RrhhCostoDepartamento] = Field(default_factory=list)


__all__ = [
    "ESTADOS_NOMINA",
    "RrhhNominaEmpleadoBase",
    "RrhhNominaEmpleadoRead",
    "RrhhNominaCandidato",
    "RrhhNominaBase",
    "RrhhNominaCreate",
    "RrhhNominaUpdate",
    "RrhhNominaRead",
    "RrhhNominaListado",
    "RrhhNominaDetalle",
    "RrhhNominaSeleccion",
    "RrhhPagoBase",
    "RrhhPagoRead",
    "RrhhPagoListado",
    "RrhhCostoDepartamento",
    "RrhhReporteCosto",
]
