from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.services.ventas_clientes_service import ClienteService
from src.dto import ClienteCreate, ClienteRead, ClienteReadWithVentas, ClienteUpdate

router = APIRouter(prefix="/clientes", tags=["clientes"], redirect_slashes=False)


@router.get("", response_model=List[ClienteRead])
async def listar_clientes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    """Listar todos los clientes con paginación."""
    return await ClienteService.get_clientes(db, skip=skip, limit=limit)


@router.post("", response_model=ClienteRead, status_code=201)
async def crear_cliente(
    cliente: ClienteCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear un nuevo cliente."""
    try:
        return await ClienteService.create_cliente(db, cliente)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear cliente: {str(e)}")


@router.get("/search", response_model=List[ClienteRead])
async def buscar_clientes(
    cedula_rif: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
):
    """Buscar clientes por cédula/RIF."""
    if cedula_rif:
        cliente = await ClienteService.get_cliente_by_cedula(db, cedula_rif)
        return [cliente] if cliente else []
    return await ClienteService.get_clientes(db)


@router.get("/{cliente_id}", response_model=ClienteRead)
async def obtener_cliente(
    cliente_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener un cliente específico por ID."""
    cliente = await ClienteService.get_cliente(db, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


@router.get("/{cliente_id}/perfil", response_model=ClienteReadWithVentas)
async def obtener_perfil_cliente(
    cliente_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener el perfil completo de un cliente con su historial de ventas."""
    cliente = await ClienteService.get_cliente_with_ventas(db, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


@router.put("/{cliente_id}", response_model=ClienteRead)
async def actualizar_cliente(
    cliente_id: int,
    cliente_update: ClienteUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar un cliente existente."""
    try:
        cliente = await ClienteService.update_cliente(db, cliente_id, cliente_update)
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        return cliente
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar cliente: {str(e)}"
        )


@router.delete("/{cliente_id}", status_code=204)
async def eliminar_cliente(
    cliente_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar un cliente. No se puede eliminar si tiene ventas asociadas."""
    try:
        success = await ClienteService.delete_cliente(db, cliente_id)
        if not success:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar cliente: {str(e)}"
        )
