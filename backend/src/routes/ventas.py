from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.services.ventas_clientes_service import VentasService
from src.dto import VentaCreate, VentaRead, VentaUpdate

router = APIRouter(prefix="/ventas", tags=["ventas"], redirect_slashes=False)


@router.get("", response_model=List[VentaRead])
async def listar_ventas(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    """Listar todas las ventas con paginación."""
    return await VentasService.get_ventas(db, skip=skip, limit=limit)


@router.post("", response_model=VentaRead, status_code=201)
async def crear_venta(
    venta: VentaCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear una nueva venta con sus detalles."""
    try:
        return await VentasService.create_venta(db, venta)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear venta: {str(e)}")


@router.get("/{venta_id}", response_model=VentaRead)
async def obtener_venta(
    venta_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener una venta específica por ID."""
    venta = await VentasService.get_venta(db, venta_id)
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    return venta


@router.put("/{venta_id}", response_model=VentaRead)
async def actualizar_venta(
    venta_id: int,
    venta_update: VentaUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar una venta existente. Solo se pueden editar ventas PENDIENTES."""
    try:
        venta = await VentasService.update_venta(db, venta_id, venta_update)
        if not venta:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        return venta
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar venta: {str(e)}"
        )


@router.post("/{venta_id}/confirmar", response_model=VentaRead)
async def confirmar_venta(
    venta_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Confirmar una venta pendiente."""
    try:
        venta = await VentasService.confirmar_venta(db, venta_id)
        if not venta:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        return venta
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al confirmar venta: {str(e)}"
        )


@router.post("/{venta_id}/anular", response_model=VentaRead)
async def anular_venta(
    venta_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Anular una venta. Si estaba completada, se devuelve el stock."""
    try:
        venta = await VentasService.anular_venta(db, venta_id)
        if not venta:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        return venta
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al anular venta: {str(e)}")


@router.delete("/{venta_id}", status_code=204)
async def eliminar_venta(
    venta_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar una venta permanentemente. Si estaba completada, se devuelve el stock."""
    try:
        success = await VentasService.delete_venta(db, venta_id)
        if not success:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar venta: {str(e)}"
        )


@router.get("/cliente/{cliente_id}", response_model=List[VentaRead])
async def listar_ventas_por_cliente(
    cliente_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    """Listar todas las ventas de un cliente específico."""
    return await VentasService.get_ventas_by_cliente(
        db, cliente_id, skip=skip, limit=limit
    )


@router.get("/stats/mes-actual", response_model=List[VentaRead])
async def ventas_mes_actual(
    db: AsyncSession = Depends(get_session),
):
    """Obtener las ventas del mes actual."""
    return await VentasService.get_ventas_mes_actual(db)
