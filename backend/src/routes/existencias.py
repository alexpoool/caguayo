from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.services.existencia_service import ExistenciaService


existencias_router = APIRouter(prefix="/existencias", tags=["existencias"])


class ValidarDisponibilidadRequest(BaseModel):
    id_producto: int
    cantidad: int
    id_dependencia: Optional[int] = None
    id_anexo: Optional[int] = None


class ValidarMultipleRequest(BaseModel):
    productos: List[dict]
    id_dependencia: Optional[int] = None
    id_anexo: Optional[int] = None


class ExistenciaResponse(BaseModel):
    id_producto: int
    cantidad_entrada: int
    cantidad_salida: int
    existencia: int
    tipo: str


class ExistenciaHibridaResponse(BaseModel):
    id_producto: int
    nombre_producto: Optional[str] = None
    codigo: Optional[str] = None
    cantidad_entrada: int
    cantidad_salida: int
    existencia: int
    tipo: str


@existencias_router.get("/anexo/{id_anexo}", response_model=List[ExistenciaResponse])
async def get_existencias_por_anexo(
    id_anexo: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtiene existencias por konsignación de un anexo específico."""
    try:
        return await ExistenciaService.get_existencias_por_anexo(db, id_anexo)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener existencias: {str(e)}")


@existencias_router.get("/dependencia/{id_dependencia}", response_model=List[ExistenciaResponse])
async def get_existencias_por_dependencia(
    id_dependencia: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtiene existencias por movimientos de una dependencia."""
    try:
        return await ExistenciaService.get_existencias_por_dependencia(db, id_dependencia)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener existencias: {str(e)}")


@existencias_router.get("/hibridas", response_model=List[ExistenciaHibridaResponse])
async def get_existencias_hibridas(
    id_dependencia: int = Query(None, description="ID de dependencia"),
    id_anexo: int = Query(None, description="ID de anexo"),
    db: AsyncSession = Depends(get_session),
):
    """Obtiene existencias combinadas (sistema híbrido)."""
    try:
        return await ExistenciaService.get_existencias_hibridas(db, id_dependencia, id_anexo)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener existencias: {str(e)}")


@existencias_router.get("/producto/{id_producto}")
async def get_existencia_producto(
    id_producto: int,
    id_dependencia: int = Query(None, description="ID de dependencia"),
    id_anexo: int = Query(None, description="ID de anexo"),
    db: AsyncSession = Depends(get_session),
):
    """Obtiene existencia de un producto específico."""
    try:
        return await ExistenciaService.get_existencia_producto(
            db, id_producto, id_dependencia, id_anexo
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener existencia: {str(e)}")


@existencias_router.post("/validar")
async def validar_disponibilidad(
    data: ValidarDisponibilidadRequest,
    db: AsyncSession = Depends(get_session),
):
    """Valida si hay suficiente existencia para una transacción."""
    try:
        return await ExistenciaService.validar_disponibilidad(
            db,
            data.id_producto,
            data.cantidad,
            data.id_dependencia,
            data.id_anexo
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al validar disponibilidad: {str(e)}")


@existencias_router.post("/validar-multiples")
async def validar_multiple(
    data: ValidarMultipleRequest,
    db: AsyncSession = Depends(get_session),
):
    """Valida disponibilidad de múltiples productos."""
    try:
        return await ExistenciaService.validar_multiple(
            db,
            data.productos,
            data.id_dependencia,
            data.id_anexo
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al validar disponibilidad: {str(e)}")


@existencias_router.get("/resumen")
async def get_resumen_existencias(
    id_dependencia: int = Query(None, description="ID de dependencia"),
    db: AsyncSession = Depends(get_session),
):
    """Obtiene resumen de existencias."""
    try:
        return await ExistenciaService.get_resumen_existencias(db, id_dependencia)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener resumen: {str(e)}")