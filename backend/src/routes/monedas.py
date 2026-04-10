from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.services.moneda_service import moneda_service
from src.dto import MonedaCreate, MonedaRead, MonedaUpdate

router = APIRouter(prefix="/monedas", tags=["monedas"], redirect_slashes=False)


@router.get("", response_model=List[MonedaRead])
async def listar_monedas(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    return await moneda_service.get_multi(db, skip=skip, limit=limit)


@router.post("", response_model=MonedaRead, status_code=201)
async def crear_moneda(
    moneda: MonedaCreate,
    db: AsyncSession = Depends(get_session),
):
    return await moneda_service.create(db, moneda)


@router.get("/{moneda_id}", response_model=MonedaRead)
async def obtener_moneda(
    moneda_id: int,
    db: AsyncSession = Depends(get_session),
):
    return await moneda_service.get(db, moneda_id)


@router.put("/{moneda_id}", response_model=MonedaRead)
async def actualizar_moneda(
    moneda_id: int,
    moneda_update: MonedaUpdate,
    db: AsyncSession = Depends(get_session),
):
    return await moneda_service.update(db, moneda_id, moneda_update)


@router.delete("/{moneda_id}", status_code=204)
async def eliminar_moneda(
    moneda_id: int,
    db: AsyncSession = Depends(get_session),
):
    await moneda_service.delete(db, moneda_id)
