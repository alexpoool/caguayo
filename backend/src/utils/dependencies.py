import logging

from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.connection import get_session
from src.dto.auth_dto import UsuarioInfo
from src.services.auth_service import get_current_user

logger = logging.getLogger(__name__)


async def require_auth(
    authorization: str = Header(...),
    db_auth: AsyncSession = Depends(get_session),
) -> UsuarioInfo:
    """FastAPI dependency that requires a valid JWT Bearer token.

    Returns UsuarioInfo if the token is valid.
    Raises HTTPException(401) if the token is missing, malformed, invalid or expired.
    """
    if not authorization.startswith("Bearer "):
        logger.warning("Intento de acceso sin token Bearer válido")
        raise HTTPException(
            status_code=401,
            detail="Token de autenticación requerido",
        )

    token = authorization.replace("Bearer ", "")
    usuario = await get_current_user(db_auth, token)

    if not usuario:
        logger.warning("Intento de acceso con token inválido o expirado")
        raise HTTPException(
            status_code=401,
            detail="Token inválido o expirado",
        )

    return usuario
