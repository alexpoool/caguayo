"""Rutas RRHH — Evaluaciones, objetivos y metas (Fase 8).

Prefijo `/rrhh/evaluaciones`. Siguen el patrón del proyecto: `APIRouter` con
`get_session` inyectado y servicio en `src/services/`.

**El orden importa**: las rutas con segmentos literales (`/reporte`,
`/objetivos/...`, `/metas/...`) se declaran **antes** de `/{evaluacion_id}`
para que no las capture el parámetro de ruta (FastAPI responde `422` en lugar
de pasar a la siguiente ruta cuando el conversor `int` falla).

Ciclo de vida: `borrador → finalizada`. Todo lo editable (`PUT` de la
evaluación, objetivos, metas) exige `borrador`; el servicio responde `409` en
otro caso.
"""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_session
from src.domain.rrhh_evaluacion_calc import ESTADOS_EVALUACION, TIPOS_EVALUACION
from src.dto import (
    RrhhEvaluacionCreate,
    RrhhEvaluacionUpdate,
    RrhhEvaluacionListado,
    RrhhEvaluacionDetalle,
    RrhhEvaluacionReporte,
    RrhhObjetivoCreate,
    RrhhObjetivoUpdate,
    RrhhObjetivoRead,
    RrhhObjetivoDetalle,
    RrhhMetaCreate,
    RrhhMetaUpdate,
    RrhhMetaRead,
)
from src.services.rrhh_evaluacion_service import rrhh_evaluacion_service

rrhh_evaluaciones_router = APIRouter(
    prefix="/rrhh/evaluaciones", tags=["rrhh-evaluaciones"]
)

_ESTADOS_DESC = ", ".join(ESTADOS_EVALUACION)
_TIPOS_DESC = ", ".join(TIPOS_EVALUACION)


# ── Evaluaciones (rutas literales primero) ──────────────────────────────────


