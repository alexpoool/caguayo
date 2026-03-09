from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.services.moneda_service import MonedaService
from src.dto import MonedaCreate, MonedaRead, MonedaUpdate

router = APIRouter(prefix="/monedas", tags=["monedas"], redirect_slashes=False)


@router.get("", response_model=List[MonedaRead])
async def listar_monedas(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    """Listar todas las monedas con paginación."""
    return await MonedaService.get_monedas(db, skip=skip, limit=limit)


@router.post("", response_model=MonedaRead, status_code=201)
async def crear_moneda(
    moneda: MonedaCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear una nueva moneda."""
    try:
        return await MonedaService.create_moneda(db, moneda)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear moneda: {str(e)}")


@router.get("/{moneda_id}", response_model=MonedaRead)
async def obtener_moneda(
    moneda_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener una moneda específica por ID."""
    moneda = await MonedaService.get_moneda(db, moneda_id)
    if not moneda:
        raise HTTPException(status_code=404, detail="Moneda no encontrada")
    return moneda


@router.put("/{moneda_id}", response_model=MonedaRead)
async def actualizar_moneda(
    moneda_id: int,
    moneda_update: MonedaUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar una moneda existente."""
    try:
        moneda = await MonedaService.update_moneda(db, moneda_id, moneda_update)
        if not moneda:
            raise HTTPException(status_code=404, detail="Moneda no encontrada")
        return moneda
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar moneda: {str(e)}"
        )


@router.delete("/{moneda_id}", status_code=204)
async def eliminar_moneda(
    moneda_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar una moneda permanentemente."""
    try:
        success = await MonedaService.delete_moneda(db, moneda_id)
        if not success:
            raise HTTPException(status_code=404, detail="Moneda no encontrada")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar moneda: {str(e)}"
        )
