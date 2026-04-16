from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.services.cliente_service import TipoEntidadService
from src.dto import TipoEntidadCreate, TipoEntidadRead, TipoEntidadUpdate

router = APIRouter(
    prefix="/tipos-entidad", tags=["tipos-entidad"], redirect_slashes=False
)


@router.get("", response_model=List[TipoEntidadRead])
async def listar_tipos_entidad(
    db: AsyncSession = Depends(get_session),
):
    """Listar todos los tipos de entidad."""
    return await TipoEntidadService.get_all(db)


@router.post("", response_model=TipoEntidadRead, status_code=201)
async def crear_tipo_entidad(
    tipo_entidad: TipoEntidadCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear un nuevo tipo de entidad."""
    try:
        return await TipoEntidadService.create(db, tipo_entidad)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al crear tipo entidad: {str(e)}"
        )


@router.get("/{tipo_entidad_id}", response_model=TipoEntidadRead)
async def obtener_tipo_entidad(
    tipo_entidad_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener un tipo de entidad por ID."""
    tipo = await TipoEntidadService.get(db, tipo_entidad_id)
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de entidad no encontrado")
    return tipo


@router.put("/{tipo_entidad_id}", response_model=TipoEntidadRead)
async def actualizar_tipo_entidad(
    tipo_entidad_id: int,
    update_data: TipoEntidadUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar un tipo de entidad."""
    try:
        tipo = await TipoEntidadService.update(db, tipo_entidad_id, update_data)
        if not tipo:
            raise HTTPException(status_code=404, detail="Tipo de entidad no encontrado")
        return tipo
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar tipo entidad: {str(e)}"
        )


@router.delete("/{tipo_entidad_id}", status_code=204)
async def eliminar_tipo_entidad(
    tipo_entidad_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar un tipo de entidad."""
    try:
        success = await TipoEntidadService.delete(db, tipo_entidad_id)
        if not success:
            raise HTTPException(status_code=404, detail="Tipo de entidad no encontrado")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar tipo entidad: {str(e)}"
        )
