import logging
from typing import Optional
from fastapi import Header, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.services.auth_service import get_current_user

logger = logging.getLogger(__name__)


async def _get_nit_from_token(
    authorization: Optional[str] = None,
    db: Optional[AsyncSession] = None,
) -> Optional[str]:
    """Return NIT from token. Returns None if no token provided. Does NOT raise."""
    if not authorization or not authorization.startswith("Bearer ") or not db:
        return None
    token = authorization.replace("Bearer ", "")
    usuario = await get_current_user(db, token)
    if usuario and usuario.dependencia:
        return usuario.dependencia.nit
    return None


async def verify_auth(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_session),
) -> dict:
    """FastAPI dependency: verify token and return user info. Raises 401 if invalid."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="No autorizado: token no proporcionado o formato inválido",
        )
    token = authorization.replace("Bearer ", "")
    usuario = await get_current_user(db, token)
    if not usuario:
        raise HTTPException(
            status_code=401, detail="No autorizado: token inválido o expirado"
        )
    return {
        "id_usuario": usuario.id_usuario,
        "alias": usuario.alias,
        "nombre": usuario.nombre,
        "nit": usuario.dependencia.nit if usuario.dependencia else None,
    }
