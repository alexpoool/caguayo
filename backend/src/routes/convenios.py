from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload
from src.database.connection import get_session
from src.models import Convenio, Anexo, Provedor
from src.dto import ConvenioRead, AnexoRead
from sqlmodel import select

router = APIRouter(prefix="/convenios", tags=["convenios"], redirect_slashes=False)


@router.get("", response_model=List[ConvenioRead])
async def listar_convenios(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    provedor_id: int = Query(None, description="Filtrar por proveedor"),
    search: str = Query(None, description="Buscar por nombre"),
    db: AsyncSession = Depends(get_session),
):
    """Listar convenios con opción de búsqueda y filtro por proveedor."""
    statement = select(Convenio).options(
        selectinload(Convenio.provedor).selectinload(Provedor.tipo_provedor),
        selectinload(Convenio.tipo_convenio),
    )
    if provedor_id:
        statement = statement.where(Convenio.id_provedor == provedor_id)
    if search:
        statement = statement.where(Convenio.nombre_convenio.ilike(f"%{search}%"))
    statement = statement.offset(skip).limit(limit)
    results = await db.exec(statement)
    convenios = results.all()
    return [ConvenioRead.from_orm(c) for c in convenios]


@router.get("/{convenio_id}", response_model=ConvenioRead)
async def obtener_convenio(
    convenio_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener un convenio por ID."""
    statement = select(Convenio).where(Convenio.id_convenio == convenio_id)
    results = await db.exec(statement)
    convenio = results.first()
    if not convenio:
        raise HTTPException(status_code=404, detail="Convenio no encontrado")
    return ConvenioRead.from_orm(convenio)


@router.get("/{convenio_id}/anexos", response_model=List[AnexoRead])
async def listar_anexos_convenio(
    convenio_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Listar anexos de un convenio."""
    statement = select(Anexo).where(Anexo.id_convenio == convenio_id)
    results = await db.exec(statement)
    anexos = results.all()
    return [AnexoRead.from_orm(a) for a in anexos]
