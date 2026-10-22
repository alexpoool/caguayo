"""DTOs del submódulo RRHH — Pago por resultado.

Un pago por resultado pertenece a una nómina confirmada y se arma sobre un
periodo de evaluación. El usuario elige la nómina y el periodo (que se
preselecciona desde la nómina), revisa a los empleados con evaluación en ese
periodo, descarta los que no correspondan y guarda el lote con el monto a
repartir.

Los campos calculados (`promedio_general`, `suma_coeficientes_empleados`,
`coeficiente` y `monto_individual`) nunca se aceptan desde el formulario.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import Field
from sqlmodel import SQLModel


class RrhhPagoResultadoCreate(SQLModel):
    # Nómina confirmada de origen. Una nómina solo puede pagarse una vez.
    nomina_id: int = Field(ge=1)
    periodo_evaluacion_id: int
    descripcion: Optional[str] = None
    inicio_periodo: date
    fin_periodo: date
    monto: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    # Empleados que el usuario dejó seleccionados en el formulario. Debe
    # incluir al menos uno con evaluación en el periodo.
    empleado_ids: List[int]


class RrhhPagoResultadoEmpleadoRead(SQLModel):
    id_pago_x_resultado_empleado: int
    empleado_id: int
    evaluacion_id: int
    empleado_codigo: Optional[str] = None
    empleado_nombre: Optional[str] = None
    departamento_nombre: Optional[str] = None
    puntuacion: Decimal
    coeficiente: Decimal
    monto_individual: Decimal


class RrhhPagoResultadoRead(SQLModel):
    id_pago_x_resultado: int
    nomina_id: Optional[int] = None
    nomina_descripcion: Optional[str] = None
    periodo_evaluacion_id: int
    periodo_nombre: Optional[str] = None
    descripcion: Optional[str] = None
    inicio_periodo: date
    fin_periodo: date
    monto: Decimal
    promedio_general: Decimal
    suma_coeficientes_empleados: Decimal
    empleados: List[RrhhPagoResultadoEmpleadoRead]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RrhhPagoResultadoListado(SQLModel):
    id_pago_x_resultado: int
    nomina_id: Optional[int] = None
    nomina_descripcion: Optional[str] = None
    periodo_evaluacion_id: int
    periodo_nombre: Optional[str] = None
    descripcion: Optional[str] = None
    inicio_periodo: date
    fin_periodo: date
    monto: Decimal
    promedio_general: Decimal
    suma_coeficientes_empleados: Decimal
    empleados_count: int = 0
    total_pagado: Decimal = Decimal("0.00")
    created_at: Optional[datetime] = None


class RrhhPagoResultadoCandidato(SQLModel):
    empleado_id: int
    evaluacion_id: int
    empleado_codigo: Optional[str] = None
    empleado_nombre: Optional[str] = None
    departamento_nombre: Optional[str] = None
    puntuacion: Decimal
    puntuada: bool = True


class RrhhPagoResultadoPreview(SQLModel):
    periodo_evaluacion_id: int
    periodo_nombre: Optional[str] = None
    inicio_periodo: Optional[date] = None
    fin_periodo: Optional[date] = None
    pagado_x_resultado: bool = False
    empleados: List[RrhhPagoResultadoCandidato]
