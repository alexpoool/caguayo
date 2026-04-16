from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.services.cliente_service import ClienteNaturalService
from src.dto import ClienteNaturalCreate, ClienteNaturalRead, ClienteNaturalUpdate

router = APIRouter(
    prefix="/clientes/natural", tags=["clientes-naturales"], redirect_slashes=False
)


@router.post("/{cliente_id}", response_model=ClienteNaturalRead, status_code=201)
async def crear_cliente_natural(
    cliente_id: int,
    cliente_natural: ClienteNaturalCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear datos de persona natural para un cliente."""
    cliente_natural.id_cliente = cliente_id
    try:
        return await ClienteNaturalService.create(db, cliente_natural)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al crear cliente natural: {str(e)}"
        )


@router.get("/{cliente_id}", response_model=ClienteNaturalRead)
async def obtener_cliente_natural(
    cliente_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener datos de persona natural de un cliente."""
    cliente = await ClienteNaturalService.get(db, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente natural no encontrado")
    return cliente


@router.put("/{cliente_id}", response_model=ClienteNaturalRead)
async def actualizar_cliente_natural(
    cliente_id: int,
    update_data: ClienteNaturalUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar datos de persona natural de un cliente."""
    try:
        cliente = await ClienteNaturalService.update(db, cliente_id, update_data)
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente natural no encontrado")
        return cliente
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar cliente natural: {str(e)}"
        )


@router.delete("/{cliente_id}", status_code=204)
async def eliminar_cliente_natural(
    cliente_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar datos de persona natural de un cliente."""
    try:
        success = await ClienteNaturalService.delete(db, cliente_id)
        if not success:
            raise HTTPException(status_code=404, detail="Cliente natural no encontrado")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar cliente natural: {str(e)}"
        )