@rrhh_evaluaciones_router.get("", response_model=List[RrhhEvaluacionListado])
async def listar_evaluaciones(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    empleado_id: Optional[int] = None,
    departamento_id: Optional[int] = None,
    estado: Optional[str] = Query(None, description=f"Uno de: {_ESTADOS_DESC}"),
    tipo: Optional[str] = Query(None, description=f"Uno de: {_TIPOS_DESC}"),
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    buscar: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Listado de evaluaciones con empleado, promedios y conteos.

    Filtros: empleado, departamento, estado, tipo, periodo que toca el rango
    `desde`/`hasta` y búsqueda por nombre, apellido o código.
    """
    return await rrhh_evaluacion_service.listar(
        db,
        skip=skip,
        limit=limit,
        empleado_id=empleado_id,
        departamento_id=departamento_id,
        estado=estado,
        tipo=tipo,
        desde=desde,
        hasta=hasta,
        buscar=buscar,
    )


@rrhh_evaluaciones_router.get(
    "/reporte", response_model=RrhhEvaluacionReporte
)
async def reporte_evaluaciones(
    empleado_id: Optional[int] = None,
    departamento_id: Optional[int] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    db: AsyncSession = Depends(get_session),
):
    """Reporte consolidado: totales globales y promedios por empleado.

    Abarca los dos promedios del módulo: criterios (1–5) y objetivos (0–100).
    """
    return await rrhh_evaluacion_service.reporte(
        db,
        empleado_id=empleado_id,
        departamento_id=departamento_id,
        desde=desde,
        hasta=hasta,
    )


@rrhh_evaluaciones_router.post(
    "", response_model=RrhhEvaluacionListado, status_code=201
)
async def crear_evaluacion(
    payload: RrhhEvaluacionCreate,
    db: AsyncSession = Depends(get_session),
):
    """Alta de una evaluación; nace en `borrador` y es única por
    (empleado, periodo, tipo). Los criterios son ids de `calificaciones`."""
    return await rrhh_evaluacion_service.crear(db, payload)


# ── Metas (literales, antes de /{evaluacion_id}) ────────────────────────────


@rrhh_evaluaciones_router.put(
    "/metas/{meta_id}", response_model=RrhhMetaRead
)
async def editar_meta(
    meta_id: int,
    payload: RrhhMetaUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Edición de una meta; solo si su evaluación está en `borrador`."""
    return await rrhh_evaluacion_service.update_meta(db, meta_id, payload)


@rrhh_evaluaciones_router.delete("/metas/{meta_id}")
async def eliminar_meta(
    meta_id: int, db: AsyncSession = Depends(get_session)
):
    """Baja de una meta; solo en `borrador`."""
    return await rrhh_evaluacion_service.eliminar_meta(db, meta_id)


# ── Objetivos (literales, antes de /{evaluacion_id}) ────────────────────────


@rrhh_evaluaciones_router.get(
    "/objetivos/{objetivo_id}", response_model=RrhhObjetivoDetalle
)
async def obtener_objetivo(
    objetivo_id: int, db: AsyncSession = Depends(get_session)
):
    """Detalle de un objetivo con sus metas y el resumen de su evaluación."""
    return await rrhh_evaluacion_service.get_objetivo(db, objetivo_id)


@rrhh_evaluaciones_router.put(
    "/objetivos/{objetivo_id}", response_model=RrhhObjetivoRead
)
async def editar_objetivo(
    objetivo_id: int,
    payload: RrhhObjetivoUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Edición de un objetivo; solo si su evaluación está en `borrador`."""
    return await rrhh_evaluacion_service.update_objetivo(db, objetivo_id, payload)


@rrhh_evaluaciones_router.delete("/objetivos/{objetivo_id}")
async def eliminar_objetivo(
    objetivo_id: int, db: AsyncSession = Depends(get_session)
):
    """Baja de un objetivo; sus metas caen por `CASCADE`."""
    return await rrhh_evaluacion_service.eliminar_objetivo(db, objetivo_id)


@rrhh_evaluaciones_router.post(
    "/objetivos/{objetivo_id}/metas", response_model=RrhhMetaRead, status_code=201
)
async def crear_meta(
    objetivo_id: int,
    payload: RrhhMetaCreate,
    db: AsyncSession = Depends(get_session),
):
    """Alta de una meta dentro de un objetivo; solo en `borrador`."""
    return await rrhh_evaluacion_service.crear_meta(db, objetivo_id, payload)


# ── Objetivos de una evaluación ─────────────────────────────────────────────


@rrhh_evaluaciones_router.post(
    "/{evaluacion_id}/objetivos", response_model=RrhhObjetivoRead, status_code=201
)
async def crear_objetivo(
    evaluacion_id: int,
    payload: RrhhObjetivoCreate,
    db: AsyncSession = Depends(get_session),
):
    """Alta de un objetivo dentro de la evaluación; solo en `borrador`."""
    return await rrhh_evaluacion_service.crear_objetivo(db, evaluacion_id, payload)


@rrhh_evaluaciones_router.get(
    "/{evaluacion_id}/objetivos", response_model=List[RrhhObjetivoRead]
)
async def listar_objetivos(
    evaluacion_id: int, db: AsyncSession = Depends(get_session)
):
    """Objetivos de la evaluación con sus metas anidadas.

    Devuelve lo mismo que el `objetivos` del detalle de la evaluación.
    """
    detalle = await rrhh_evaluacion_service.get(db, evaluacion_id)
    return detalle.objetivos


# ── Detalle / edición de la evaluación ──────────────────────────────────────


@rrhh_evaluaciones_router.get(
    "/{evaluacion_id}", response_model=RrhhEvaluacionDetalle
)
async def obtener_evaluacion(
    evaluacion_id: int, db: AsyncSession = Depends(get_session)
):
    """Detalle completo: criterios resueltos para el radar y objetivos/metas."""
    return await rrhh_evaluacion_service.get(db, evaluacion_id)


@rrhh_evaluaciones_router.put(
    "/{evaluacion_id}", response_model=RrhhEvaluacionListado
)
async def editar_evaluacion(
    evaluacion_id: int,
    payload: RrhhEvaluacionUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Edición parcial; solo mientras la evaluación esté en `borrador`."""
    return await rrhh_evaluacion_service.update(db, evaluacion_id, payload)


@rrhh_evaluaciones_router.post(
    "/{evaluacion_id}/finalizar", response_model=RrhhEvaluacionListado
)
async def finalizar_evaluacion(
    evaluacion_id: int, db: AsyncSession = Depends(get_session)
):
    """`borrador → finalizada`: congela la evaluación y recalcula promedios."""
    return await rrhh_evaluacion_service.finalizar(db, evaluacion_id)


@rrhh_evaluaciones_router.delete("/{evaluacion_id}")
async def eliminar_evaluacion(
    evaluacion_id: int, db: AsyncSession = Depends(get_session)
):
    """Baja de una evaluación; solo en `borrador` (las finalizadas quedan)."""
    return await rrhh_evaluacion_service.eliminar(db, evaluacion_id)
