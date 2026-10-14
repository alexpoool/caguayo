"""Rutas RRHH — Objetivos y metas (definidos en el empleado).

Prefijo `/rrhh/objetivos`. Los objetivos cuelgan de `empleados` (no de las
evaluaciones): se **definen** aquí, siempre editables, y se **califican** en
la evaluación (`PUT /rrhh/evaluaciones/{id}/metas/{meta_id}/valoracion`).

**El orden importa**: la ruta literal `/metas/{meta_id}` se declara antes de
`/{objetivo_id}` para que no la capture el parámetro.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_session
from src.dto import (
    RrhhMetaCreate,
    RrhhMetaRead,
    RrhhMetaUpdate,
    RrhhObjetivoCreate,
    RrhhObjetivoDetalle,
    RrhhObjetivoRead,
    RrhhObjetivoUpdate,
)
from src.services.rrhh_objetivo_service import rrhh_objetivo_service

rrhh_objetivos_router = APIRouter(
    prefix="/rrhh/objetivos", tags=["rrhh-objetivos"]
)


# ── Metas (literal, antes de /{objetivo_id}) ────────────────────────────────


@rrhh_objetivos_router.put("/metas/{meta_id}", response_model=RrhhMetaRead)
async def editar_meta(
    meta_id: int,
    payload: RrhhMetaUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Edición de la definición de una meta (nombre, resultado, fechas).

    No incluye la valoración: eso se puntúa en la evaluación.
    """
    return await rrhh_objetivo_service.update_meta(db, meta_id, payload)


@rrhh_objetivos_router.delete("/metas/{meta_id}")
async def eliminar_meta(
    meta_id: int, db: AsyncSession = Depends(get_session)
):
    """Baja de una meta (siempre permitida; recalcula su objetivo)."""
    return await rrhh_objetivo_service.eliminar_meta(db, meta_id)


# ── Objetivos ───────────────────────────────────────────────────────────────


@rrhh_objetivos_router.get("", response_model=List[RrhhObjetivoRead])
async def listar_objetivos(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    empleado_id: Optional[int] = None,
    db: AsyncSession = Depends(get_session),
):
    """Objetivos con sus metas anidadas; filtro por empleado.

    `resultado_objetivo` es la media (1–5) de las valoraciones de las metas
    (se puntuaron en alguna evaluación) y `aporte` su equivalente 0–100.
    """
    return await rrhh_objetivo_service.listar(
        db, empleado_id=empleado_id, skip=skip, limit=limit
    )


@rrhh_objetivos_router.post(
    "", response_model=RrhhObjetivoRead, status_code=201
)
async def crear_objetivo(
    payload: RrhhObjetivoCreate,
    db: AsyncSession = Depends(get_session),
):
    """Alta de un objetivo para un empleado (activo). Las fechas delimitan en
    qué evaluaciones cuenta: sin fechas cuenta siempre."""
    return await rrhh_objetivo_service.crear(db, payload)


@rrhh_objetivos_router.get("/{objetivo_id}", response_model=RrhhObjetivoDetalle)
async def obtener_objetivo(
    objetivo_id: int, db: AsyncSession = Depends(get_session)
):
    """Detalle de un objetivo con sus metas y los datos del empleado
    (cabecera de la pantalla de metas)."""
    return await rrhh_objetivo_service.get(db, objetivo_id)


@rrhh_objetivos_router.put("/{objetivo_id}", response_model=RrhhObjetivoRead)
async def editar_objetivo(
    objetivo_id: int,
    payload: RrhhObjetivoUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Edición de la definición; siempre permitida (cambia las fechas y se
    recalcula el alcance de las borradores del empleado)."""
    return await rrhh_objetivo_service.update(db, objetivo_id, payload)


@rrhh_objetivos_router.delete("/{objetivo_id}")
async def eliminar_objetivo(
    objetivo_id: int, db: AsyncSession = Depends(get_session)
):
    """Baja de un objetivo; sus metas caen por `CASCADE`."""
    return await rrhh_objetivo_service.eliminar(db, objetivo_id)


@rrhh_objetivos_router.post(
    "/{objetivo_id}/metas", response_model=RrhhMetaRead, status_code=201
)
async def crear_meta(
    objetivo_id: int,
    payload: RrhhMetaCreate,
    db: AsyncSession = Depends(get_session),
):
    """Alta de una meta dentro de un objetivo (siempre permitida)."""
    return await rrhh_objetivo_service.crear_meta(db, objetivo_id, payload)
