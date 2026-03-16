from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.services.productos_en_liquidacion_service import (
    productos_en_liquidacion_service,
)
from src.dto.productos_en_liquidacion_dto import (
    ProductosEnLiquidacionCreate,
    ProductosEnLiquidacionRead,
    ProductosEnLiquidacionUpdate,
)

router = APIRouter(
    prefix="/productos-en-liquidacion",
    tags=["productos-en-liquidacion"],
    redirect_slashes=False,
)


@router.get("", response_model=List[ProductosEnLiquidacionRead])
async def listar_productos(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    """Listar todos los productos en liquidación."""
    return await productos_en_liquidacion_service.get_multi(
        skip=skip, limit=limit, db=db
    )


@router.get("/liquidadas", response_model=List[ProductosEnLiquidacionRead])
async def listar_productos_liquidados(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    """Listar productos en liquidación liquidados."""
    return await productos_en_liquidacion_service.get_liquidadas(
        db, skip=skip, limit=limit
    )


@router.get("/pendientes", response_model=List[ProductosEnLiquidacionRead])
async def listar_productos_pendientes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    """Listar productos en liquidación pendientes."""
    return await productos_en_liquidacion_service.get_pendientes(
        db, skip=skip, limit=limit
    )


@router.post("", response_model=ProductosEnLiquidacionRead, status_code=201)
async def crear_producto(
    producto: ProductosEnLiquidacionCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear un nuevo producto en liquidación."""
    try:
        return await productos_en_liquidacion_service.create(db, producto)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al crear producto en liquidación: {str(e)}"
        )


@router.get("/{producto_id}", response_model=ProductosEnLiquidacionRead)
async def obtener_producto(
    producto_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener un producto en liquidación por ID."""
    producto = await productos_en_liquidacion_service.get(db, producto_id)
    if not producto:
        raise HTTPException(
            status_code=404, detail="Producto en liquidación no encontrado"
        )
    return producto


@router.put("/{producto_id}", response_model=ProductosEnLiquidacionRead)
async def actualizar_producto(
    producto_id: int,
    producto_update: ProductosEnLiquidacionUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar un producto en liquidación."""
    producto = await productos_en_liquidacion_service.update(
        db, producto_id, producto_update
    )
    if not producto:
        raise HTTPException(
            status_code=404, detail="Producto en liquidación no encontrado"
        )
    return producto


@router.post("/{producto_id}/liquidar", response_model=ProductosEnLiquidacionRead)
async def liquidar_producto(
    producto_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Marcar un producto como liquidado."""
    producto = await productos_en_liquidacion_service.marcar_liquidada(db, producto_id)
    if not producto:
        raise HTTPException(
            status_code=404, detail="Producto en liquidación no encontrado"
        )
    return producto


@router.delete("/{producto_id}", status_code=204)
async def eliminar_producto(
    producto_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar un producto en liquidación."""
    success = await productos_en_liquidacion_service.delete(db, producto_id)
    if not success:
        raise HTTPException(
            status_code=404, detail="Producto en liquidación no encontrado"
        )
