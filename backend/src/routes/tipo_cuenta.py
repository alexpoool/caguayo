from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.dto import (
    TipoCuentaCreate,
    TipoCuentaRead,
    TipoCuentaUpdate,
)
from src.services.tipo_cuenta_service import TipoCuentaService

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
    """Listar todos los tipos de cuenta."""
    return await TipoCuentaService.get_all(db, skip=skip, limit=limit)


@router.post("", response_model=TipoCuentaRead, status_code=201)
async def crear_tipo_cuenta(
    data: TipoCuentaCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear un nuevo tipo de cuenta."""
    try:
        return await TipoCuentaService.create(db, data)
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error al crear tipo de cuenta: {str(e)}"
        )


@router.get("/{tipo_cuenta_id}", response_model=TipoCuentaRead)
async def obtener_tipo_cuenta(
    tipo_cuenta_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener un tipo de cuenta por ID."""
    db_obj = await TipoCuentaService.get(db, tipo_cuenta_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Tipo de cuenta no encontrado")
    return db_obj


@router.put("/{tipo_cuenta_id}", response_model=TipoCuentaRead)
async def actualizar_tipo_cuenta(
    tipo_cuenta_id: int,
    data: TipoCuentaUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar un tipo de cuenta."""
    try:
        db_obj = await TipoCuentaService.update(db, tipo_cuenta_id, data)
        if not db_obj:
            raise HTTPException(status_code=404, detail="Tipo de cuenta no encontrado")
        return db_obj
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error al actualizar tipo de cuenta: {str(e)}"
        )


@router.delete("/{tipo_cuenta_id}", status_code=204)
async def eliminar_tipo_cuenta(
    tipo_cuenta_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar un tipo de cuenta."""
    success = await TipoCuentaService.delete(db, tipo_cuenta_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tipo de cuenta no encontrado")
