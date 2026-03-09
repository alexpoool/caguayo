from typing import List
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from src.database.connection import get_session
from src.services.movimiento_service import MovimientoService
from src.models import TipoMovimiento
from src.dto import (
    MovimientoCreate,
    MovimientoRead,
    TipoMovimientoRead,
    AjusteCreate,
    MovimientoAjusteRead,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/movimientos", tags=["movimientos"], redirect_slashes=False)


@router.get("/tipos", response_model=List[TipoMovimientoRead])
async def listar_tipos_movimiento(
    db: AsyncSession = Depends(get_session),
):
    """Obtener todos los tipos de movimiento disponibles."""
    statement = select(TipoMovimiento)
    results = await db.exec(statement)
    tipos = results.all()
    return [TipoMovimientoRead.model_validate(t) for t in tipos]


@router.get("", response_model=List[MovimientoRead])
async def listar_movimientos(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    tipo: str = Query(None, description="Filtrar por tipo de movimiento"),
    db: AsyncSession = Depends(get_session),
):
    """Listar todos los movimientos con paginación y filtro opcional por tipo."""
    return await MovimientoService.get_movimientos(
        db, skip=skip, limit=limit, tipo=tipo
    )


@router.get("/pendientes", response_model=List[MovimientoRead])
async def listar_movimientos_pendientes(
    db: AsyncSession = Depends(get_session),
):
    """Obtener todos los movimientos pendientes de confirmación."""
    return await MovimientoService.get_movimientos_pendientes(db)


@router.get("/recepciones-stock", response_model=List[dict])
async def listar_recepciones_stock(
    db: AsyncSession = Depends(get_session),
):
    """Obtener movimientos de tipo RECEPCION.

    Retorna lista de recepciones disponibles para ajustar.
    """
    return await MovimientoService.get_recepciones_stock(db)


@router.post("", response_model=MovimientoRead, status_code=201)
async def crear_movimiento(
    movimiento: MovimientoCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear un nuevo movimiento de inventario."""
    logger.info(f"Creando movimiento: {movimiento}")
    try:
        result = await MovimientoService.create_movimiento(db, movimiento)
        logger.info(f"Movimiento creado exitosamente: {result}")
        return result
    except Exception as e:
        logger.error(f"Error al crear movimiento: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Error al crear movimiento: {str(e)}"
        )


@router.post("/ajuste", response_model=List[MovimientoAjusteRead])
async def crear_ajuste(
    ajuste: AjusteCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear movimientos de ajuste (quitar de origen, agregar a destinos).

    Recibe:
    - id_movimiento_origen: ID del movimiento de recepción original
    - destinos: Lista de dependencias destino con sus cantidades

    Crea:
    - 1 movimiento AJUSTE_QUITAR (factor -1) en la dependencia origen
    - N movimientos AJUSTE_AGREGAR (factor +1) en cada dependencia destino
    """
    try:
        result = await MovimientoService.crear_ajuste(db, ajuste)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error al crear ajuste: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al crear ajuste: {str(e)}")


@router.get("/{movimiento_id}", response_model=MovimientoRead)
async def obtener_movimiento(
    movimiento_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener un movimiento específico por ID."""
    movimiento = await MovimientoService.get_movimiento(db, movimiento_id)
    if not movimiento:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    return movimiento


@router.get("/{movimiento_id}/origen")
async def obtener_origen_movimiento(
    movimiento_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener información del origen (proveedor/convenio/anexo) de un movimiento.

    Útil para movimientos de salida (MERMA, DONACION, DEVOLUCION) para saber
    de dónde proviene el producto.
    """
    movimiento = await MovimientoService.get_movimiento(db, movimiento_id)
    if not movimiento:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")

    origen = await MovimientoService.get_origen_recepcion(db, movimiento.id_producto)
    if not origen:
        raise HTTPException(
            status_code=404,
            detail="No se encontró información de origen para este producto",
        )

    return origen


@router.put("/{movimiento_id}/confirmar", response_model=MovimientoRead)
async def confirmar_movimiento(
    movimiento_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Confirmar un movimiento pendiente."""
    try:
        movimiento = await MovimientoService.confirmar_movimiento(db, movimiento_id)
        return movimiento
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al confirmar movimiento: {str(e)}"
        )


@router.put("/{movimiento_id}/cancelar", response_model=MovimientoRead)
async def cancelar_movimiento(
    movimiento_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Cancelar un movimiento pendiente."""
    try:
        movimiento = await MovimientoService.cancelar_movimiento(db, movimiento_id)
        return movimiento
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al cancelar movimiento: {str(e)}"
        )


@router.delete("/{movimiento_id}", status_code=204)
async def eliminar_movimiento(
    movimiento_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar un movimiento de la base de datos."""
    try:
        movimiento = await MovimientoService.eliminar_movimiento(db, movimiento_id)
        if not movimiento:
            raise HTTPException(status_code=404, detail="Movimiento no encontrado")
        return None
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar movimiento: {str(e)}"
        )
