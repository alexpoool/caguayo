import logging
from typing import Optional
from fastapi import Header, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from src.database.connection import (
    get_session,
    _current_db,
    _get_engine_for_db,
)
from src.services.auth_service import (
    decode_token,
    get_current_user,
    get_funcionalidades_by_token,
)

logger = logging.getLogger(__name__)


def _sessionmaker_for_current_db():
    """Crea un sessionmaker para la BD del request actual (igual que get_session).

    Antes se usaba una sesión fija a AUTH_DATABASE, lo que impedía resolver
    correctamente la dependencia/denominación del usuario en la BD correcta.
    """
    return sessionmaker(
        _get_engine_for_db(_current_db.get()), class_=AsyncSession, expire_on_commit=False
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
    async with _sessionmaker_for_current_db()() as auth_db:
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
    async with _sessionmaker_for_current_db()() as auth_db:
        usuario = await auth_db.get(Usuario, int(usuario_id))
        if not usuario or not usuario.id_dependencia:
            return None
        dependencia = await auth_db.get(Dependencia, usuario.id_dependencia)
        if dependencia:
            prefijo = (dependencia.denominacion or "").strip()
            if not prefijo:
                prefijo = (dependencia.nit or "").strip()
            if not prefijo:
                prefijo = (dependencia.nombre or "").strip()[:3].upper()
            return prefijo or None
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
    async with _sessionmaker_for_current_db()() as auth_db:
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


async def verify_auth_token_only(
    authorization: Optional[str] = Header(None),
) -> dict:
    """FastAPI dependency: sólo valida el token, SIN abrir sesión en la BD.

    Para endpoints de polling de alta frecuencia (estado de jobs) que no deben
    crear conexiones contra la BD tenant del request: durante el swap de un
    restore la BD debe quedarse sin conexiones, y cada request autenticado
    normal (`verify_auth` / `require_funcionalidad`) re-abriría una sesión
    contra ella y bloquearía el RENAME.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="No autorizado: token no proporcionado o formato inválido",
        )
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(401, detail="No autorizado: token inválido o expirado")
    return {"id_usuario": payload.get("sub"), "alias": payload.get("alias")}


def require_funcionalidad(nombre_funcionalidad: str):
    """Fábrica de dependency que exige autenticación + una funcionalidad.

    Además del 401 de verify_auth, devuelve 403 si el grupo del usuario no
    tiene la funcionalidad pedida (p. ej. 'backups').

    Uso:
        @router.get(...)
        def endpoint(
            usuario: dict = Depends(require_funcionalidad("backups")),
            ...
        ):
    """
    async def _dependency(
        authorization: Optional[str] = Header(None),
        db: AsyncSession = Depends(get_session),
    ) -> dict:
        usuario = await verify_auth(authorization, db)
        token = authorization.replace("Bearer ", "")  # verify_auth garantiza formato
        funcionalidades = await get_funcionalidades_by_token(db, token)
        nombres = {f.nombre for f in funcionalidades}
        if nombre_funcionalidad not in nombres:
            raise HTTPException(
                status_code=403,
                detail=f"No autorizado: se requiere la funcionalidad '{nombre_funcionalidad}'",
            )
        return usuario

    return _dependency
