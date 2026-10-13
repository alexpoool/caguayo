"""Rutas RRHH — Departamentos y Puestos (Fase 2).

Prefijo `/rrhh/departamentos` y `/rrhh/puestos`. Siguen el patrón del proyecto:
`APIRouter` con `get_session` inyectado y servicios en `src/services/`.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_session
from src.dto import (
    RrhhDepartamentoCreate,
    RrhhDepartamentoUpdate,
    RrhhDepartamentoRead,
    RrhhDepartamentoListado,
    RrhhDepartamentoDetalle,
    RrhhPuestoCreate,
    RrhhPuestoUpdate,
    RrhhPuestoRead,
    RrhhPuestoListado,
    RrhhPuestoDetalle,
)
from src.services.rrhh_service import rrhh_departamento_service, rrhh_puesto_service

rrhh_departamentos_router = APIRouter(
    prefix="/rrhh/departamentos", tags=["rrhh-departamentos"]
)
rrhh_puestos_router = APIRouter(prefix="/rrhh/puestos", tags=["rrhh-puestos"])


# ── Departamentos ───────────────────────────────────────────────────────────


@rrhh_departamentos_router.get("", response_model=List[RrhhDepartamentoListado])
async def listar_departamentos(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    activo: Optional[bool] = None,
    buscar: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Lista departamentos con filtros opcionales de estado y búsqueda."""
    return await rrhh_departamento_service.listar(
        db, skip=skip, limit=limit, activo=activo, buscar=buscar
    )


@rrhh_departamentos_router.get(
    "/{departamento_id}", response_model=RrhhDepartamentoDetalle
)
async def obtener_departamento(
    departamento_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Detalle de un departamento: responsable, puestos y total de empleados."""
    return await rrhh_departamento_service.get(db, departamento_id)


@rrhh_departamentos_router.post(
    "", response_model=RrhhDepartamentoRead, status_code=201
)
async def crear_departamento(
    departamento: RrhhDepartamentoCreate,
    db: AsyncSession = Depends(get_session),
):
    return await rrhh_departamento_service.create(db, departamento)


@rrhh_departamentos_router.put(
    "/{departamento_id}", response_model=RrhhDepartamentoRead
)
async def actualizar_departamento(
    departamento_id: int,
    departamento: RrhhDepartamentoUpdate,
    db: AsyncSession = Depends(get_session),
):
    return await rrhh_departamento_service.update(db, departamento_id, departamento)


@rrhh_departamentos_router.delete("/{departamento_id}")
async def eliminar_departamento(
    departamento_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Elimina el departamento; si tiene puestos o empleados, lo desactiva."""
    return await rrhh_departamento_service.eliminar(db, departamento_id)


# ── Puestos ─────────────────────────────────────────────────────────────────


@rrhh_puestos_router.get("", response_model=List[RrhhPuestoListado])
async def listar_puestos(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    departamento_id: Optional[int] = None,
    activo: Optional[bool] = None,
    buscar: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Lista puestos con filtros opcionales de departamento, estado y búsqueda."""
    return await rrhh_puesto_service.listar(
        db, skip=skip, limit=limit, departamento_id=departamento_id,
        activo=activo, buscar=buscar,
    )


@rrhh_puestos_router.get("/{puesto_id}", response_model=RrhhPuestoDetalle)
async def obtener_puesto(
    puesto_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Detalle de un puesto: departamento y total de empleados asignados."""
    return await rrhh_puesto_service.get(db, puesto_id)


@rrhh_puestos_router.post("", response_model=RrhhPuestoRead, status_code=201)
async def crear_puesto(
    puesto: RrhhPuestoCreate,
    db: AsyncSession = Depends(get_session),
):
    return await rrhh_puesto_service.create(db, puesto)


@rrhh_puestos_router.put("/{puesto_id}", response_model=RrhhPuestoRead)
async def actualizar_puesto(
    puesto_id: int,
    puesto: RrhhPuestoUpdate,
    db: AsyncSession = Depends(get_session),
):
    return await rrhh_puesto_service.update(db, puesto_id, puesto)


@rrhh_puestos_router.delete("/{puesto_id}")
async def eliminar_puesto(
    puesto_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Elimina el puesto; si tiene empleados asignados, lo desactiva."""
    return await rrhh_puesto_service.eliminar(db, puesto_id)


@rrhh_puestos_router.get("/{puesto_id}/empleados")
async def empleados_del_puesto(
    puesto_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Empleados asignados a un puesto."""
    return await rrhh_puesto_service.listar_empleados(db, puesto_id)
