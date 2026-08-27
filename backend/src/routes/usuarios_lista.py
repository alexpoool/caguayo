import os
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from jose import jwt
import bcrypt
from sqlalchemy.exc import IntegrityError

from src.database.connection import get_session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/usuarios-lista", tags=["usuarios-lista"])

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is required")


def _verify_token(authorization: str | None) -> dict:
    """Verifica el token JWT y retorna el payload."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autorizado")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    return payload


def _get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# ─── DTOs ────────────────────────────────────────────────────────────────────


class UsuarioListaResponse(BaseModel):
    id_usuario: int
    ci: str
    nombre: str
    primer_apellido: str
    segundo_apellido: str | None = None
    alias: str
    contrasenia: str
    contrasenia_plana: str | None = None
    cargo: str | None = None
    id_grupo: int | None = None
    id_dependencia: int | None = None
    grupo_nombre: str | None = None
    dependencia_nombre: str | None = None


class UsuarioCreateRequest(BaseModel):
    ci: str
    nombre: str
    primer_apellido: str
    segundo_apellido: str | None = None
    alias: str
    contrasenia: str
    cargo: str | None = None
    id_grupo: int
    id_dependencia: int | None = None


class UsuarioUpdateRequest(BaseModel):
    ci: str | None = None
    nombre: str | None = None
    primer_apellido: str | None = None
    segundo_apellido: str | None = None
    alias: str | None = None
    contrasenia: str | None = None
    cargo: str | None = None
    id_grupo: int | None = None
    id_dependencia: int | None = None


class DependenciaInfo(BaseModel):
    id_dependencia: int
    nombre: str


class GrupoInfo(BaseModel):
    id_grupo: int
    nombre: str


# ─── Endpoints API ───────────────────────────────────────────────────────────


@router.get("", response_model=List[UsuarioListaResponse])
async def listar_usuarios(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Lista todos los usuarios de la base de datos actual."""
    _verify_token(authorization)

    from src.models import Usuario

    statement = select(Usuario).order_by(Usuario.alias)
    results = await db.exec(statement)
    usuarios = results.all()

    # Pre-load grupos and dependencias for name resolution
    grupos_map: dict[int, str] = {}
    dependencias_map: dict[int, str] = {}
    if usuarios:
        grupo_ids = {u.id_grupo for u in usuarios if u.id_grupo}
        dep_ids = {u.id_dependencia for u in usuarios if u.id_dependencia}
        if grupo_ids:
            from src.models import Grupo
            g_stmt = select(Grupo).where(Grupo.id_grupo.in_(grupo_ids))
            g_res = await db.exec(g_stmt)
            grupos_map = {g.id_grupo: g.nombre for g in g_res.all()}
        if dep_ids:
            from src.models import Dependencia
            d_stmt = select(Dependencia).where(Dependencia.id_dependencia.in_(dep_ids))
            d_res = await db.exec(d_stmt)
            dependencias_map = {d.id_dependencia: d.nombre for d in d_res.all()}

    return [
        UsuarioListaResponse(
            id_usuario=u.id_usuario,
            ci=u.ci,
            nombre=u.nombre,
            primer_apellido=u.primer_apellido,
            segundo_apellido=u.segundo_apellido,
            alias=u.alias,
            contrasenia=u.contrasenia,
            contrasenia_plana=u.contrasenia_plana,
            cargo=u.cargo,
            id_grupo=u.id_grupo,
            id_dependencia=u.id_dependencia,
            grupo_nombre=grupos_map.get(u.id_grupo) if u.id_grupo else None,
            dependencia_nombre=dependencias_map.get(u.id_dependencia) if u.id_dependencia else None,
        )
        for u in usuarios
    ]


