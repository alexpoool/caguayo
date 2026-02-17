from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload
from src.database.connection import get_session
from src.models import Provedor, Convenio, Anexo
from src.dto import ProvedorRead, ConvenioRead, AnexoRead
from sqlmodel import select

router = APIRouter(prefix="/provedores", tags=["provedores"], redirect_slashes=False)


@router.get("", response_model=List[ProvedorRead])
async def listar_provedores(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: str = Query(None, description="Buscar por nombre"),
    db: AsyncSession = Depends(get_session),
):
    """Listar proveedores con opción de búsqueda."""
    statement = select(Provedor).options(selectinload(Provedor.tipo_provedor))
    if search:
        statement = statement.where(Provedor.nombre.ilike(f"%{search}%"))
    statement = statement.offset(skip).limit(limit)
    results = await db.exec(statement)
    provedores = results.all()
    return [ProvedorRead.from_orm(p) for p in provedores]


@router.get("/{provedor_id}", response_model=ProvedorRead)
async def obtener_provedor(
    provedor_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener un proveedor por ID."""
    statement = select(Provedor).where(Provedor.id_provedores == provedor_id)
    results = await db.exec(statement)
    provedor = results.first()
    if not provedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return ProvedorRead.from_orm(provedor)


@router.get("/{provedor_id}/convenios", response_model=List[ConvenioRead])
async def listar_convenios_provedor(
    provedor_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Listar convenios de un proveedor."""
    statement = select(Convenio).where(Convenio.id_provedor == provedor_id)
    results = await db.exec(statement)
    convenios = results.all()
    return [ConvenioRead.from_orm(c) for c in convenios]
