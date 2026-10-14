"""Rutas RRHH — Catálogos base (Fase 1).

Prefijos `/rrhh/catalogos/tipos-contrato`, `/rrhh/catalogos/tipos-deducciones`,
`/rrhh/catalogos/tipos-bonificaciones`, `/rrhh/catalogos/tipos-pago`,
`/rrhh/catalogos/tipos-evaluacion` y `/rrhh/catalogos/calificaciones`.
Comparten la lógica de CRUD del servicio genérico `RrhhCatalogoService`.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_session
from src.dto import (
    RrhhTipoContratoCreate,
    RrhhTipoContratoUpdate,
    RrhhTipoContratoRead,
    RrhhTipoDeduccionCreate,
    RrhhTipoDeduccionUpdate,
    RrhhTipoDeduccionRead,
    RrhhTipoBonificacionCreate,
    RrhhTipoBonificacionUpdate,
    RrhhTipoBonificacionRead,
    RrhhTipoPagoCreate,
    RrhhTipoPagoUpdate,
    RrhhTipoPagoRead,
    RrhhTipoEvaluacionCreate,
    RrhhTipoEvaluacionUpdate,
    RrhhTipoEvaluacionRead,
    RrhhCalificacionCreate,
    RrhhCalificacionUpdate,
    RrhhCalificacionRead,
)
from src.services.rrhh_catalogo_service import (
    rrhh_tipo_contrato_service,
    rrhh_tipo_deduccion_service,
    rrhh_tipo_bonificacion_service,
    rrhh_tipo_pago_service,
    rrhh_tipo_evaluacion_service,
    rrhh_calificacion_service,
)


def _router(prefix: str, tag: str) -> APIRouter:
    return APIRouter(prefix=prefix, tags=[tag])


# ── Tipos de contrato ───────────────────────────────────────────────────────

tipos_contrato_router = _router("/rrhh/catalogos/tipos-contrato", "rrhh-catalogos")


@tipos_contrato_router.get("", response_model=List[RrhhTipoContratoRead])
async def listar_tipos_contrato(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    activo: Optional[bool] = None,
    buscar: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Lista tipos de contrato con filtros opcionales de estado y búsqueda."""
    return await rrhh_tipo_contrato_service.listar(
        db, skip=skip, limit=limit, activo=activo, buscar=buscar
    )


@tipos_contrato_router.get("/{tipo_id}", response_model=RrhhTipoContratoRead)
async def obtener_tipo_contrato(tipo_id: int, db: AsyncSession = Depends(get_session)):
    return await rrhh_tipo_contrato_service.get(db, tipo_id)


@tipos_contrato_router.post("", response_model=RrhhTipoContratoRead, status_code=201)
async def crear_tipo_contrato(
    tipo: RrhhTipoContratoCreate, db: AsyncSession = Depends(get_session)
):
    return await rrhh_tipo_contrato_service.create(db, tipo)


@tipos_contrato_router.put("/{tipo_id}", response_model=RrhhTipoContratoRead)
async def actualizar_tipo_contrato(
    tipo_id: int,
    tipo: RrhhTipoContratoUpdate,
    db: AsyncSession = Depends(get_session),
):
    return await rrhh_tipo_contrato_service.update(db, tipo_id, tipo)


@tipos_contrato_router.delete("/{tipo_id}")
async def eliminar_tipo_contrato(tipo_id: int, db: AsyncSession = Depends(get_session)):
    """Elimina el tipo; si está en uso por empleados, lo desactiva."""
    return await rrhh_tipo_contrato_service.eliminar(db, tipo_id)


# ── Tipos de deducción ──────────────────────────────────────────────────────

tipos_deducciones_router = _router(
    "/rrhh/catalogos/tipos-deducciones", "rrhh-catalogos"
)