@router.get("/dependencias", response_model=List[DependenciaInfo])
async def listar_dependencias(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Lista las dependencias disponibles."""
    _verify_token(authorization)

    from src.models import Dependencia

    statement = select(Dependencia).order_by(Dependencia.nombre)
    results = await db.exec(statement)
    dependencias = results.all()

    return [
        DependenciaInfo(id_dependencia=d.id_dependencia, nombre=d.nombre)
        for d in dependencias
    ]


@router.get("/grupos", response_model=List[GrupoInfo])
async def listar_grupos(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Lista los grupos disponibles."""
    _verify_token(authorization)

    from src.models import Grupo

    statement = select(Grupo).order_by(Grupo.nombre)
    results = await db.exec(statement)
    grupos = results.all()

    return [
        GrupoInfo(id_grupo=g.id_grupo, nombre=g.nombre)
        for g in grupos
    ]


@router.post("", response_model=UsuarioListaResponse, status_code=201)
async def crear_usuario(
    data: UsuarioCreateRequest,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Crea un nuevo usuario en la base de datos actual."""
    _verify_token(authorization)

    from src.models import Usuario

    # Verificar que el alias no exista
    statement = select(Usuario).where(Usuario.alias == data.alias)
    results = await db.exec(statement)
    if results.first():
        raise HTTPException(status_code=400, detail="El alias ya existe")

    # Verificar que la CI no exista
    statement = select(Usuario).where(Usuario.ci == data.ci)
    results = await db.exec(statement)
    if results.first():
        raise HTTPException(status_code=400, detail="La cédula de identidad ya existe")

    hashed_password = _get_password_hash(data.contrasenia)

    usuario = Usuario(
        ci=data.ci,
        nombre=data.nombre,
        primer_apellido=data.primer_apellido,
        segundo_apellido=data.segundo_apellido,
        alias=data.alias,
        contrasenia=hashed_password,
        contrasenia_plana=data.contrasenia,
        cargo=data.cargo,
        id_grupo=data.id_grupo,
        id_dependencia=data.id_dependencia,
    )

    db.add(usuario)

    try:
        await db.commit()
        await db.refresh(usuario)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Error al crear el usuario (datos duplicados)")

    return UsuarioListaResponse(
        id_usuario=usuario.id_usuario,
        ci=usuario.ci,
        nombre=usuario.nombre,
        primer_apellido=usuario.primer_apellido,
        segundo_apellido=usuario.segundo_apellido,
        alias=usuario.alias,
        contrasenia=usuario.contrasenia,
        contrasenia_plana=usuario.contrasenia_plana,
        cargo=usuario.cargo,
        id_grupo=usuario.id_grupo,
        id_dependencia=usuario.id_dependencia,
    )


@router.put("/{id_usuario}", response_model=UsuarioListaResponse)
async def actualizar_usuario(
    id_usuario: int,
    data: UsuarioUpdateRequest,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Actualiza un usuario existente."""
    _verify_token(authorization)

    from src.models import Usuario

    usuario = await db.get(Usuario, id_usuario)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Verificar alias único si se cambia
    if data.alias and data.alias != usuario.alias:
        statement = select(Usuario).where(Usuario.alias == data.alias)
        results = await db.exec(statement)
        if results.first():
            raise HTTPException(status_code=400, detail="El alias ya está en uso")

    # Verificar CI único si se cambia
    if data.ci and data.ci != usuario.ci:
        statement = select(Usuario).where(Usuario.ci == data.ci)
        results = await db.exec(statement)
        if results.first():
            raise HTTPException(status_code=400, detail="La cédula de identidad ya existe")

    if data.ci is not None:
        usuario.ci = data.ci
    if data.nombre is not None:
        usuario.nombre = data.nombre
    if data.primer_apellido is not None:
        usuario.primer_apellido = data.primer_apellido
    if data.segundo_apellido is not None:
        usuario.segundo_apellido = data.segundo_apellido
    if data.alias is not None:
        usuario.alias = data.alias
    if data.cargo is not None:
        usuario.cargo = data.cargo
    if data.id_grupo is not None:
        usuario.id_grupo = data.id_grupo
    if data.id_dependencia is not None:
        usuario.id_dependencia = data.id_dependencia

    # Solo hashear si se envió contraseña nueva
    if data.contrasenia:
        usuario.contrasenia = _get_password_hash(data.contrasenia)
        usuario.contrasenia_plana = data.contrasenia

    try:
        await db.commit()
        await db.refresh(usuario)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Error al actualizar el usuario")

    return UsuarioListaResponse(
        id_usuario=usuario.id_usuario,
        ci=usuario.ci,
        nombre=usuario.nombre,
        primer_apellido=usuario.primer_apellido,
        segundo_apellido=usuario.segundo_apellido,
        alias=usuario.alias,
        contrasenia=usuario.contrasenia,
        contrasenia_plana=usuario.contrasenia_plana,
        cargo=usuario.cargo,
        id_grupo=usuario.id_grupo,
        id_dependencia=usuario.id_dependencia,
    )


@router.delete("/{id_usuario}")
async def eliminar_usuario(
    id_usuario: int,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_session),
):
    """Elimina un usuario."""
    _verify_token(authorization)

    from src.models import Usuario

    usuario = await db.get(Usuario, id_usuario)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    await db.delete(usuario)
    await db.commit()

    return {"message": "Usuario eliminado exitosamente"}
