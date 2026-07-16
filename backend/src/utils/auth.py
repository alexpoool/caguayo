import logging
from typing import Optional
from fastapi import Header, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from src.database.connection import get_session, AUTH_DATABASE, _get_engine_for_db
from src.services.auth_service import decode_token

logger = logging.getLogger(__name__)

_auth_async_session = sessionmaker(
    _get_engine_for_db(AUTH_DATABASE), class_=AsyncSession, expire_on_commit=False
)


async def _get_nit_from_token(
    authorization: Optional[str] = None,
) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    if not payload:
        return None
    usuario_id = payload.get("sub")
    if not usuario_id:
        return None
    from src.models.usuarios import Usuario
    from src.models.dependencia import Dependencia
    async with _auth_async_session() as auth_db:
        usuario = await auth_db.get(Usuario, int(usuario_id))
        if not usuario or not usuario.id_dependencia:
            return None
        dependencia = await auth_db.get(Dependencia, usuario.id_dependencia)
        if dependencia:
            return dependencia.nit
    return None


async def _get_denominacion_from_token(
    authorization: Optional[str] = None,
) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    if not payload:
        return None
    usuario_id = payload.get("sub")
    if not usuario_id:
        return None
    from src.models.usuarios import Usuario
    from src.models.dependencia import Dependencia
    async with _auth_async_session() as auth_db:
        usuario = await auth_db.get(Usuario, int(usuario_id))
        if not usuario or not usuario.id_dependencia:
            return None
        dependencia = await auth_db.get(Dependencia, usuario.id_dependencia)
        if dependencia:
            return dependencia.denominacion
    return None


async def _get_user_dependencia_id(
    authorization: Optional[str] = None,
) -> Optional[int]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    if not payload:
        return None
    usuario_id = payload.get("sub")
    if not usuario_id:
        return None
    from src.models.usuarios import Usuario
    async with _auth_async_session() as auth_db:
        usuario = await auth_db.get(Usuario, int(usuario_id))
        if not usuario or not usuario.id_dependencia:
            return None
        return usuario.id_dependencia
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
        "denominacion": usuario.dependencia.denominacion if usuario.dependencia else None,
    }
