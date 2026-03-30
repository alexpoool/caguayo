from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List
from src.database.connection import get_session
from src.services.pago_service import PagoService
from src.dto.pago_dto import PagoCreate, PagoRead


router = APIRouter(prefix="/pagos", tags=["pagos"], redirect_slashes=False)


@router.post("", response_model=PagoRead, status_code=201)
async def crear_pago(
    pago: PagoCreate,
    db: AsyncSession = Depends(get_session),
):
    """Registrar un nuevo pago para una factura."""
    try:
        return await PagoService.create(db, pago)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear pago: {str(e)}")


@router.get("/factura/{factura_id}", response_model=List[PagoRead])
async def obtener_pagos_por_factura(
    factura_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener todos los pagos de una factura."""
    try:
        return await PagoService.get_by_factura(db, factura_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener pagos: {str(e)}")


@router.delete("/{pago_id}", status_code=204)
async def eliminar_pago(
    pago_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar un pago."""
    try:
        success = await PagoService.delete(db, pago_id)
        if not success:
            raise HTTPException(status_code=404, detail="Pago no encontrado")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar pago: {str(e)}")
