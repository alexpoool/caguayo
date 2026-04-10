from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.services.subcategoria_service import subcategorias_service
from src.dto import SubcategoriasCreate, SubcategoriasRead, SubcategoriasUpdate

router = APIRouter(
    prefix="/subcategorias", tags=["subcategorias"], redirect_slashes=False
)


@router.post("", response_model=SubcategoriasRead, status_code=201)
async def create_subcategoria(
    subcategoria: SubcategoriasCreate,
    db: AsyncSession = Depends(get_session),
):
    return await subcategorias_service.create(db, subcategoria)


@router.get("", response_model=List[SubcategoriasRead])
async def listar_subcategorias(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    return await subcategorias_service.get_multi(db, skip=skip, limit=limit)


@router.get("/{subcategoria_id}", response_model=SubcategoriasRead)
async def obtener_subcategoria(
    subcategoria_id: int,
    db: AsyncSession = Depends(get_session),
):
    return await subcategorias_service.get(db, subcategoria_id)


@router.put("/{subcategoria_id}", response_model=SubcategoriasRead)
async def actualizar_subcategoria(
    subcategoria_id: int,
    subcategoria: SubcategoriasUpdate,
    db: AsyncSession = Depends(get_session),
):
    return await subcategorias_service.update(db, subcategoria_id, subcategoria)


@router.delete("/{subcategoria_id}", status_code=204)
async def eliminar_subcategoria(
    subcategoria_id: int,
    db: AsyncSession = Depends(get_session),
):
    await subcategorias_service.delete(db, subcategoria_id)
