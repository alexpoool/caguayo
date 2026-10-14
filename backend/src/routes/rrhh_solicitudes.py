"""Rutas RRHH — Solicitudes de vacaciones y permisos (Fase 7).

Prefijo `/rrhh/solicitudes`. Siguen el patrón del proyecto: `APIRouter` con
`get_session` inyectado y servicios en `src/services/`.

El orden importa: las rutas de catálogo (`/tipos`, `/estados`, `/resumen`) y
`/calendario` se declaran **antes** de `/{solicitud_id}` para que no las
capture el parámetro de ruta.

Las tres decisiones usan `PUT` (reemplazo del estado de la solicitud) con un
payload que lleva el `empleado_id` de quien decide, según lo previsto en el
plan.
"""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_session
from src.domain.rrhh_solicitud_calc import ESTADOS_SOLICITUD, TIPOS_SOLICITUD
from src.dto import (
    RrhhSolicitudCreate,
    RrhhSolicitudAccion,
    RrhhSolicitudListado,
    RrhhSolicitudCalendario,
    RrhhSolicitudResumenEstado,
)
from src.services.rrhh_solicitud_service import rrhh_solicitud_service

rrhh_solicitudes_router = APIRouter(
    prefix="/rrhh/solicitudes", tags=["rrhh-solicitudes"]
)


@rrhh_solicitudes_router.get("", response_model=List[RrhhSolicitudListado])
async def listar_solicitudes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    empleado_id: Optional[int] = None,
    departamento_id: Optional[int] = None,
    estado: Optional[str] = Query(None, description="Estado a filtrar"),
    tipo: Optional[str] = Query(None, description="Tipo a filtrar"),
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    buscar: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Listado de solicitudes con el solicitante, el decisor y los días.

    Filtros: empleado, departamento, estado, tipo, rango de fechas (solicitudes
    que lo tocan) y búsqueda por nombre, apellido o código.
    """
    return await rrhh_solicitud_service.listar(
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


@rrhh_solicitudes_router.get("/tipos", response_model=List[str])
async def listar_tipos():
    """Catálogo de tipos de solicitud."""
    return list(TIPOS_SOLICITUD)


@rrhh_solicitudes_router.get("/estados", response_model=List[str])
async def listar_estados():
    """Catálogo de estados de solicitud."""
    return list(ESTADOS_SOLICITUD)


@rrhh_solicitudes_router.get("/resumen", response_model=List[RrhhSolicitudResumenEstado])
async def resumen_estados(
    empleado_id: Optional[int] = None,
    db: AsyncSession = Depends(get_session),
):
    """Conteo de solicitudes por estado (para los contadores de la pantalla)."""
    return await rrhh_solicitud_service.resumen_estados(db, empleado_id=empleado_id)


@rrhh_solicitudes_router.get("/calendario", response_model=List[RrhhSolicitudCalendario])
async def calendario(
    desde: date = Query(..., description="Primer día del rango consultado"),
    hasta: date = Query(..., description="Último día del rango consultado"),
    departamento_id: Optional[int] = None,
    empleado_id: Optional[int] = None,
    db: AsyncSession = Depends(get_session),
):
    """Ausencias aprobadas y pendientes que tocan el rango (calendario de equipo).

    Las rechazadas y canceladas se excluyen porque no ocupan días.
    """
    return await rrhh_solicitud_service.calendario(
        db,
        desde=desde,
        hasta=hasta,
        departamento_id=departamento_id,
        empleado_id=empleado_id,
    )


@rrhh_solicitudes_router.post("", response_model=RrhhSolicitudListado, status_code=201)
async def crear_solicitud(
    solicitud: RrhhSolicitudCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crea una solicitud de vacaciones o permiso en estado `pendiente`.

    Valida el rango de fechas y que no se solape con una solicitud ya
    aprobada del mismo empleado.
    """
    return await rrhh_solicitud_service.crear(db, solicitud)


@rrhh_solicitudes_router.get("/{solicitud_id}", response_model=RrhhSolicitudListado)
async def obtener_solicitud(
    solicitud_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Detalle de una solicitud, con el supervisor que debe aprobarla."""
    return await rrhh_solicitud_service.get(db, solicitud_id)


@rrhh_solicitudes_router.put("/{solicitud_id}/aprobar", response_model=RrhhSolicitudListado)
async def aprobar_solicitud(
    solicitud_id: int,
    accion: RrhhSolicitudAccion,
    db: AsyncSession = Depends(get_session),
):
    """Aprueba una solicitud pendiente (no se puede autaprobar).

    Revalida el solapamiento en el momento de decidir y guarda `aprobado_por`
    y `fecha_aprobacion`.
    """
    return await rrhh_solicitud_service.aprobar(db, solicitud_id, accion)


@rrhh_solicitudes_router.put("/{solicitud_id}/rechazar", response_model=RrhhSolicitudListado)
async def rechazar_solicitud(
    solicitud_id: int,
    accion: RrhhSolicitudAccion,
    db: AsyncSession = Depends(get_session),
):
    """Rechaza una solicitud pendiente y registra quién decidió y cuándo."""
    return await rrhh_solicitud_service.rechazar(db, solicitud_id, accion)


@rrhh_solicitudes_router.put("/{solicitud_id}/cancelar", response_model=RrhhSolicitudListado)
async def cancelar_solicitud(
    solicitud_id: int,
    accion: RrhhSolicitudAccion,
    db: AsyncSession = Depends(get_session),
):
    """Cancela una solicitud pendiente (el solicitante o RRHH)."""
    return await rrhh_solicitud_service.cancelar(db, solicitud_id, accion)
