"""Rutas RRHH — Deducciones y bonificaciones (Fase 5).

Prefijos `/rrhh/deducciones` y `/rrhh/bonificaciones`. Siguen el patrón del
proyecto: `APIRouter` con `get_session` inyectado y servicios en
`src/services/`.

Las dos entidades son simétricas, así que comparten el servicio parametrizado
`RrhhMovimientoService`. La vista consolidada (totales por empleado de ambas)
vive en `/rrhh/movimientos/consolidado`.
"""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_session
from src.dto import (
    RrhhDeduccionCreate,
    RrhhDeduccionUpdate,
    RrhhDeduccionRead,
    RrhhDeduccionListado,
    RrhhBonificacionCreate,
    RrhhBonificacionUpdate,
    RrhhBonificacionRead,
    RrhhBonificacionListado,
    RrhhConsolidado,
)
from src.services.rrhh_movimiento_service import (
    rrhh_deduccion_service,
    rrhh_bonificacion_service,
)

rrhh_deducciones_router = APIRouter(
    prefix="/rrhh/deducciones", tags=["rrhh-deducciones"]
)
rrhh_bonificaciones_router = APIRouter(
    prefix="/rrhh/bonificaciones", tags=["rrhh-bonificaciones"]
)
rrhh_movimientos_router = APIRouter(prefix="/rrhh/movimientos", tags=["rrhh-movimientos"])


# ───────────────────────────────────────────────────────────────────────────
# Deducciones
# ───────────────────────────────────────────────────────────────────────────


@rrhh_deducciones_router.get("", response_model=List[RrhhDeduccionListado])
async def listar_deducciones(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    empleado_id: Optional[int] = None,
    tipo_id: Optional[int] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    buscar: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Listado de deducciones, con el monto calculado por cada una.

    Los filtros `desde`/`hasta` traen las deducciones cuyo periodo **cubre**
    ese rango (inclusive en los extremos).
    """
    return await rrhh_deduccion_service.listar(
        db,
        skip=skip,
        limit=limit,
        empleado_id=empleado_id,
        tipo_id=tipo_id,
        desde=desde,
        hasta=hasta,
        buscar=buscar,
    )


@rrhh_deducciones_router.get("/{deduccion_id}", response_model=RrhhDeduccionListado)
async def obtener_deduccion(
    deduccion_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Detalle de una deducción con su monto calculado."""
    return await rrhh_deduccion_service.get(db, deduccion_id)


@rrhh_deducciones_router.post("", response_model=RrhhDeduccionRead, status_code=201)
async def crear_deduccion(
    deduccion: RrhhDeduccionCreate,
    db: AsyncSession = Depends(get_session),
):
    """Alta de deducción. El valor puede ser fijo o un porcentaje del salario."""
    return await rrhh_deduccion_service.create(db, deduccion)


@rrhh_deducciones_router.put("/{deduccion_id}", response_model=RrhhDeduccionRead)
async def actualizar_deduccion(
    deduccion_id: int,
    deduccion: RrhhDeduccionUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Actualización parcial de una deducción."""
    return await rrhh_deduccion_service.update(db, deduccion_id, deduccion)


@rrhh_deducciones_router.delete("/{deduccion_id}")
async def eliminar_deduccion(
    deduccion_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Elimina la deducción, salvo que ya se haya aplicado a una nómina."""
    return await rrhh_deduccion_service.eliminar(db, deduccion_id)


# ───────────────────────────────────────────────────────────────────────────
# Bonificaciones
# ───────────────────────────────────────────────────────────────────────────


@rrhh_bonificaciones_router.get("", response_model=List[RrhhBonificacionListado])
async def listar_bonificaciones(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    empleado_id: Optional[int] = None,
    tipo_id: Optional[int] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    buscar: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Listado de bonificaciones, con el monto calculado por cada una."""
    return await rrhh_bonificacion_service.listar(
        db,
        skip=skip,
        limit=limit,
        empleado_id=empleado_id,
        tipo_id=tipo_id,
        desde=desde,
        hasta=hasta,
        buscar=buscar,
    )


@rrhh_bonificaciones_router.get(
    "/{bonificacion_id}", response_model=RrhhBonificacionListado
)
async def obtener_bonificacion(
    bonificacion_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Detalle de una bonificación con su monto calculado."""
    return await rrhh_bonificacion_service.get(db, bonificacion_id)


@rrhh_bonificaciones_router.post(
    "", response_model=RrhhBonificacionRead, status_code=201
)
async def crear_bonificacion(
    bonificacion: RrhhBonificacionCreate,
    db: AsyncSession = Depends(get_session),
):
    """Alta de bonificación. El valor puede ser fijo o un porcentaje del salario."""
    return await rrhh_bonificacion_service.create(db, bonificacion)


@rrhh_bonificaciones_router.put(
    "/{bonificacion_id}", response_model=RrhhBonificacionRead
)
async def actualizar_bonificacion(
    bonificacion_id: int,
    bonificacion: RrhhBonificacionUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Actualización parcial de una bonificación."""
    return await rrhh_bonificacion_service.update(db, bonificacion_id, bonificacion)


@rrhh_bonificaciones_router.delete("/{bonificacion_id}")
async def eliminar_bonificacion(
    bonificacion_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Elimina la bonificación, salvo que ya se haya aplicado a una nómina."""
    return await rrhh_bonificacion_service.eliminar(db, bonificacion_id)


# ───────────────────────────────────────────────────────────────────────────
# Vista consolidada
# ───────────────────────────────────────────────────────────────────────────


@rrhh_movimientos_router.get("/consolidado", response_model=RrhhConsolidado)
async def consolidado_movimientos(
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    db: AsyncSession = Depends(get_session),
):
    """Totales de deducciones y bonificaciones por empleado.

    Es la vista previa de lo que se aplicaría en la nómina del rango pedido.
    Los totales se calculan con el salario actual de cada empleado, así que
    una bonificación porcentual se recalcula si cambia el salario.
    """
    return await rrhh_deduccion_service.consolidado(db, desde, hasta)
