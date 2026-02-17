from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.services.subcategoria_service import SubcategoriasService
from src.dto import (
    SubcategoriasCreate,
    SubcategoriasRead,
    SubcategoriasUpdate,
)

router = APIRouter(
    prefix="/subcategorias", tags=["subcategorias"], redirect_slashes=False
)


@router.post("", response_model=SubcategoriasRead, status_code=201)
async def create_subcategoria(
    subcategoria: SubcategoriasCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear una nueva subcategoría."""
    try:
        return await SubcategoriasService.create_subcategoria(db, subcategoria)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[SubcategoriasRead])
async def listar_subcategorias(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_session),
):
    """Listar todas las subcategorías con paginación."""
    return await SubcategoriasService.get_subcategorias(db, skip=skip, limit=limit)


@router.get("/{subcategoria_id}", response_model=SubcategoriasRead)
async def obtener_subcategoria(
    subcategoria_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener una subcategoría específica por ID."""
    subcategoria = await SubcategoriasService.get_subcategoria(db, subcategoria_id)
    if not subcategoria:
        raise HTTPException(status_code=404, detail="Subcategoría no encontrada")
    return subcategoria


@router.put("/{subcategoria_id}", response_model=SubcategoriasRead)
async def actualizar_subcategoria(
    subcategoria_id: int,
    subcategoria: SubcategoriasUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar una subcategoría existente."""
    updated = await SubcategoriasService.update_subcategoria(
        db, subcategoria_id, subcategoria
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Subcategoría no encontrada")
    return updated


@router.delete("/{subcategoria_id}", status_code=204)
async def eliminar_subcategoria(
    subcategoria_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar una subcategoría."""
    deleted = await SubcategoriasService.delete_subcategoria(db, subcategoria_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Subcategoría no encontrada")
    return None
