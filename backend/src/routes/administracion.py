from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from src.database.connection import get_session
from src.services.cuenta_service import CuentaService
from src.services.usuario_service import GrupoService, UsuarioService
from src.models import Funcionalidad
from src.dto import (
    CuentaCreate,
    CuentaRead,
    CuentaUpdate,
    GrupoCreate,
    GrupoRead,
    GrupoUpdate,
    FuncionalidadRead,
    UsuarioCreate,
    UsuarioRead,
    UsuarioUpdate,
)

router = APIRouter(
    prefix="/administracion", tags=["administracion"], redirect_slashes=False
)


@router.get("/cuentas", response_model=List[CuentaRead])
async def listar_cuentas(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    return await CuentaService.get_all(db, skip=skip, limit=limit)


@router.post("/cuentas", response_model=CuentaRead, status_code=201)
async def crear_cuenta(
    data: CuentaCreate,
    db: AsyncSession = Depends(get_session),
):
    return await CuentaService.create(db, data)


@router.get("/cuentas/{cuenta_id}", response_model=CuentaRead)
async def obtener_cuenta(
    cuenta_id: int,
    db: AsyncSession = Depends(get_session),
):
    result = await CuentaService.get(db, cuenta_id)
    if not result:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    return result


@router.put("/cuentas/{cuenta_id}", response_model=CuentaRead)
async def actualizar_cuenta(
    cuenta_id: int,
    data: CuentaUpdate,
    db: AsyncSession = Depends(get_session),
):
    result = await CuentaService.update(db, cuenta_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    return result


@router.delete("/cuentas/{cuenta_id}", status_code=204)
async def eliminar_cuenta(
    cuenta_id: int,
    db: AsyncSession = Depends(get_session),
):
    success = await CuentaService.delete(db, cuenta_id)
    if not success:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")


@router.get("/funcionalidades", response_model=List[FuncionalidadRead])
async def listar_funcionalidades(
    db: AsyncSession = Depends(get_session),
):
    statement = select(Funcionalidad).order_by(Funcionalidad.id_funcionalidad)
    result = await db.exec(statement)
    funcionalidades = result.all()
    return [FuncionalidadRead.model_validate(f) for f in funcionalidades]


@router.get("/grupos", response_model=List[GrupoRead])
async def listar_grupos(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    return await GrupoService.get_all(db, skip=skip, limit=limit)


@router.post("/grupos", response_model=GrupoRead, status_code=201)
async def crear_grupo(
    data: GrupoCreate,
    db: AsyncSession = Depends(get_session),
):
    return await GrupoService.create(db, data)


@router.get("/grupos/{grupo_id}", response_model=GrupoRead)
async def obtener_grupo(
    grupo_id: int,
    db: AsyncSession = Depends(get_session),
):
    result = await GrupoService.get(db, grupo_id)
    if not result:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    return result


@router.put("/grupos/{grupo_id}", response_model=GrupoRead)
async def actualizar_grupo(
    grupo_id: int,
    data: GrupoUpdate,
    db: AsyncSession = Depends(get_session),
):
    result = await GrupoService.update(db, grupo_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    return result


@router.delete("/grupos/{grupo_id}", status_code=204)
async def eliminar_grupo(
    grupo_id: int,
    db: AsyncSession = Depends(get_session),
):
    success = await GrupoService.delete(db, grupo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")


@router.get("/usuarios", response_model=List[UsuarioRead])
async def listar_usuarios(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    return await UsuarioService.get_all(db, skip=skip, limit=limit)


@router.post("/usuarios", response_model=UsuarioRead, status_code=201)
async def crear_usuario(
    data: UsuarioCreate,
    db: AsyncSession = Depends(get_session),
):
    return await UsuarioService.create(db, data)


@router.get("/usuarios/{usuario_id}", response_model=UsuarioRead)
async def obtener_usuario(
    usuario_id: int,
    db: AsyncSession = Depends(get_session),
):
    result = await UsuarioService.get(db, usuario_id)
    if not result:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return result


@router.put("/usuarios/{usuario_id}", response_model=UsuarioRead)
async def actualizar_usuario(
    usuario_id: int,
    data: UsuarioUpdate,
    db: AsyncSession = Depends(get_session),
):
    result = await UsuarioService.update(db, usuario_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return result


@router.delete("/usuarios/{usuario_id}", status_code=204)
async def eliminar_usuario(
    usuario_id: int,
    db: AsyncSession = Depends(get_session),
):
    success = await UsuarioService.delete(db, usuario_id)
    if not success:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
