"""Rutas RRHH — Objetivos (definidos en el empleado).

Prefijo `/rrhh/objetivos`. Los objetivos cuelgan de `empleados` (no de las
evaluaciones): se **definen** aquí, siempre editables, con su periodo
(obligatorio) y su peso fijo; se **seleccionan y puntúan** en la evaluación
(`POST/PUT/DELETE /rrhh/evaluaciones/{id}/objetivos…`).
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from src.utils.auth import verify_auth
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_session
from src.dto import (
    RrhhObjetivoCreate,
    RrhhObjetivoDetalle,
    RrhhObjetivoRead,
    RrhhObjetivoUpdate,
)
from src.services.rrhh_objetivo_service import rrhh_objetivo_service

rrhh_objetivos_router = APIRouter(prefix="/rrhh/objetivos", tags=["rrhh-objetivos"], dependencies=[Depends(verify_auth)])


@rrhh_objetivos_router.get("", response_model=List[RrhhObjetivoRead])
async def listar_objetivos(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    empleado_id: Optional[int] = None,
    db: AsyncSession = Depends(get_session),
):
    """Objetivos con su periodo y peso; filtro por empleado."""
    return await rrhh_objetivo_service.listar(
        db, empleado_id=empleado_id, skip=skip, limit=limit
    )


@rrhh_objetivos_router.post("", response_model=RrhhObjetivoRead, status_code=201)
async def crear_objetivo(
    payload: RrhhObjetivoCreate,
    db: AsyncSession = Depends(get_session),
):
    """Alta de un objetivo para un empleado (activo). El periodo es
    obligatorio y el peso nace con el objetivo (defecto 1)."""
    return await rrhh_objetivo_service.crear(db, payload)


@rrhh_objetivos_router.get("/{objetivo_id}", response_model=RrhhObjetivoDetalle)
async def obtener_objetivo(objetivo_id: int, db: AsyncSession = Depends(get_session)):
    """Detalle de un objetivo con los datos del empleado (cabecera de la
    ficha)."""
    return await rrhh_objetivo_service.get(db, objetivo_id)


@rrhh_objetivos_router.put("/{objetivo_id}", response_model=RrhhObjetivoRead)
async def editar_objetivo(
    objetivo_id: int,
    payload: RrhhObjetivoUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Edición de la definición; siempre permitida. Cambiar el periodo o el
    peso no altera las filas ya seleccionadas en borradores (guardan su
    copia), pero sí qué objetivos aparecen como candidatos."""
    return await rrhh_objetivo_service.update(db, objetivo_id, payload)


@rrhh_objetivos_router.delete("/{objetivo_id}")
async def eliminar_objetivo(objetivo_id: int, db: AsyncSession = Depends(get_session)):
    """Baja de un objetivo; sus filas en evaluaciones caen por `CASCADE`
    (se recalcula el promedio de las borradores afectadas)."""
    return await rrhh_objetivo_service.eliminar(db, objetivo_id)
