"""Rutas RRHH — Evaluaciones (Fase 8).

Prefijo `/rrhh/evaluaciones`. Siguen el patrón del proyecto: `APIRouter` con
`get_session` inyectado y servicio en `src/services/`.

**El orden importa**: las rutas con segmentos literales (`/reporte`) se
declaran **antes** de `/{evaluacion_id}` para que no las capture el parámetro
de ruta (FastAPI responde `422` en lugar de pasar a la siguiente ruta cuando
el conversor `int` falla).

Ciclo de vida: `borrador → finalizada`. La evaluación (cabecera y criterios)
y la **calificación de metas** exigen `borrador`; el servicio responde `409`
en otro caso. La *definición* de objetivos y metas vive en el empleado
(`/rrhh/objetivos`) y es siempre editable.
"""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_session
from src.domain.rrhh_evaluacion_calc import ESTADOS_EVALUACION
from src.dto import (
    RrhhEvaluacionCreate,
    RrhhEvaluacionUpdate,
    RrhhEvaluacionListado,
    RrhhEvaluacionDetalle,
    RrhhEvaluacionReporte,
    RrhhMetaRead,
    RrhhMetaValoracion,
)
from src.services.rrhh_evaluacion_service import rrhh_evaluacion_service

rrhh_evaluaciones_router = APIRouter(
    prefix="/rrhh/evaluaciones", tags=["rrhh-evaluaciones"]
)

_ESTADOS_DESC = ", ".join(ESTADOS_EVALUACION)


# ── Evaluaciones (rutas literales primero) ──────────────────────────────────


@rrhh_evaluaciones_router.get("", response_model=List[RrhhEvaluacionListado])
async def listar_evaluaciones(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    empleado_id: Optional[int] = None,
    departamento_id: Optional[int] = None,
    estado: Optional[str] = Query(None, description=f"Uno de: {_ESTADOS_DESC}"),
    tipo_evaluacion_id: Optional[int] = Query(
        None, description="Id de un tipo del catálogo `tipos_evaluaciones`"
    ),
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    buscar: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Listado de evaluaciones con empleado, promedios y conteos.

    Filtros: empleado, departamento, estado, tipo de evaluación (id del
    catálogo), periodo que toca el rango `desde`/`hasta` y búsqueda por
    nombre, apellido o código. `cantidad_objetivos`/`cantidad_metas` cuentan
    los objetivos del empleado **en alcance** del periodo (solape de fechas).
    """
    return await rrhh_evaluacion_service.listar(
        db,
        skip=skip,
        limit=limit,
        empleado_id=empleado_id,
        departamento_id=departamento_id,
        estado=estado,
        tipo_evaluacion_id=tipo_evaluacion_id,
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


# ── Calificación de metas (objeto literal antes de /{evaluacion_id}) ────────


@rrhh_evaluaciones_router.put(
    "/{evaluacion_id}/metas/{meta_id}/valoracion",
    response_model=RrhhMetaRead,
)
async def valorar_meta(
    evaluacion_id: int,
    meta_id: int,
    payload: RrhhMetaValoracion,
    db: AsyncSession = Depends(get_session),
):
    """Puntúa una meta (1–5) desde la evaluación mientras esté en `borrador`.

    La meta debe pertenecer a un objetivo en alcance del empleado evaluado.
    Recalcula `resultado_objetivo` y `promedio_objetivos` del empleado.
    """
    return await rrhh_evaluacion_service.valorar_meta(
        db, evaluacion_id, meta_id, payload
    )


# ── Detalle / edición de la evaluación ──────────────────────────────────────


@rrhh_evaluaciones_router.get(
    "/{evaluacion_id}", response_model=RrhhEvaluacionDetalle
)
async def obtener_evaluacion(
    evaluacion_id: int, db: AsyncSession = Depends(get_session),
):
    """Detalle completo: criterios resueltos para el radar y los objetivos
    del empleado en alcance del periodo, con sus metas para calificar."""
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
    evaluacion_id: int, db: AsyncSession = Depends(get_session),
):
    """`borrador → finalizada`: recalcula los promedios y congela."""
    return await rrhh_evaluacion_service.finalizar(db, evaluacion_id)


@rrhh_evaluaciones_router.delete("/{evaluacion_id}")
async def eliminar_evaluacion(
    evaluacion_id: int, db: AsyncSession = Depends(get_session),
):
    """Baja de una evaluación; solo en `borrador` (las finalizadas quedan)."""
    return await rrhh_evaluacion_service.eliminar(db, evaluacion_id)
