import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_session
from src.dto.ficha_tarifa_dto import (
    FichaTarifaCreate,
    FichaTarifaRead,
    FichaTarifaUpdate,
)
from src.services.ficha_tarifa_service import FichaTarifaService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/fichas-tarifas", tags=["fichas-tarifas"], redirect_slashes=False
)


@router.get("", response_model=List[FichaTarifaRead])
async def listar_tarifas(
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=1000),
    search: Optional[str] = Query(None, description="Buscar por categoría"),
    db: AsyncSession = Depends(get_session),
):
    try:
        return await FichaTarifaService.listar(db, skip=skip, limit=limit, search=search)
    except Exception as e:
        logger.error("Error en listar_tarifas", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.get("/{id_tarifa}", response_model=FichaTarifaRead)
async def obtener_tarifa(
    id_tarifa: int,
    db: AsyncSession = Depends(get_session),
):
    return await FichaTarifaService.obtener(db, id_tarifa)


@router.post("", response_model=FichaTarifaRead, status_code=201)
async def crear_tarifa(
    datos: FichaTarifaCreate,
    db: AsyncSession = Depends(get_session),
):
    try:
        return await FichaTarifaService.crear(db, datos)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("Error al crear tarifa", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.put("/{id_tarifa}", response_model=FichaTarifaRead)
async def actualizar_tarifa(
    id_tarifa: int,
    datos: FichaTarifaUpdate,
    db: AsyncSession = Depends(get_session),
):
    try:
        return await FichaTarifaService.actualizar(db, id_tarifa, datos)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("Error al actualizar tarifa", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.delete("/{id_tarifa}", status_code=204)
async def eliminar_tarifa(
    id_tarifa: int,
    db: AsyncSession = Depends(get_session),
):
    try:
        await FichaTarifaService.eliminar(db, id_tarifa)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("Error al eliminar tarifa", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno del servidor")
