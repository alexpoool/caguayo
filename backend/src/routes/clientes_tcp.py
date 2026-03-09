from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.services.cliente_service import ClienteTCPService
from src.dto import ClienteTCPCreate, ClienteTCPRead, ClienteTCPUpdate

router = APIRouter(
    prefix="/clientes/tcp", tags=["clientes-tcp"], redirect_slashes=False
)


@router.post("/{cliente_id}", response_model=ClienteTCPRead, status_code=201)
async def crear_cliente_tcp(
    cliente_id: int,
    cliente_tcp: ClienteTCPCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear datos de TCP para un cliente."""
    cliente_tcp.id_cliente = cliente_id
    try:
        return await ClienteTCPService.create(db, cliente_tcp)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al crear cliente TCP: {str(e)}"
        )


@router.get("/{cliente_id}", response_model=ClienteTCPRead)
async def obtener_cliente_tcp(
    cliente_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener datos de TCP de un cliente."""
    cliente = await ClienteTCPService.get(db, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente TCP no encontrado")
    return cliente


@router.put("/{cliente_id}", response_model=ClienteTCPRead)
async def actualizar_cliente_tcp(
    cliente_id: int,
    update_data: ClienteTCPUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar datos de TCP de un cliente."""
    try:
        cliente = await ClienteTCPService.update(db, cliente_id, update_data)
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente TCP no encontrado")
        return cliente
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar cliente TCP: {str(e)}"
        )


@router.delete("/{cliente_id}", status_code=204)
async def eliminar_cliente_tcp(
    cliente_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar datos de TCP de un cliente."""
    try:
        success = await ClienteTCPService.delete(db, cliente_id)
        if not success:
            raise HTTPException(status_code=404, detail="Cliente TCP no encontrado")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar cliente TCP: {str(e)}"
        )
