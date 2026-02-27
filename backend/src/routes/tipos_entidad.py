from typing import List
from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.models import TipoEntidad
from sqlmodel import select

router = APIRouter(
    prefix="/tipos-entidad", tags=["tipos-entidad"], redirect_slashes=False
)


@router.get("", response_model=List[dict])
async def listar_tipos_entidad(
    db: AsyncSession = Depends(get_session),
):
    """Listar todos los tipos de entidad."""
    statement = select(TipoEntidad)
    results = await db.exec(statement)
    tipos = results.all()
    return [{"id_tipo_entidad": t.id_tipo_entidad, "nombre": t.nombre} for t in tipos]