@tipos_deducciones_router.get("", response_model=List[RrhhTipoDeduccionRead])
async def listar_tipos_deduccion(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    activo: Optional[bool] = None,
    buscar: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Lista tipos de deducción con filtros opcionales de estado y búsqueda."""
    return await rrhh_tipo_deduccion_service.listar(
        db, skip=skip, limit=limit, activo=activo, buscar=buscar
    )


@tipos_deducciones_router.get("/{tipo_id}", response_model=RrhhTipoDeduccionRead)
async def obtener_tipo_deduccion(tipo_id: int, db: AsyncSession = Depends(get_session)):
    return await rrhh_tipo_deduccion_service.get(db, tipo_id)


@tipos_deducciones_router.post("", response_model=RrhhTipoDeduccionRead, status_code=201)
async def crear_tipo_deduccion(
    tipo: RrhhTipoDeduccionCreate, db: AsyncSession = Depends(get_session)
):
    return await rrhh_tipo_deduccion_service.create(db, tipo)


@tipos_deducciones_router.put("/{tipo_id}", response_model=RrhhTipoDeduccionRead)
async def actualizar_tipo_deduccion(
    tipo_id: int,
    tipo: RrhhTipoDeduccionUpdate,
    db: AsyncSession = Depends(get_session),
):
    return await rrhh_tipo_deduccion_service.update(db, tipo_id, tipo)


@tipos_deducciones_router.delete("/{tipo_id}")
async def eliminar_tipo_deduccion(tipo_id: int, db: AsyncSession = Depends(get_session)):
    """Elimina el tipo; si está en uso por deducciones, lo desactiva."""
    return await rrhh_tipo_deduccion_service.eliminar(db, tipo_id)


# ── Tipos de bonificación ───────────────────────────────────────────────────

tipos_bonificaciones_router = _router(
    "/rrhh/catalogos/tipos-bonificaciones", "rrhh-catalogos"
)


@tipos_bonificaciones_router.get("", response_model=List[RrhhTipoBonificacionRead])
async def listar_tipos_bonificacion(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    activo: Optional[bool] = None,
    buscar: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Lista tipos de bonificación con filtros opcionales de estado y búsqueda."""
    return await rrhh_tipo_bonificacion_service.listar(
        db, skip=skip, limit=limit, activo=activo, buscar=buscar
    )


@tipos_bonificaciones_router.get("/{tipo_id}", response_model=RrhhTipoBonificacionRead)
async def obtener_tipo_bonificacion(
    tipo_id: int, db: AsyncSession = Depends(get_session)
):
    return await rrhh_tipo_bonificacion_service.get(db, tipo_id)


@tipos_bonificaciones_router.post(
    "", response_model=RrhhTipoBonificacionRead, status_code=201
)
async def crear_tipo_bonificacion(
    tipo: RrhhTipoBonificacionCreate, db: AsyncSession = Depends(get_session)
):
    return await rrhh_tipo_bonificacion_service.create(db, tipo)


@tipos_bonificaciones_router.put("/{tipo_id}", response_model=RrhhTipoBonificacionRead)
async def actualizar_tipo_bonificacion(
    tipo_id: int,
    tipo: RrhhTipoBonificacionUpdate,
    db: AsyncSession = Depends(get_session),
):
    return await rrhh_tipo_bonificacion_service.update(db, tipo_id, tipo)


@tipos_bonificaciones_router.delete("/{tipo_id}")
async def eliminar_tipo_bonificacion(
    tipo_id: int, db: AsyncSession = Depends(get_session)
):
    """Elimina el tipo; si está en uso por bonificaciones, lo desactiva."""
    return await rrhh_tipo_bonificacion_service.eliminar(db, tipo_id)


# ── Tipos de pago ───────────────────────────────────────────────────────────

tipos_pago_router = _router("/rrhh/catalogos/tipos-pago", "rrhh-catalogos")


@tipos_pago_router.get("", response_model=List[RrhhTipoPagoRead])
async def listar_tipos_pago(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    activo: Optional[bool] = None,
    buscar: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Lista tipos de pago con filtros opcionales de estado y búsqueda."""
    return await rrhh_tipo_pago_service.listar(
        db, skip=skip, limit=limit, activo=activo, buscar=buscar
    )


@tipos_pago_router.get("/{tipo_id}", response_model=RrhhTipoPagoRead)
async def obtener_tipo_pago(tipo_id: int, db: AsyncSession = Depends(get_session)):
    return await rrhh_tipo_pago_service.get(db, tipo_id)


@tipos_pago_router.post("", response_model=RrhhTipoPagoRead, status_code=201)
async def crear_tipo_pago(
    tipo: RrhhTipoPagoCreate, db: AsyncSession = Depends(get_session)
):
    return await rrhh_tipo_pago_service.create(db, tipo)


@tipos_pago_router.put("/{tipo_id}", response_model=RrhhTipoPagoRead)
async def actualizar_tipo_pago(
    tipo_id: int,
    tipo: RrhhTipoPagoUpdate,
    db: AsyncSession = Depends(get_session),
):
    return await rrhh_tipo_pago_service.update(db, tipo_id, tipo)


@tipos_pago_router.delete("/{tipo_id}")
async def eliminar_tipo_pago(tipo_id: int, db: AsyncSession = Depends(get_session)):
    """Elimina el tipo; si está en uso por pagos, lo desactiva."""
    return await rrhh_tipo_pago_service.eliminar(db, tipo_id)


# ── Calificaciones ──────────────────────────────────────────────────────────

calificaciones_router = _router("/rrhh/catalogos/calificaciones", "rrhh-catalogos")


@calificaciones_router.get("", response_model=List[RrhhCalificacionRead])
async def listar_calificaciones(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    buscar: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Lista calificaciones (no tiene columna `activo`)."""
    return await rrhh_calificacion_service.listar(
        db, skip=skip, limit=limit, buscar=buscar
    )


@calificaciones_router.get("/{calificacion_id}", response_model=RrhhCalificacionRead)
async def obtener_calificacion(
    calificacion_id: int, db: AsyncSession = Depends(get_session)
):
    return await rrhh_calificacion_service.get(db, calificacion_id)


@calificaciones_router.post("", response_model=RrhhCalificacionRead, status_code=201)
async def crear_calificacion(
    calificacion: RrhhCalificacionCreate, db: AsyncSession = Depends(get_session)
):
    return await rrhh_calificacion_service.create(db, calificacion)


@calificaciones_router.put("/{calificacion_id}", response_model=RrhhCalificacionRead)
async def actualizar_calificacion(
    calificacion_id: int,
    calificacion: RrhhCalificacionUpdate,
    db: AsyncSession = Depends(get_session),
):
    return await rrhh_calificacion_service.update(db, calificacion_id, calificacion)


@calificaciones_router.delete("/{calificacion_id}")
async def eliminar_calificacion(
    calificacion_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Elimina la calificación; si está en uso por evaluaciones, devuelve 409."""
    return await rrhh_calificacion_service.eliminar(db, calificacion_id)


# ── Tipos de evaluación ─────────────────────────────────────────────────────

tipos_evaluacion_router = _router(
    "/rrhh/catalogos/tipos-evaluacion", "rrhh-catalogos"
)


@tipos_evaluacion_router.get("", response_model=List[RrhhTipoEvaluacionRead])
async def listar_tipos_evaluacion(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    activo: Optional[bool] = None,
    buscar: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Lista tipos de evaluación con filtros opcionales de estado y búsqueda."""
    return await rrhh_tipo_evaluacion_service.listar(
        db, skip=skip, limit=limit, activo=activo, buscar=buscar
    )


@tipos_evaluacion_router.get("/{tipo_id}", response_model=RrhhTipoEvaluacionRead)
async def obtener_tipo_evaluacion(
    tipo_id: int, db: AsyncSession = Depends(get_session)
):
    return await rrhh_tipo_evaluacion_service.get(db, tipo_id)


@tipos_evaluacion_router.post(
    "", response_model=RrhhTipoEvaluacionRead, status_code=201
)
async def crear_tipo_evaluacion(
    tipo: RrhhTipoEvaluacionCreate, db: AsyncSession = Depends(get_session)
):
    return await rrhh_tipo_evaluacion_service.create(db, tipo)


@tipos_evaluacion_router.put("/{tipo_id}", response_model=RrhhTipoEvaluacionRead)
async def actualizar_tipo_evaluacion(
    tipo_id: int,
    tipo: RrhhTipoEvaluacionUpdate,
    db: AsyncSession = Depends(get_session),
):
    return await rrhh_tipo_evaluacion_service.update(db, tipo_id, tipo)


@tipos_evaluacion_router.delete("/{tipo_id}")
async def eliminar_tipo_evaluacion(
    tipo_id: int, db: AsyncSession = Depends(get_session)
):
    """Elimina el tipo; si está en uso por evaluaciones, lo desactiva."""
    return await rrhh_tipo_evaluacion_service.eliminar(db, tipo_id)


# Router agregado en `routes/api.py`. Se exportan los routers individuales para
# que `api.py` pueda incluirlos con sus propios prefijos.
