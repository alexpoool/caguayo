"""Rutas RRHH — Nómina y pagos (Fase 6).

Prefijo `/rrhh/nomina`. Siguen el patrón del proyecto: `APIRouter` con
`get_session` inyectado y servicios en `src/services/`.

El orden de las rutas importa: `/costo`, `/generar` y `/pagos` se declaran
antes de `/{nomina_id}` para que no las capture el parámetro de ruta (si no,
FastAPI devuelve `422` al fallar el conversor `int`).
"""

from datetime import date
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Response
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_session
from src.dto import (
    RrhhNominaGenerar,
    RrhhNominaGenerada,
    RrhhNominaListado,
    RrhhNominaDetalle,
    RrhhPagoBase,
    RrhhPagoListado,
    RrhhReporteCosto,
)
from src.services.rrhh_nomina_service import rrhh_nomina_service
from src.services.rrhh_nomina_pdf import generar_recibo_pdf

rrhh_nomina_router = APIRouter(prefix="/rrhh/nomina", tags=["rrhh-nomina"])


@rrhh_nomina_router.get("", response_model=List[RrhhNominaListado])
async def listar_nominas(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    empleado_id: Optional[int] = None,
    estado: Optional[str] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    db: AsyncSession = Depends(get_session),
):
    """Listado de nóminas, con el empleado resuelto y lo pagado hasta ahora."""
    return await rrhh_nomina_service.listar(
        db,
        skip=skip,
        limit=limit,
        empleado_id=empleado_id,
        estado=estado,
        desde=desde,
        hasta=hasta,
    )


@rrhh_nomina_router.get("/costo", response_model=RrhhReporteCosto)
async def reporte_costo(
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    departamento_id: Optional[int] = None,
    db: AsyncSession = Depends(get_session),
):
    """Costo de la nómina por departamento (excluye las anuladas)."""
    return await rrhh_nomina_service.reporte_costo(
        db, desde=desde, hasta=hasta, departamento_id=departamento_id
    )


@rrhh_nomina_router.post("/generar", response_model=RrhhNominaGenerada, status_code=201)
async def generar_nominas(
    entrada: RrhhNominaGenerar,
    db: AsyncSession = Depends(get_session),
):
    """Genera las nóminas de un periodo, individual o masivamente.

    Cada nómina congela el salario base, las horas extras y el detalle de
    deducciones y bonificaciones vigentes. Los empleados que ya tengan nómina
    para ese periodo se omiten (y no acumulan los conceptos del formulario).
    """
    return await rrhh_nomina_service.generar(db, entrada)


@rrhh_nomina_router.get("/pagos", response_model=List[RrhhPagoListado])
async def listar_pagos(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    nomina_id: Optional[int] = None,
    empleado_id: Optional[int] = None,
    metodo_id: Optional[int] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    db: AsyncSession = Depends(get_session),
):
    """Listado de pagos registrados, con su nómina y su empleado resueltos.

    Filtros: nómina, empleado, método de pago y rango de fecha de pago.
    """
    return await rrhh_nomina_service.listar_pagos(
        db,
        skip=skip,
        limit=limit,
        nomina_id=nomina_id,
        empleado_id=empleado_id,
        metodo_id=metodo_id,
        desde=desde,
        hasta=hasta,
    )


@rrhh_nomina_router.get("/{nomina_id}", response_model=RrhhNominaDetalle)
async def obtener_nomina(
    nomina_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Detalle de una nómina: deducciones y bonificaciones congeladas y pagos."""
    return await rrhh_nomina_service.get(db, nomina_id)


@rrhh_nomina_router.get("/{nomina_id}/recibo")
async def recibo_nomina(
    nomina_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Descarga el recibo de la nómina en PDF."""
    detalle = await rrhh_nomina_service.get(db, nomina_id)
    buffer = generar_recibo_pdf(detalle)
    nombre = f"RECIBO-NOMINA-{nomina_id}.pdf"
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )


@rrhh_nomina_router.post("/{nomina_id}/pagar", response_model=RrhhNominaDetalle)
async def pagar_nomina(
    nomina_id: int,
    pago: RrhhPagoBase,
    db: AsyncSession = Depends(get_session),
):
    """Registra el pago completo de una nómina y la marca como pagada.

    El monto debe coincidir con el salario neto; a partir de ahí la nómina
    queda inmutable.
    """
    return await rrhh_nomina_service.pagar(
        db,
        nomina_id,
        metodo_id=pago.metodo_id,
        monto=Decimal(pago.monto),
        fecha_pago=pago.fecha_pago,
        referencia=pago.referencia,
        observaciones=pago.observaciones,
    )


@rrhh_nomina_router.post("/{nomina_id}/anular")
async def anular_nomina(
    nomina_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Anula una nómina (pendiente o pagada); si estaba pagada, se audita."""
    return await rrhh_nomina_service.anular(db, nomina_id)
