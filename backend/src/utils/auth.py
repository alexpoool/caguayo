from typing import Optional
from sqlmodel.ext.asyncio.session import AsyncSession
from src.services.auth_service import get_current_user


async def _get_nit_from_token(
    authorization: Optional[str] = None,
    db_auth: Optional[AsyncSession] = None,
) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer ") or not db_auth:
        return None
    token = authorization.replace("Bearer ", "")
    usuario = await get_current_user(db_auth, token)
    if usuario and usuario.dependencia:
        return usuario.dependencia.nit
    return None
