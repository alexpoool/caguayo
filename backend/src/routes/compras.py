import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.connection import get_auth_session, get_session
from src.dto.compras_dto import CompraCreate, CompraRead, CompraUpdate
from src.services.compra_service import CompraService
from src.utils.auth import verify_auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/compras", tags=["compras"])


@router.get("", response_model=List[CompraRead])
async def listar_compras(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    id_cliente: Optional[int] = Query(None),
    estado: Optional[str] = Query(None),
    fecha_inicio: Optional[datetime] = Query(None),
    fecha_fin: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_session),
):
    """Listar compras con filtros opcionales. Acceso público."""
    try:
        compras = await CompraService.get_all(
            db,
            skip=skip,
            limit=limit,
            id_cliente=id_cliente,
            estado=estado,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
        )
        return compras
    except Exception:
        logger.error("Error al listar compras", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.get("/{id_compra}", response_model=CompraRead)
async def obtener_compra(
    id_compra: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener una compra por ID. Acceso público."""
    try:
        return await CompraService.get(db, id_compra)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        logger.error("Error al obtener compra", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.post("", response_model=CompraRead, status_code=201)
async def crear_compra(
    compra_data: CompraCreate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Crear una nueva compra con sus detalles. Requiere autenticación."""
    try:
        await verify_auth(authorization, db)
        return await CompraService.create(db, compra_data)
    except HTTPException:
        raise
    except Exception:
        logger.error("Error al crear compra", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.put("/{id_compra}", response_model=CompraRead)
async def actualizar_compra(
    id_compra: int,
    update_data: CompraUpdate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Actualizar una compra existente. Requiere autenticación."""
    try:
        await verify_auth(authorization, db)
        return await CompraService.update(db, id_compra, update_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.error("Error al actualizar compra", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.delete("/{id_compra}", status_code=204)
async def eliminar_compra(
    id_compra: int,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Eliminar una compra. Requiere autenticación."""
    try:
        await verify_auth(authorization, db)
        await CompraService.delete(db, id_compra)
        return None
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        logger.error("Error al eliminar compra", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")
