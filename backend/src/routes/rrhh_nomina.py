"""Rutas RRHH — Nómina y pagos (Fase 6 v2).

Prefijo `/rrhh/nomina`. La nómina es una cabecera de lote con detalle por
empleado en `nomina_empleados`.

El orden de las rutas importa: `/costo`, `/pagos` se declaran antes de
`/{nomina_id}` para que no las capture el parámetro de ruta (si no, FastAPI
devuelve `422` al fallar el conversor `int`).
"""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Response
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_session
from src.dto import (
    RrhhNominaCreate,
    RrhhNominaUpdate,
    RrhhNominaListado,
    RrhhNominaDetalle,
    RrhhNominaCandidato,
    RrhhNominaSeleccion,
    RrhhNominaPagosEntrada,
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
    estado: Optional[str] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    buscar: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Listado de lotes de nómina con sus totales y pagos."""
    return await rrhh_nomina_service.listar(
        db,
        skip=skip,
        limit=limit,
        estado=estado,
        desde=desde,
        hasta=hasta,
        buscar=buscar,
    )


@rrhh_nomina_router.post("", response_model=RrhhNominaDetalle, status_code=201)
async def crear_nomina(
    entrada: RrhhNominaCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crea una nómina en estado `pre_nomina` (cabecera sin empleados)."""
    return await rrhh_nomina_service.create(db, entrada)


@rrhh_nomina_router.get("/costo", response_model=RrhhReporteCosto)
async def reporte_costo(
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    departamento_id: Optional[int] = None,
    db: AsyncSession = Depends(get_session),
):
    """Costo por departamento de las nóminas confirmadas del rango."""
    return await rrhh_nomina_service.reporte_costo(
        db, desde=desde, hasta=hasta, departamento_id=departamento_id
    )


@rrhh_nomina_router.get("/pagos", response_model=List[RrhhPagoListado])
async def listar_pagos(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    nomina_id: Optional[int] = None,
    metodo_id: Optional[int] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    db: AsyncSession = Depends(get_session),
):
    """Pagos por empleado de las nóminas confirmadas."""
    return await rrhh_nomina_service.listar_pagos(
        db,
        skip=skip,
        limit=limit,
        nomina_id=nomina_id,
        metodo_id=metodo_id,
        desde=desde,
        hasta=hasta,
    )


@rrhh_nomina_router.get("/{nomina_id}", response_model=RrhhNominaDetalle)
async def obtener_nomina(
    nomina_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Cabecera de la nómina con el detalle por empleado (importes y pago)."""
    return await rrhh_nomina_service.get(db, nomina_id)


@rrhh_nomina_router.put("/{nomina_id}", response_model=RrhhNominaDetalle)
async def actualizar_nomina(
    nomina_id: int,
    entrada: RrhhNominaUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Edita la cabecera mientras la nómina siga en `pre_nomina`."""
    return await rrhh_nomina_service.update(db, nomina_id, entrada)


@rrhh_nomina_router.delete("/{nomina_id}")
async def eliminar_nomina(
    nomina_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Elimina una nómina en `pre_nomina` (el detalle cae en cascada)."""
    return await rrhh_nomina_service.eliminar(db, nomina_id)


@rrhh_nomina_router.post("/{nomina_id}/confirmar", response_model=RrhhNominaDetalle)
async def confirmar_nomina(
    nomina_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Pasa el lote de `pre_nomina` a `nomina` y lo deja de solo lectura."""
    return await rrhh_nomina_service.confirmar(db, nomina_id)


@rrhh_nomina_router.get(
    "/{nomina_id}/candidatos", response_model=List[RrhhNominaCandidato]
)
async def candidatos_nomina(
    nomina_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Empleados activos con sus importes calculados para esta nómina."""
    return await rrhh_nomina_service.candidatos(db, nomina_id)


@rrhh_nomina_router.put("/{nomina_id}/empleados", response_model=RrhhNominaDetalle)
async def guardar_empleados(
    nomina_id: int,
    entrada: RrhhNominaSeleccion,
    db: AsyncSession = Depends(get_session),
):
    """Fija la selección de empleados y recalcula sus importes."""
    return await rrhh_nomina_service.guardar_empleados(db, nomina_id, entrada)


@rrhh_nomina_router.get("/{nomina_id}/recibo")
async def recibo_nomina(
    nomina_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Descarga la nómina del lote en PDF."""
    detalle = await rrhh_nomina_service.get(db, nomina_id)
    buffer = generar_recibo_pdf(detalle)
    nombre = f"nomina-{detalle.inicio_periodo.year}-{nomina_id}.pdf"
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )


@rrhh_nomina_router.put("/{nomina_id}/pagos", response_model=RrhhNominaDetalle)
async def guardar_pagos_nomina(
    nomina_id: int,
    entrada: RrhhNominaPagosEntrada,
    db: AsyncSession = Depends(get_session),
):
    """Guarda o corrige el pago de cada empleado de una nómina confirmada."""
    return await rrhh_nomina_service.guardar_pagos(db, nomina_id, entrada)
