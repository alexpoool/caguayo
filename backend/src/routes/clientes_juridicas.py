from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.services.cliente_service import ClienteJuridicaService
from src.dto import ClienteJuridicaCreate, ClienteJuridicaRead, ClienteJuridicaUpdate

router = APIRouter(
    prefix="/clientes/juridica", tags=["clientes-juridicas"], redirect_slashes=False
)


@router.get("", response_model=List[ClienteJuridicaRead])
async def listar_clientes_juridicos(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_session),
):
    """Listar todos los clientes jurídicos con paginación."""
    return await ClienteJuridicaService.get_all(db, skip=skip, limit=limit)


@router.post("/{cliente_id}", response_model=ClienteJuridicaRead, status_code=201)
async def crear_cliente_juridico(
    cliente_id: int,
    cliente_juridico: ClienteJuridicaCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear datos de persona jurídica para un cliente."""
    cliente_juridico.id_cliente = cliente_id
    try:
        return await ClienteJuridicaService.create(db, cliente_juridico)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al crear cliente jurídico: {str(e)}"
        )


@router.get("/{cliente_id}", response_model=ClienteJuridicaRead)
async def obtener_cliente_juridico(
    cliente_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener datos de persona jurídica de un cliente."""
    cliente = await ClienteJuridicaService.get(db, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente jurídico no encontrado")
    return cliente


@router.put("/{cliente_id}", response_model=ClienteJuridicaRead)
async def actualizar_cliente_juridico(
    cliente_id: int,
    update_data: ClienteJuridicaUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar datos de persona jurídica de un cliente."""
    try:
        cliente = await ClienteJuridicaService.update(db, cliente_id, update_data)
        if not cliente:
            raise HTTPException(
                status_code=404, detail="Cliente jurídico no encontrado"
            )
        return cliente
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar cliente jurídico: {str(e)}"
        )


@router.delete("/{cliente_id}", status_code=204)
async def eliminar_cliente_juridico(
    cliente_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar datos de persona jurídica de un cliente."""
    try:
        success = await ClienteJuridicaService.delete(db, cliente_id)
        if not success:
            raise HTTPException(
                status_code=404, detail="Cliente jurídico no encontrado"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar cliente jurídico: {str(e)}"
        )
