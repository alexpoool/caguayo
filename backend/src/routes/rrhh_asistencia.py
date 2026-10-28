"""Rutas RRHH — Asistencia (Fase 4).

Prefijo `/rrhh/asistencia`. Siguen el patrón del proyecto: `APIRouter` con
`get_session` inyectado y servicios en `src/services/`.

La tabla tiene `UNIQUE (empleado_id, fecha)`, así que el alta y la corrección
son la misma operación (`PUT /asistencia`): no existe un alta ciega.
"""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from src.utils.auth import verify_auth
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_session
from src.domain.rrhh_asistencia_calc import ESTADOS_ASISTENCIA
from src.dto import (
    RrhhAsistenciaCreate,
    RrhhAsistenciaUpdate,
    RrhhAsistenciaRead,
    RrhhAsistenciaListado,
    RrhhAsistenciaMarcacion,
    RrhhAsistenciaResumenDia,
)
from src.services.rrhh_asistencia_service import rrhh_asistencia_service

rrhh_asistencia_router = APIRouter(prefix="/rrhh/asistencia", tags=["rrhh-asistencia"], dependencies=[Depends(verify_auth)])


@rrhh_asistencia_router.get("", response_model=List[RrhhAsistenciaListado])
async def listar_asistencias(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    empleado_id: Optional[int] = None,
    departamento_id: Optional[int] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    estado: Optional[str] = Query(None, description="Estado a filtrar"),
    buscar: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Listado de marcaciones con los cálculos derivados.

    Filtros: empleado, departamento, rango de fechas, estado y búsqueda por
    nombre, apellido o código del empleado.
    """
    return await rrhh_asistencia_service.listar(
        db,
        skip=skip,
        limit=limit,
        empleado_id=empleado_id,
        departamento_id=departamento_id,
        desde=desde,
        hasta=hasta,
        estado=estado,
        buscar=buscar,
    )


@rrhh_asistencia_router.get("/estados", response_model=List[str])
async def listar_estados():
    """Catálogo de estados de asistencia."""
    return list(ESTADOS_ASISTENCIA)


@rrhh_asistencia_router.get("/resumen", response_model=RrhhAsistenciaResumenDia)
async def resumen_dia(
    fecha: Optional[date] = Query(None, description="Fecha del resumen (un solo día)"),
    desde: Optional[date] = Query(None, description="Inicio del rango (si falta, `fecha`)"),
    hasta: Optional[date] = Query(None, description="Fin del rango (si falta, el inicio)"),
    departamento_id: Optional[int] = None,
    estado: Optional[str] = Query(None, description="Estado a filtrar"),
    buscar: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Conteo de asistencias por estado para un día o un rango de fechas.

    Acepta los mismos filtros que el listado; sin fechas, usa hoy.
    """
    return await rrhh_asistencia_service.resumen_dia(
        db,
        fecha=fecha,
        departamento_id=departamento_id,
        desde=desde,
        hasta=hasta,
        estado=estado,
        buscar=buscar,
    )


@rrhh_asistencia_router.get("/{asistencia_id}", response_model=RrhhAsistenciaListado)
async def obtener_asistencia(
    asistencia_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Detalle de una marcación con sus cálculos."""
    return await rrhh_asistencia_service.get(db, asistencia_id)


@rrhh_asistencia_router.post("/marcar", response_model=RrhhAsistenciaRead, status_code=201)
async def marcar_asistencia(
    marcacion: RrhhAsistenciaMarcacion,
    db: AsyncSession = Depends(get_session),
):
    """Marcación rápida: registra entrada o salida según el momento.

    Si el empleado aún no tiene marcación el día, crea la entrada; si tiene
    entrada pero no salida, registra la salida; si ya las tiene ambas,
    devuelve `409`.
    """
    return await rrhh_asistencia_service.marcar(db, marcacion)


@rrhh_asistencia_router.post("", response_model=RrhhAsistenciaRead, status_code=201)
async def crear_o_actualizar_asistencia(
    asistencia: RrhhAsistenciaCreate,
    db: AsyncSession = Depends(get_session),
):
    """Alta o corrección de una marcación.

    Si ya existe una marcación para ese empleado y fecha, la sobrescribe.
    """
    return await rrhh_asistencia_service.crear_o_actualizar(db, asistencia)


@rrhh_asistencia_router.put("/{asistencia_id}", response_model=RrhhAsistenciaRead)
async def actualizar_asistencia(
    asistencia_id: int,
    asistencia: RrhhAsistenciaUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Corrección parcial de una marcación existente."""
    return await rrhh_asistencia_service.update(db, asistencia_id, asistencia)


@rrhh_asistencia_router.delete("/{asistencia_id}")
async def eliminar_asistencia(
    asistencia_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Elimina una marcación (corrección de un registro erróneo)."""
    return await rrhh_asistencia_service.eliminar(db, asistencia_id)
