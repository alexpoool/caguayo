"""Rutas RRHH — Auditoría (Fase 9).

Prefijo `/rrhh/auditoria`. Siguen el patrón del proyecto: `APIRouter` con
`get_session` inyectado y servicios en `src/services/`.

Submódulo de solo lectura sobre la tabla `log` (la escriben el frontend
vía `POST /api/v1/logs` y los servicios del módulo): no hay POST/PUT/DELETE
ni cascadas. RBAC también en el frontend (deuda Fase 10), como todo el
módulo.
"""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_session
from src.dto import RrhhAuditoriaFila
from src.services.rrhh_auditoria_service import rrhh_auditoria_service

rrhh_auditoria_router = APIRouter(prefix="/rrhh/auditoria", tags=["rrhh-auditoria"])


@rrhh_auditoria_router.get("", response_model=List[RrhhAuditoriaFila])
async def listar_auditoria(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    tipo: Optional[str] = Query(None, description="Tipo de registro a filtrar"),
    nivel: Optional[str] = Query(None, description="Nivel de registro a filtrar"),
    buscar: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Listado de entradas del log, más recientes primero.

    Filtros combinables: rango de fechas (inclusive), tipo, nivel y
    búsqueda por mensaje, endpoint, usuario o detalle. El rango invertido
    (`desde > hasta`) responde `400`.
    """
    return await rrhh_auditoria_service.listar(
        db,
        skip=skip,
        limit=limit,
        desde=desde,
        hasta=hasta,
        tipo=tipo,
        nivel=nivel,
        buscar=buscar,
    )


@rrhh_auditoria_router.get("/tipos", response_model=List[str])
async def listar_tipos(db: AsyncSession = Depends(get_session)):
    """Valores distintos de `tipo` presentes en el log (para el filtro)."""
    return await rrhh_auditoria_service.tipos(db)


@rrhh_auditoria_router.get("/niveles", response_model=List[str])
async def listar_niveles(db: AsyncSession = Depends(get_session)):
    """Valores distintos de `nivel` presentes en el log (para el filtro)."""
    return await rrhh_auditoria_service.niveles(db)
