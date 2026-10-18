"""Rutas RRHH — Evaluaciones (Fase 8 v2 — objetivos ponderados).

Prefijo `/rrhh/evaluaciones`. Siguen el patrón del proyecto: `APIRouter` con
`get_session` inyectado y servicio en `src/services/`.

**El orden importa**: las rutas con segmentos literales (`/reporte`) se
declaran **antes** de `/{evaluacion_id}` para que no las capture el parámetro
de ruta (FastAPI responde `422` en lugar de pasar a la siguiente ruta cuando
el conversor `int` falla).

Ciclo de vida: `borrador → finalizada`. Seleccionar objetivos, puntuarlos y
editar la cabecera exigen `borrador` (409 en otro caso). Los objetivos se
definen en el empleado (`/rrhh/objetivos`) y aquí se **seleccionan** (N:M con
peso) y se **puntúan** (estrellas 0–5 + valoración y recomendaciones).
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
    RrhhEvaluacionObjetivoCalificar,
    RrhhEvaluacionObjetivoRead,
    RrhhEvaluacionObjetivoSeleccion,
    RrhhEvaluacionDetalle,
    RrhhEvaluacionReporte,
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
    """Listado de evaluaciones con empleado, promedio ponderado y conteos.

    Filtros: empleado, departamento, estado, tipo de evaluación (id del
    catálogo), periodo que toca el rango `desde`/`hasta` y búsqueda por
    nombre, apellido o código. `cantidad_objetivos` cuenta los objetivos del
    empleado **en alcance** del periodo y `cantidad_seleccionados` los ya
    adjuntos a la evaluación.
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


@rrhh_evaluaciones_router.get("/reporte", response_model=RrhhEvaluacionReporte)
async def reporte_evaluaciones(
    empleado_id: Optional[int] = None,
    departamento_id: Optional[int] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    db: AsyncSession = Depends(get_session),
):
    """Reporte consolidado: totales globales y promedio ponderado (0–5)
    por empleado."""
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
    """Alta de una evaluación; nace en `borrador`, sin objetivos todavía, y
    es única por (empleado, periodo, tipo)."""
    return await rrhh_evaluacion_service.crear(db, payload)


# ── Selección y puntuación de objetivos (solo borradores) ───────────────────


@rrhh_evaluaciones_router.post(
    "/{evaluacion_id}/objetivos",
    response_model=RrhhEvaluacionDetalle,
    status_code=201,
)
async def seleccionar_objetivos(
    evaluacion_id: int,
    payload: RrhhEvaluacionObjetivoSeleccion,
    db: AsyncSession = Depends(get_session),
):
    """Selecciona objetivos para la evaluación (solo `borrador`).

    Todos deben pertenecer al empleado evaluado y su periodo debe solapar el
    de la evaluación; entran con su peso copiado. Devuelve el detalle
    completo ya con el promedio recalculado.
    """
    return await rrhh_evaluacion_service.seleccionar_objetivos(
        db, evaluacion_id, payload
    )


@rrhh_evaluaciones_router.put(
    "/{evaluacion_id}/objetivos/{fila_id}",
    response_model=RrhhEvaluacionObjetivoRead,
)
async def puntuar_objetivo(
    evaluacion_id: int,
    fila_id: int,
    payload: RrhhEvaluacionObjetivoCalificar,
    db: AsyncSession = Depends(get_session),
):
    """Puntúa/ajusta una fila seleccionada (solo `borrador`): estrellas 0–5,
    valoración, recomendaciones y peso. Recalcula el promedio ponderado."""
    return await rrhh_evaluacion_service.actualizar_fila(
        db, evaluacion_id, fila_id, payload
    )


@rrhh_evaluaciones_router.delete("/{evaluacion_id}/objetivos/{fila_id}")
async def quitar_objetivo(
    evaluacion_id: int,
    fila_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Quita un objetivo de la selección (solo `borrador`) y recalcula el
    promedio ponderado."""
    return await rrhh_evaluacion_service.eliminar_fila(db, evaluacion_id, fila_id)


# ── Detalle / edición de la evaluación ──────────────────────────────────────


@rrhh_evaluaciones_router.get("/{evaluacion_id}", response_model=RrhhEvaluacionDetalle)
async def obtener_evaluacion(
    evaluacion_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Detalle completo: los objetivos del empleado en alcance del periodo
    (con su fila si están seleccionados) y el promedio ponderado."""
    return await rrhh_evaluacion_service.get(db, evaluacion_id)


@rrhh_evaluaciones_router.put("/{evaluacion_id}", response_model=RrhhEvaluacionListado)
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
    evaluacion_id: int,
    db: AsyncSession = Depends(get_session),
):
    """`borrador → finalizada`: recalcula el promedio y congela."""
    return await rrhh_evaluacion_service.finalizar(db, evaluacion_id)


@rrhh_evaluaciones_router.delete("/{evaluacion_id}")
async def eliminar_evaluacion(
    evaluacion_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Baja de una evaluación; solo en `borrador` (las finalizadas quedan)."""
    return await rrhh_evaluacion_service.eliminar(db, evaluacion_id)
