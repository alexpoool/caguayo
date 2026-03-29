from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.services.categoria_service import categoria_service
from src.dto import CategoriasCreate, CategoriasRead, CategoriasUpdate

router = APIRouter(prefix="/categorias", tags=["categorias"], redirect_slashes=False)

@router.get("", response_model=List[CategoriasRead])
async def listar_categorias(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    return await categoria_service.get_multi(db, skip=skip, limit=limit)

@router.post("", response_model=CategoriasRead, status_code=201)
async def crear_categoria(
    categoria: CategoriasCreate,
    db: AsyncSession = Depends(get_session),
):
    return await categoria_service.create(db, categoria)

@router.get("/{categoria_id}", response_model=CategoriasRead)
async def obtener_categoria(
    categoria_id: int,
    db: AsyncSession = Depends(get_session),
):
    return await categoria_service.get(db, categoria_id)

@router.put("/{categoria_id}", response_model=CategoriasRead)
async def actualizar_categoria(
    categoria_id: int,
    categoria_update: CategoriasUpdate,
    db: AsyncSession = Depends(get_session),
):
    return await categoria_service.update(db, categoria_id, categoria_update)

@router.delete("/{categoria_id}", status_code=204)
async def eliminar_categoria(
    categoria_id: int,
    db: AsyncSession = Depends(get_session),
):
    await categoria_service.delete(db, categoria_id)
