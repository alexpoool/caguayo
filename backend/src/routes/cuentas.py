from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.services.cliente_service import CuentaService
from src.dto import CuentaCreate, CuentaRead, CuentaUpdate

router = APIRouter(prefix="/cuentas", tags=["cuentas"], redirect_slashes=False)


@router.get("", response_model=List[CuentaRead])
async def listar_cuentas(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    """Listar todas las cuentas."""
    return await CuentaService.get_all(db, skip=skip, limit=limit)


@router.get("/by-cliente/{id_cliente}", response_model=List[CuentaRead])
async def obtener_cuentas_por_cliente(
    id_cliente: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener cuentas por ID de cliente."""
    return await CuentaService.get_by_cliente(db, id_cliente)


@router.post("", response_model=CuentaRead, status_code=201)
async def crear_cuenta(
    cuenta: CuentaCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear una cuenta."""
    try:
        return await CuentaService.create(db, cuenta)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear cuenta: {str(e)}")


@router.get("/{cuenta_id}", response_model=CuentaRead)
async def obtener_cuenta(
    cuenta_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener una cuenta por ID."""
    cuenta = await CuentaService.get(db, cuenta_id)
    if not cuenta:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    return cuenta


@router.put("/{cuenta_id}", response_model=CuentaRead)
async def actualizar_cuenta(
    cuenta_id: int,
    update_data: CuentaUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar una cuenta."""
    try:
        cuenta = await CuentaService.update(db, cuenta_id, update_data)
        if not cuenta:
            raise HTTPException(status_code=404, detail="Cuenta no encontrada")
        return cuenta
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar cuenta: {str(e)}"
        )


@router.delete("/{cuenta_id}", status_code=204)
async def eliminar_cuenta(
    cuenta_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar una cuenta."""
    try:
        success = await CuentaService.delete(db, cuenta_id)
        if not success:
            raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar cuenta: {str(e)}"
        )
