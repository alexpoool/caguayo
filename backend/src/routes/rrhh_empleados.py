"""Rutas RRHH — Empleados (Fase 3).

Prefijo `/rrhh/empleados`. Siguen el patrón del proyecto: `APIRouter` con
`get_session` inyectado y servicios en `src/services/`.

El código del empleado (`codigo_empleado`, `EMP-XXXX`) lo genera la BD con la
secuencia `empleado_codigo_seq`; no se acepta en el alta ni se puede editar.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_session
from src.dto import (
    RrhhEmpleadoCreate,
    RrhhEmpleadoUpdate,
    RrhhEmpleadoRead,
    RrhhEmpleadoListado,
    RrhhEmpleadoDetalle,
    RrhhEmpleadoBusqueda,
)
from src.services.rrhh_empleado_service import rrhh_empleado_service

rrhh_empleados_router = APIRouter(prefix="/rrhh/empleados", tags=["rrhh-empleados"])


@rrhh_empleados_router.get("", response_model=List[RrhhEmpleadoListado])
async def listar_empleados(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    buscar: Optional[str] = None,
    estado: Optional[str] = None,
    departamento_id: Optional[int] = None,
    puesto_id: Optional[int] = None,
    activo: Optional[bool] = None,
    tipo_asistencia: Optional[str] = Query(
        None,
        description="Filtra por LIBRE o NO_LIBRE (p. ej. Asistencia pide NO_LIBRE)",
    ),
    orden: Optional[str] = Query(
        None,
        description="apellido (por defecto) o recientes (creación descendente)",
    ),
    db: AsyncSession = Depends(get_session),
):
    """Lista empleados con filtros de búsqueda, estado, departamento y puesto.

    La búsqueda cubre nombre, apellido, código, carnet y correo.
    """
    return await rrhh_empleado_service.listar(
        db,
        skip=skip,
        limit=limit,
        buscar=buscar,
        estado=estado,
        departamento_id=departamento_id,
        puesto_id=puesto_id,
        activo=activo,
        tipo_asistencia=tipo_asistencia,
        orden=orden,
    )


@rrhh_empleados_router.get("/buscar", response_model=List[RrhhEmpleadoBusqueda])
async def buscar_empleados(
    q: str = Query(..., min_length=1, description="Texto a buscar"),
    tipo_asistencia: Optional[str] = Query(
        None,
        description="Filtra por LIBRE o NO_LIBRE (p. ej. Asistencia pide NO_LIBRE)",
    ),
    db: AsyncSession = Depends(get_session),
):
    """Selector abreviado de empleados (supervisor, responsable, etc.)."""
    return await rrhh_empleado_service.buscar(db, q, tipo_asistencia=tipo_asistencia)


@rrhh_empleados_router.get("/{empleado_id}", response_model=RrhhEmpleadoDetalle)
async def obtener_empleado(
    empleado_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Detalle del empleado: asignaciones resueltas y usuario vinculado por CI."""
    return await rrhh_empleado_service.get(db, empleado_id)


@rrhh_empleados_router.post("", response_model=RrhhEmpleadoRead, status_code=201)
async def crear_empleado(
    empleado: RrhhEmpleadoCreate,
    db: AsyncSession = Depends(get_session),
):
    """Alta de empleado. El código se genera automáticamente en la BD."""
    return await rrhh_empleado_service.create(db, empleado)


@rrhh_empleados_router.put("/{empleado_id}", response_model=RrhhEmpleadoRead)
async def actualizar_empleado(
    empleado_id: int,
    empleado: RrhhEmpleadoUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Actualización parcial del empleado."""
    return await rrhh_empleado_service.update(db, empleado_id, empleado)


@rrhh_empleados_router.delete("/{empleado_id}")
async def eliminar_empleado(
    empleado_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Elimina el empleado; si tiene historial o subordinados, lo desactiva."""
    return await rrhh_empleado_service.eliminar(db, empleado_id)
