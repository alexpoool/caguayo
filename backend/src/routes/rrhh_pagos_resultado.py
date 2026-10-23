"""Rutas RRHH — Pago por resultado.

Prefijo `/rrhh/pagos-resultado`. El pago se arma sobre un
`periodo_evaluacion`; el preview devuelve los empleados evaluados en ese
periodo y el alta recibe solo los ids que el usuario dejó seleccionados.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Response
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_session
from src.dto import (
    RrhhPagoResultadoCreate,
    RrhhPagoResultadoListado,
    RrhhPagoResultadoPreview,
    RrhhPagoResultadoRead,
)
from src.services.rrhh_pago_resultado_pdf import generar_documento_pdf
from src.services.rrhh_pago_resultado_service import rrhh_pago_resultado_service

rrhh_pagos_resultado_router = APIRouter(
    prefix="/rrhh/pagos-resultado", tags=["rrhh-pagos-resultado"]
)


@rrhh_pagos_resultado_router.get(
    "/preview", response_model=RrhhPagoResultadoPreview
)
async def preview_pago_resultado(
    periodo_evaluacion_id: int = Query(..., gt=0),
    db: AsyncSession = Depends(get_session),
):
    """Empleados con evaluación en el periodo (para el formulario)."""
    return await rrhh_pago_resultado_service.preview(db, periodo_evaluacion_id)


@rrhh_pagos_resultado_router.get(
    "", response_model=List[RrhhPagoResultadoListado]
)
async def listar_pagos_resultado(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    periodo_evaluacion_id: Optional[int] = Query(None, gt=0),
    nomina_id: Optional[int] = Query(None, gt=0),
    db: AsyncSession = Depends(get_session),
):
    return await rrhh_pago_resultado_service.listar(
        db,
        skip=skip,
        limit=limit,
        periodo_evaluacion_id=periodo_evaluacion_id,
        nomina_id=nomina_id,
    )


@rrhh_pagos_resultado_router.post(
    "", response_model=RrhhPagoResultadoRead, status_code=201
)
async def crear_pago_resultado(
    pago: RrhhPagoResultadoCreate, db: AsyncSession = Depends(get_session)
):
    return await rrhh_pago_resultado_service.crear(db, pago)


@rrhh_pagos_resultado_router.get("/{pago_id}/documento")
async def documento_pago_resultado(
    pago_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Descarga el pago por resultado en PDF."""
    detalle = await rrhh_pago_resultado_service.get(db, pago_id)
    buffer = generar_documento_pdf(detalle)
    nombre = f"pago-resultado-{detalle.inicio_periodo.year}-{pago_id}.pdf"
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )


@rrhh_pagos_resultado_router.get("/{pago_id}", response_model=RrhhPagoResultadoRead)
async def obtener_pago_resultado(
    pago_id: int, db: AsyncSession = Depends(get_session)
):
    return await rrhh_pago_resultado_service.get(db, pago_id)


@rrhh_pagos_resultado_router.delete("/{pago_id}")
async def eliminar_pago_resultado(
    pago_id: int, db: AsyncSession = Depends(get_session)
):
    return await rrhh_pago_resultado_service.eliminar(db, pago_id)
