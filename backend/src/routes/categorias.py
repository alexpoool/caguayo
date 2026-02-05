from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from typing import List
from src.database.connection import get_session
from src.services import CategoriasService
from src.dto import CategoriasCreate, CategoriasRead, CategoriasUpdate

router = APIRouter(prefix="/categorias", tags=["categorias"])


@router.post("", response_model=CategoriasRead)
async def create_categoria(
    categoria: CategoriasCreate, db: Session = Depends(get_session)
):
    try:
        return await CategoriasService.create_categoria(db, categoria)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[CategoriasRead])
async def read_categorias(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_session)
):
    return await CategoriasService.get_categorias(db, skip=skip, limit=limit)


@router.get("/{categoria_id}", response_model=CategoriasRead)
async def read_categoria(categoria_id: int, db: Session = Depends(get_session)):
    categoria = await CategoriasService.get_categoria(db, categoria_id)
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return categoria


@router.put("/{categoria_id}", response_model=CategoriasRead)
async def update_categoria(
    categoria_id: int, categoria: CategoriasUpdate, db: Session = Depends(get_session)
):
    updated_categoria = await CategoriasService.update_categoria(
        db, categoria_id, categoria
    )
    if not updated_categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return updated_categoria


@router.delete("/{categoria_id}")
async def delete_categoria(categoria_id: int, db: Session = Depends(get_session)):
    deleted = await CategoriasService.delete_categoria(db, categoria_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return {"message": "Categoría eliminada correctamente"}
