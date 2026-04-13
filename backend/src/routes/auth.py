import os
from typing import List

from fastapi import APIRouter, Depends, Header, HTTPException
from jose import jwt
from sqlmodel.ext.asyncio.session import AsyncSession

from src.database.connection import get_auth_session, get_session
from src.dto.auth_dto import (
    DependenciaInfo,
    FuncionalidadInfo,
    LoginRequest,
    LoginResponse,
    PerfilResponse,
    PerfilUpdateRequest,
    RegisterRequest,
)
from src.services import auth_service

router = APIRouter(prefix="/auth", tags=["autenticacion"])

SECRET_KEY = os.getenv("SECRET_KEY", "caguayo-secret-key-change-in-production")


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_auth_session),
):
    """Iniciar sesión en el sistema"""
    result = await auth_service.login(db, login_data)
    if not result:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    return result


@router.post("/register", response_model=LoginResponse)
async def register(
    register_data: RegisterRequest,
    db: AsyncSession = Depends(get_auth_session),
):
    """Registrar un nuevo usuario en una base de datos"""
    result = await auth_service.register(db, register_data)
    if not result:
        raise HTTPException(
            status_code=400,
            detail="No se pudo registrar el usuario. El alias ya existe o la dependencia no es válida.",
        )
    return result


@router.post("/logout")
async def logout(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_auth_session),
):
    """Cerrar sesión"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autorizado")

    token = authorization.replace("Bearer ", "")
    success = await auth_service.logout(db, token)

    if not success:
        raise HTTPException(status_code=400, detail="Error al cerrar sesión")

    return {"message": "Sesión cerrada exitosamente"}


@router.get("/me", response_model=LoginResponse)
async def get_current_user(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_auth_session),
):
    """Obtener información del usuario actual"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autorizado")

    token = authorization.replace("Bearer ", "")
    usuario = await auth_service.get_current_user(db, token)

    if not usuario:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    funcionalidades = await auth_service.get_funcionalidades_by_token(db, token)

    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    base_datos = payload.get("base_datos", "")

    return LoginResponse(
        token=token,
        usuario=usuario,
        funcionalidades=funcionalidades,
        base_datos=base_datos,
    )


@router.get("/funcionalidades", response_model=List[FuncionalidadInfo])
async def get_funcionalidades(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_auth_session),
):
    """Obtener funcionalidades del grupo del usuario actual"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autorizado")

    token = authorization.replace("Bearer ", "")
    funcionalidades = await auth_service.get_funcionalidades_by_token(db, token)

    return funcionalidades


@router.get("/buscar-alias/{alias}", response_model=List[DependenciaInfo])
async def buscar_alias(
    alias: str,
    db: AsyncSession = Depends(get_auth_session),
):
    """Buscar un usuario por alias y obtener sus bases de datos disponibles"""
    bases_datos = await auth_service.get_all_bases_datos_by_alias(db, alias)

    if not bases_datos:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return bases_datos


@router.put("/perfil", response_model=PerfilResponse)
async def actualizar_perfil(
    perfil_data: PerfilUpdateRequest,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_auth_session),
):
    """Actualizar perfil del usuario (alias y/o contraseña)"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autorizado")

    token = authorization.replace("Bearer ", "")
    result = await auth_service.update_perfil(db, token, perfil_data)

    if not result:
        raise HTTPException(status_code=400, detail="Error al actualizar perfil")

    return result
