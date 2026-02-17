from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.models import Dependencia
from src.dto import DependenciaRead
from sqlmodel import select

router = APIRouter(
    prefix="/dependencias", tags=["dependencias"], redirect_slashes=False
)


@router.get("", response_model=List[DependenciaRead])
async def listar_dependencias(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: str = Query(None, description="Buscar por nombre"),
    db: AsyncSession = Depends(get_session),
):
    """Listar dependencias con opción de búsqueda."""
    statement = select(Dependencia)
    if search:
        statement = statement.where(Dependencia.nombre.ilike(f"%{search}%"))
    statement = statement.offset(skip).limit(limit)
    results = await db.exec(statement)
    dependencias = results.all()
    return [DependenciaRead.from_orm(d) for d in dependencias]


@router.get("/{dependencia_id}", response_model=DependenciaRead)
async def obtener_dependencia(
    dependencia_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener una dependencia por ID."""
    statement = select(Dependencia).where(Dependencia.id_dependencia == dependencia_id)
    results = await db.exec(statement)
    dependencia = results.first()
    if not dependencia:
        raise HTTPException(status_code=404, detail="Dependencia no encontrada")
    return DependenciaRead.from_orm(dependencia)
