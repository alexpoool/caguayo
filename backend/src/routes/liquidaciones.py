import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_auth_session, get_session
from src.services.liquidacion_service import liquidacion_service
from src.core.exceptions import BusinessLogicError, NotFoundError, ValidationError
from src.dto import (
    LiquidacionCreate,
    LiquidacionRead,
    LiquidacionUpdate,
    LiquidacionConfirmar,
)
from src.utils import _get_nit_from_token, verify_auth

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/liquidaciones", tags=["liquidaciones"], redirect_slashes=False
)


@router.get("", response_model=List[LiquidacionRead])
async def listar_liquidaciones(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    """Listar todas las liquidaciones con paginación."""
    return await liquidacion_service.get_liquidaciones(db, skip=skip, limit=limit)


@router.get("/pendientes", response_model=List[LiquidacionRead])
async def listar_liquidaciones_pendientes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    """Listar liquidaciones pendientes."""
    return await liquidacion_service.get_liquidaciones_pendientes(
        db, skip=skip, limit=limit
    )


@router.get("/liquidadas", response_model=List[LiquidacionRead])
async def listar_liquidaciones_liquidadas(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    """Listar liquidaciones liquidadas."""
    return await liquidacion_service.get_liquidaciones_liquidadas(
        db, skip=skip, limit=limit
    )


@router.get("/cliente/{cliente_id}", response_model=List[LiquidacionRead])
async def listar_liquidaciones_por_cliente(
    cliente_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    """Listar liquidaciones de un cliente específico."""
    return await liquidacion_service.get_liquidaciones_by_cliente(
        db, cliente_id, skip=skip, limit=limit
    )


@router.get(
    "/productos-pendientes/cliente/{cliente_id}",
    response_model=List[dict],
)
async def listar_productos_pendientes_por_cliente(
    cliente_id: int,
    anexo_id: Optional[int] = Query(None),
    moneda_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_session),
):
    """Listar productos pendientes de un cliente específico (y opcionalmente por anexo/moneda)."""
    return await liquidacion_service.get_productos_pendientes_by_cliente(
        db, cliente_id, anexo_id, moneda_id
    )


@router.get(
    "/productos-anexo/cliente/{cliente_id}",
    response_model=List[dict],
)
async def listar_items_anexo_con_estado(
    cliente_id: int,
    anexo_id: Optional[int] = Query(None),
    moneda_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_session),
):
    """Listar todos los items de anexos del cliente con estado (EN_CONSIGNACION, A LIQUIDAR, LIQUIDADO)."""
    return await liquidacion_service.get_items_anexo_con_estado(
        db, cliente_id, anexo_id, moneda_id
    )


@router.post("", response_model=LiquidacionRead, status_code=201)
async def crear_liquidacion(
    liquidacion: LiquidacionCreate,
    authorization: Optional[str] = Header(None),
    db_auth: AsyncSession = Depends(get_auth_session),
    db: AsyncSession = Depends(get_session),
):
    """Crear una nueva liquidación."""
    try:
        nit = await _get_nit_from_token(authorization, db_auth)
        return await liquidacion_service.create_liquidacion(db, liquidacion, nit=nit)
    except HTTPException:
        raise
    except (BusinessLogicError, ValidationError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error al crear liquidación", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.get("/{liquidacion_id}", response_model=LiquidacionRead)
async def obtener_liquidacion(
    liquidacion_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener una liquidación específica por ID."""
    liquidacion = await liquidacion_service.get_liquidacion(db, liquidacion_id)
    if not liquidacion:
        raise HTTPException(status_code=404, detail="Liquidación no encontrada")
    return liquidacion


@router.put("/{liquidacion_id}", response_model=LiquidacionRead)
async def actualizar_liquidacion(
    liquidacion_id: int,
    liquidacion_update: LiquidacionUpdate,
    authorization: Optional[str] = Header(None),
    db_auth: AsyncSession = Depends(get_auth_session),
    db: AsyncSession = Depends(get_session),
):
    """Actualizar una liquidación existente."""
    try:
        await verify_auth(authorization=authorization, db_auth=db_auth)
        liquidacion = await liquidacion_service.update_liquidacion(
            db, liquidacion_id, liquidacion_update
        )
        if not liquidacion:
            raise HTTPException(status_code=404, detail="Liquidación no encontrada")
        return liquidacion
    except HTTPException:
        raise
    except (BusinessLogicError, ValidationError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error al actualizar liquidación", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.post("/{liquidacion_id}/confirmar", response_model=LiquidacionRead)
async def confirmar_liquidacion(
    liquidacion_id: int,
    data: LiquidacionConfirmar,
    authorization: Optional[str] = Header(None),
    db_auth: AsyncSession = Depends(get_auth_session),
    db: AsyncSession = Depends(get_session),
):
    """Confirmar una liquidación (marcar como liquidada)."""
    try:
        await verify_auth(authorization=authorization, db_auth=db_auth)
        liquidacion = await liquidacion_service.confirmar_liquidacion(
            db, liquidacion_id, data
        )
        if not liquidacion:
            raise HTTPException(status_code=404, detail="Liquidación no encontrada")
        return liquidacion
    except HTTPException:
        raise
    except (BusinessLogicError, ValidationError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error al confirmar liquidación", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.delete("/{liquidacion_id}", status_code=204)
async def eliminar_liquidacion(
    liquidacion_id: int,
    authorization: Optional[str] = Header(None),
    db_auth: AsyncSession = Depends(get_auth_session),
    db: AsyncSession = Depends(get_session),
):
    """Eliminar una liquidación permanentemente."""
    try:
        await verify_auth(authorization=authorization, db_auth=db_auth)
        success = await liquidacion_service.delete_liquidacion(db, liquidacion_id)
        if not success:
            raise HTTPException(status_code=404, detail="Liquidación no encontrada")
    except HTTPException:
        raise
    except (BusinessLogicError, ValidationError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error al eliminar liquidación", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.patch("/{liquidacion_id}/aprobar")
async def aprobar_liquidacion(
    liquidacion_id: int,
    authorization: Optional[str] = Header(None),
    db_auth: AsyncSession = Depends(get_auth_session),
    db: AsyncSession = Depends(get_session),
):
    """Aprobar una liquidación (marcar como liquidada usando lógica de negocio completa)."""
    try:
        await verify_auth(authorization=authorization, db_auth=db_auth)
        result = await liquidacion_service.aprobar(db, liquidacion_id)
        if not result:
            raise HTTPException(status_code=404, detail="Liquidación no encontrada")
        return {"success": True, "message": "Liquidación aprobada correctamente"}
    except HTTPException:
        raise
    except (BusinessLogicError, ValidationError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error al aprobar liquidación", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")
