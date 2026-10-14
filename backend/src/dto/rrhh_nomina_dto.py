"""DTOs del submódulo RRHH — Nómina y pagos (Fase 6).

La nómina congela en el momento de la generación el salario base, las horas
extras, y el detalle exacto de deducciones y bonificaciones que se le
aplicaron (en las tablas puente `nomina_deducciones`/`nomina_bonificaciones`,
con el `monto_aplicado` congelado). A partir de ese momento los importes son
inmutables: la única transición posible es pagarlas o anularlas.

El `salario_neto` nunca es negativo: las deducciones se cotan al bruto en la
generación, así que un préstamo demasiado grande no deja al empleado con nómina
en negativo.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import field_validator
from sqlmodel import Field, SQLModel

ESTADOS_NOMINA = ("pendiente", "pagada", "anulada")


class RrhhConceptoGenerar(SQLModel):
    """Un concepto (tipo del catálogo + valor) definido en el formulario.

    Cada concepto se materializa como un movimiento por empleado al generar
    (decidido: se crean/reusan registros reales en `deducciones` /
    `bonificaciones`, que es lo que la tabla puente exige para trazabilidad).
    """

    tipo_id: int = Field(ge=1)
    valor: Decimal = Field(decimal_places=2, max_digits=10, ge=0)


class RrhhNominaGenerar(SQLModel):
    """Entrada de la generación individual o masiva de nóminas."""

    inicio_periodo: date
    fin_periodo: date
    # Sin empleado ni departamento: se genera para todos los activos.
    empleado_id: Optional[int] = None
    departamento_id: Optional[int] = None
    # Fecha que identifica al periodo en la columna `nomina.periodo`.
    periodo: Optional[date] = None
    # Conceptos definidos en el propio formulario de generación; se aplican
    # a todas las nóminas del lote (repetibles: son una lista).
    deducciones: list[RrhhConceptoGenerar] = Field(default_factory=list)
    bonificaciones: list[RrhhConceptoGenerar] = Field(default_factory=list)
    # Los movimientos ya registrados que solapan el periodo se aplican por
    # defecto; con `False` solo aplican los conceptos definidos arriba.
    incluir_movimientos_existentes: bool = True

    @field_validator("fin_periodo")
    @classmethod
    def _fin_posterior(cls, v, info):
        inicio = info.data.get("inicio_periodo")
        if inicio is not None and v < inicio:
            raise ValueError("El fin del periodo debe ser posterior o igual al inicio")
        return v


class RrhhNominaGenerada(SQLModel):
    """Resultado de una generación: qué se creó y qué se omitió."""

    creadas: int = 0
    omitidas: int = 0
    detalle: list[str] = Field(default_factory=list)


class RrhhPagoBase(SQLModel):
    metodo_id: int
    monto: Decimal = Field(decimal_places=2, max_digits=10, gt=0)
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
    """Fila del listado de pagos, con su nómina y su empleado resueltos."""

    id: int
    nomina_id: int
    fecha_pago: date
    monto: Decimal
    metodo_id: int
    metodo_nombre: Optional[str] = None
    referencia: Optional[str] = None
    observaciones: Optional[str] = None
    empleado_id: int
    empleado_codigo: Optional[str] = None
    empleado_nombre: Optional[str] = None
    departamento_nombre: Optional[str] = None
    # Datos de la nómina a la que pertenece el pago.
    periodo: date
    inicio_periodo: date
    fin_periodo: date
    estado_nomina: str
    created_at: Optional[datetime] = None


class RrhhDetalleNomina(SQLModel):
    """Una deducción o bonificación congelada en una nómina."""

    tipo_nombre: Optional[str] = None
    es_porcentaje: bool = False
    valor_original: Optional[Decimal] = None
    monto_aplicado: Decimal


class RrhhNominaBase(SQLModel):
    empleado_id: int
    periodo: date
    inicio_periodo: date
    fin_periodo: date
    salario_base: Decimal
    horas_extras: Decimal
    deducciones: Decimal
    bonificaciones: Decimal
    salario_neto: Optional[Decimal] = None
    estado: str


class RrhhNominaRead(RrhhNominaBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RrhhNominaListado(RrhhNominaBase):
    """Fila del listado, con el empleado resueltoy el estado de sus pagos."""

    id: int
    empleado_codigo: Optional[str] = None
    empleado_nombre: Optional[str] = None
    departamento_nombre: Optional[str] = None
    total_pagado: Decimal = Decimal("0.00")
    cantidad_pagos: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RrhhNominaDetalle(RrhhNominaListado):
    """Detalle completo para la vista de una nómina y su recibo."""

    deducciones_aplicadas: list[RrhhDetalleNomina] = Field(default_factory=list)
    bonificaciones_aplicadas: list[RrhhDetalleNomina] = Field(default_factory=list)
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
    "RrhhConceptoGenerar",
    "RrhhNominaGenerar",
    "RrhhNominaGenerada",
    "RrhhPagoBase",
    "RrhhPagoRead",
    "RrhhPagoListado",
    "RrhhDetalleNomina",
    "RrhhNominaBase",
    "RrhhNominaRead",
    "RrhhNominaListado",
    "RrhhNominaDetalle",
    "RrhhCostoDepartamento",
    "RrhhReporteCosto",
]
