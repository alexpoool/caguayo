from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload
from src.database.connection import get_session
from src.models import Anexo, Dependencia, Convenio, Provedor
from src.dto import AnexoRead, DependenciaRead
from sqlmodel import select

router = APIRouter(prefix="/anexos", tags=["anexos"], redirect_slashes=False)


@router.get("", response_model=List[AnexoRead])
async def listar_anexos(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    convenio_id: int = Query(None, description="Filtrar por convenio"),
    search: str = Query(None, description="Buscar por nombre o número"),
    db: AsyncSession = Depends(get_session),
):
    """Listar anexos con opción de búsqueda y filtro por convenio."""
    statement = select(Anexo).options(
        selectinload(Anexo.convenio)
        .selectinload(Convenio.provedor)
        .selectinload(Provedor.tipo_provedor),
        selectinload(Anexo.convenio).selectinload(Convenio.tipo_convenio),
    )
    if convenio_id:
        statement = statement.where(Anexo.id_convenio == convenio_id)
    if search:
        statement = statement.where(
            (Anexo.nombre_anexo.ilike(f"%{search}%"))
            | (Anexo.numero_anexo.ilike(f"%{search}%"))
        )
    statement = statement.offset(skip).limit(limit)
    results = await db.exec(statement)
    anexos = results.all()
    return [AnexoRead.from_orm(a) for a in anexos]


@router.get("/{anexo_id}", response_model=AnexoRead)
async def obtener_anexo(
    anexo_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener un anexo por ID."""
    statement = select(Anexo).where(Anexo.id_anexo == anexo_id)
    results = await db.exec(statement)
    anexo = results.first()
    if not anexo:
        raise HTTPException(status_code=404, detail="Anexo no encontrado")
    return AnexoRead.from_orm(anexo)
