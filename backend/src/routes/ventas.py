import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.connection import get_auth_session, get_session
from src.dto.ventas_dto import VentaCreate, VentaRead, VentaUpdate
from src.services.venta_service import VentaService
from src.utils.auth import verify_auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ventas", tags=["ventas"])


@router.get("", response_model=List[VentaRead])
async def listar_ventas(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    id_cliente: Optional[int] = Query(None),
    estado: Optional[str] = Query(None),
    fecha_inicio: Optional[datetime] = Query(None),
    fecha_fin: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_session),
):
    """Listar ventas con filtros opcionales. Acceso público."""
    try:
        ventas = await VentaService.get_all(
            db,
            skip=skip,
            limit=limit,
            id_cliente=id_cliente,
            estado=estado,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
        )
        return ventas
    except Exception:
        logger.error("Error al listar ventas", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.get("/{id_venta}", response_model=VentaRead)
async def obtener_venta(
    id_venta: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener una venta por ID. Acceso público."""
    try:
        return await VentaService.get(db, id_venta)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        logger.error("Error al obtener venta", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.post("", response_model=VentaRead, status_code=201)
async def crear_venta(
    venta_data: VentaCreate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Crear una nueva venta con sus detalles. Requiere autenticación."""
    try:
        await verify_auth(authorization, db)
        return await VentaService.create(db, venta_data)
    except HTTPException:
        raise
    except Exception:
        logger.error("Error al crear venta", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.put("/{id_venta}", response_model=VentaRead)
async def actualizar_venta(
    id_venta: int,
    update_data: VentaUpdate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Actualizar una venta existente. Requiere autenticación."""
    try:
        await verify_auth(authorization, db)
        return await VentaService.update(db, id_venta, update_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.error("Error al actualizar venta", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.delete("/{id_venta}", status_code=204)
async def eliminar_venta(
    id_venta: int,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Eliminar una venta. Requiere autenticación."""
    try:
        await verify_auth(authorization, db)
        await VentaService.delete(db, id_venta)
        return None
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.error("Error al eliminar venta", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")
