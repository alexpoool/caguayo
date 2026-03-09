from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.services.liquidacion_service import liquidacion_service
from src.dto import (
    LiquidacionCreate,
    LiquidacionRead,
    LiquidacionUpdate,
    LiquidacionConfirmar,
    ProductosLiquidacionCreate,
)

router = APIRouter(
    prefix="/liquidaciones", tags=["liquidaciones"], redirect_slashes=False
)


@router.get("", response_model=List[LiquidacionRead])
async def listar_liquidaciones(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    """Listar todas las liquidaciones con paginación."""
    return await liquidacion_service.get_liquidaciones(db, skip=skip, limit=limit)


@router.get("/pendientes", response_model=List[LiquidacionRead])
async def listar_liquidaciones_pendientes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    """Listar liquidaciones pendientes."""
    return await liquidacion_service.get_liquidaciones_pendientes(
        db, skip=skip, limit=limit
    )


@router.get("/liquidadas", response_model=List[LiquidacionRead])
async def listar_liquidaciones_liquidadas(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    """Listar liquidaciones liquidadas."""
    return await liquidacion_service.get_liquidaciones_liquidadas(
        db, skip=skip, limit=limit
    )


@router.get("/cliente/{cliente_id}", response_model=List[LiquidacionRead])
async def listar_liquidaciones_por_cliente(
    cliente_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    """Listar liquidaciones de un cliente específico."""
    return await liquidacion_service.get_liquidaciones_by_cliente(
        db, cliente_id, skip=skip, limit=limit
    )


@router.post("", response_model=LiquidacionRead, status_code=201)
async def crear_liquidacion(
    liquidacion: LiquidacionCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear una nueva liquidación."""
    try:
        return await liquidacion_service.create_liquidacion(db, liquidacion)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al crear liquidación: {str(e)}"
        )


@router.get("/{liquidacion_id}", response_model=LiquidacionRead)
async def obtener_liquidacion(
    liquidacion_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener una liquidación específica por ID."""
    liquidacion = await liquidacion_service.get_liquidacion(db, liquidacion_id)
    if not liquidacion:
        raise HTTPException(status_code=404, detail="Liquidación no encontrada")
    return liquidacion


@router.put("/{liquidacion_id}", response_model=LiquidacionRead)
async def actualizar_liquidacion(
    liquidacion_id: int,
    liquidacion_update: LiquidacionUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar una liquidación existente."""
    try:
        liquidacion = await liquidacion_service.update_liquidacion(
            db, liquidacion_id, liquidacion_update
        )
        if not liquidacion:
            raise HTTPException(status_code=404, detail="Liquidación no encontrada")
        return liquidacion
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar liquidación: {str(e)}"
        )


@router.post("/{liquidacion_id}/confirmar", response_model=LiquidacionRead)
async def confirmar_liquidacion(
    liquidacion_id: int,
    data: LiquidacionConfirmar,
    db: AsyncSession = Depends(get_session),
):
    """Confirmar una liquidación (marcar como liquidada)."""
    try:
        liquidacion = await liquidacion_service.confirmar_liquidacion(
            db, liquidacion_id, data
        )
        if not liquidacion:
            raise HTTPException(status_code=404, detail="Liquidación no encontrada")
        return liquidacion
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al confirmar liquidación: {str(e)}"
        )


@router.delete("/{liquidacion_id}", status_code=204)
async def eliminar_liquidacion(
    liquidacion_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar una liquidación permanentemente."""
    try:
        success = await liquidacion_service.delete_liquidacion(db, liquidacion_id)
        if not success:
            raise HTTPException(status_code=404, detail="Liquidación no encontrada")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar liquidación: {str(e)}"
        )


@router.post("/{liquidacion_id}/productos", response_model=LiquidacionRead)
async def agregar_productos_liquidacion(
    liquidacion_id: int,
    productos: List[ProductosLiquidacionCreate],
    db: AsyncSession = Depends(get_session),
):
    """Agregar productos a una liquidación."""
    try:
        liquidacion = await liquidacion_service.agregar_productos_liquidacion(
            db, liquidacion_id, productos
        )
        if not liquidacion:
            raise HTTPException(status_code=404, detail="Liquidación no encontrada")
        return liquidacion
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al agregar productos: {str(e)}"
        )


@router.delete("/productos/{producto_liquidacion_id}", status_code=204)
async def eliminar_producto_liquidacion(
    producto_liquidacion_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar un producto de una liquidación."""
    try:
        success = await liquidacion_service.eliminar_producto_liquidacion(
            db, producto_liquidacion_id
        )
        if not success:
            raise HTTPException(
                status_code=404, detail="Producto en liquidación no encontrado"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar producto: {str(e)}"
        )
