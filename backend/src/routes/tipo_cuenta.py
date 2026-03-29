from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.dto import TipoCuentaCreate, TipoCuentaRead, TipoCuentaUpdate
from src.services.tipo_cuenta_service import tipo_cuenta_service

router = APIRouter(
    prefix="/configuracion/tipos-cuenta",
    tags=["configuracion"],
    redirect_slashes=False,
)

@router.get("", response_model=List[TipoCuentaRead])
async def listar_tipos_cuenta(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    return await tipo_cuenta_service.get_multi(db, skip=skip, limit=limit)

@router.post("", response_model=TipoCuentaRead, status_code=201)
async def crear_tipo_cuenta(
    data: TipoCuentaCreate,
    db: AsyncSession = Depends(get_session),
):
    return await tipo_cuenta_service.create(db, data)

@router.get("/{tipo_cuenta_id}", response_model=TipoCuentaRead)
async def obtener_tipo_cuenta(
    tipo_cuenta_id: int,
    db: AsyncSession = Depends(get_session),
):
    return await tipo_cuenta_service.get(db, tipo_cuenta_id)

@router.put("/{tipo_cuenta_id}", response_model=TipoCuentaRead)
async def actualizar_tipo_cuenta(
    tipo_cuenta_id: int,
    data: TipoCuentaUpdate,
    db: AsyncSession = Depends(get_session),
):
    return await tipo_cuenta_service.update(db, tipo_cuenta_id, data)

@router.delete("/{tipo_cuenta_id}", status_code=204)
async def eliminar_tipo_cuenta(
    tipo_cuenta_id: int,
    db: AsyncSession = Depends(get_session),
):
    await tipo_cuenta_service.delete(db, tipo_cuenta_id)
