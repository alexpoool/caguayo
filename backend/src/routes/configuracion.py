from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.services.contrato_service import TipoContratoService, EstadoContratoService
from src.services.proveedor_convenio_service import (
    TipoClienteService,
    TipoConvenioService,
)
from src.services.tipo_dependencia_service import TipoDependenciaService
from src.services.tipo_cuenta_service import TipoCuentaService
from src.dto import (
    TipoContratoCreate,
    TipoContratoRead,
    TipoContratoUpdate,
    EstadoContratoCreate,
    EstadoContratoRead,
    EstadoContratoUpdate,
    TipoClienteCreate,
    TipoClienteRead,
    TipoClienteUpdate,
    TipoConvenioCreate,
    TipoConvenioRead,
    TipoConvenioUpdate,
    TipoDependenciaCreate,
    TipoDependenciaRead,
    TipoDependenciaUpdate,
    TipoCuentaCreate,
    TipoCuentaRead,
    TipoCuentaUpdate,
)

router = APIRouter(
    prefix="/configuracion", tags=["configuracion"], redirect_slashes=False
)


@router.get("/tipos-contrato", response_model=List[TipoContratoRead])
async def listar_tipos_contrato(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    return await TipoContratoService.get_all(db, skip=skip, limit=limit)


@router.post("/tipos-contrato", response_model=TipoContratoRead, status_code=201)
async def crear_tipo_contrato(
    data: TipoContratoCreate,
    db: AsyncSession = Depends(get_session),
):
    return await TipoContratoService.create(db, data)


@router.get("/tipos-contrato/{tipo_id}", response_model=TipoContratoRead)
async def obtener_tipo_contrato(
    tipo_id: int,
    db: AsyncSession = Depends(get_session),
):
    result = await TipoContratoService.get(db, tipo_id)
    if not result:
        raise HTTPException(status_code=404, detail="Tipo de contrato no encontrado")
    return result


@router.put("/tipos-contrato/{tipo_id}", response_model=TipoContratoRead)
async def actualizar_tipo_contrato(
    tipo_id: int,
    data: TipoContratoUpdate,
    db: AsyncSession = Depends(get_session),
):
    result = await TipoContratoService.update(db, tipo_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Tipo de contrato no encontrado")
    return result


@router.delete("/tipos-contrato/{tipo_id}", status_code=204)
async def eliminar_tipo_contrato(
    tipo_id: int,
    db: AsyncSession = Depends(get_session),
):
    success = await TipoContratoService.delete(db, tipo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tipo de contrato no encontrado")


@router.get("/estados-contrato", response_model=List[EstadoContratoRead])
async def listar_estados_contrato(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    return await EstadoContratoService.get_all(db, skip=skip, limit=limit)


@router.post("/estados-contrato", response_model=EstadoContratoRead, status_code=201)
async def crear_estado_contrato(
    data: EstadoContratoCreate,
    db: AsyncSession = Depends(get_session),
):
    return await EstadoContratoService.create(db, data)


@router.get("/estados-contrato/{estado_id}", response_model=EstadoContratoRead)
async def obtener_estado_contrato(
    estado_id: int,
    db: AsyncSession = Depends(get_session),
):
    result = await EstadoContratoService.get(db, estado_id)
    if not result:
        raise HTTPException(status_code=404, detail="Estado de contrato no encontrado")
    return result


@router.put("/estados-contrato/{estado_id}", response_model=EstadoContratoRead)
async def actualizar_estado_contrato(
    estado_id: int,
    data: EstadoContratoUpdate,
    db: AsyncSession = Depends(get_session),
):
    result = await EstadoContratoService.update(db, estado_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Estado de contrato no encontrado")
    return result


@router.delete("/estados-contrato/{estado_id}", status_code=204)
async def eliminar_estado_contrato(
    estado_id: int,
    db: AsyncSession = Depends(get_session),
):
    success = await EstadoContratoService.delete(db, estado_id)
    if not success:
        raise HTTPException(status_code=404, detail="Estado de contrato no encontrado")


# Endpoints para Tipos de Proveedores
@router.get("/tipos-clientes", response_model=List[TipoClienteRead])
async def listar_tipos_proveedor(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    return await TipoClienteService.get_all(db, skip=skip, limit=limit)


@router.post("/tipos-clientes", response_model=TipoClienteRead, status_code=201)
async def crear_tipo_proveedor(
    data: TipoClienteCreate,
    db: AsyncSession = Depends(get_session),
):
    return await TipoClienteService.create(db, data)


@router.get("/tipos-clientes/{tipo_id}", response_model=TipoClienteRead)
async def obtener_tipo_proveedor(
    tipo_id: int,
    db: AsyncSession = Depends(get_session),
):
    result = await TipoClienteService.get(db, tipo_id)
    if not result:
        raise HTTPException(status_code=404, detail="Tipo de proveedor no encontrado")
    return result


@router.put("/tipos-clientes/{tipo_id}", response_model=TipoClienteRead)
async def actualizar_tipo_proveedor(
    tipo_id: int,
    data: TipoClienteUpdate,
    db: AsyncSession = Depends(get_session),
):
    result = await TipoClienteService.update(db, tipo_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Tipo de proveedor no encontrado")
    return result


@router.delete("/tipos-clientes/{tipo_id}", status_code=204)
async def eliminar_tipo_proveedor(
    tipo_id: int,
    db: AsyncSession = Depends(get_session),
):
    success = await TipoClienteService.delete(db, tipo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tipo de proveedor no encontrado")


# Endpoints para Tipos de Convenios
@router.get("/tipos-convenios", response_model=List[TipoConvenioRead])
async def listar_tipos_convenio(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    return await TipoConvenioService.get_all(db, skip=skip, limit=limit)


@router.post("/tipos-convenios", response_model=TipoConvenioRead, status_code=201)
async def crear_tipo_convenio(
    data: TipoConvenioCreate,
    db: AsyncSession = Depends(get_session),
):
    return await TipoConvenioService.create(db, data)


@router.get("/tipos-convenios/{tipo_id}", response_model=TipoConvenioRead)
async def obtener_tipo_convenio(
    tipo_id: int,
    db: AsyncSession = Depends(get_session),
):
    result = await TipoConvenioService.get(db, tipo_id)
    if not result:
        raise HTTPException(status_code=404, detail="Tipo de convenio no encontrado")
    return result


@router.put("/tipos-convenios/{tipo_id}", response_model=TipoConvenioRead)
async def actualizar_tipo_convenio(
    tipo_id: int,
    data: TipoConvenioUpdate,
    db: AsyncSession = Depends(get_session),
):
    result = await TipoConvenioService.update(db, tipo_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Tipo de convenio no encontrado")
    return result


@router.delete("/tipos-convenios/{tipo_id}", status_code=204)
async def eliminar_tipo_convenio(
    tipo_id: int,
    db: AsyncSession = Depends(get_session),
):
    success = await TipoConvenioService.delete(db, tipo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tipo de convenio no encontrado")


# Endpoints para Tipos de Dependencia
@router.get("/tipos-dependencia", response_model=List[TipoDependenciaRead])
async def listar_tipos_dependencia(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    return await TipoDependenciaService.get_all(db, skip=skip, limit=limit)


@router.post("/tipos-dependencia", response_model=TipoDependenciaRead, status_code=201)
async def crear_tipo_dependencia(
    data: TipoDependenciaCreate,
    db: AsyncSession = Depends(get_session),
):
    return await TipoDependenciaService.create(db, data)


@router.get("/tipos-dependencia/{tipo_id}", response_model=TipoDependenciaRead)
async def obtener_tipo_dependencia(
    tipo_id: int,
    db: AsyncSession = Depends(get_session),
):
    result = await TipoDependenciaService.get(db, tipo_id)
    if not result:
        raise HTTPException(status_code=404, detail="Tipo de dependencia no encontrado")
    return result


@router.put("/tipos-dependencia/{tipo_id}", response_model=TipoDependenciaRead)
async def actualizar_tipo_dependencia(
    tipo_id: int,
    data: TipoDependenciaUpdate,
    db: AsyncSession = Depends(get_session),
):
    result = await TipoDependenciaService.update(db, tipo_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Tipo de dependencia no encontrado")
    return result


@router.delete("/tipos-dependencia/{tipo_id}", status_code=204)
async def eliminar_tipo_dependencia(
    tipo_id: int,
    db: AsyncSession = Depends(get_session),
):
    success = await TipoDependenciaService.delete(db, tipo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tipo de dependencia no encontrado")


# Endpoints para Tipos de Cuenta
@router.get("/tipos-cuenta", response_model=List[TipoCuentaRead])
async def listar_tipos_cuenta(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    return await TipoCuentaService.get_all(db, skip=skip, limit=limit)


@router.post("/tipos-cuenta", response_model=TipoCuentaRead, status_code=201)
async def crear_tipo_cuenta(
    data: TipoCuentaCreate,
    db: AsyncSession = Depends(get_session),
):
    return await TipoCuentaService.create(db, data)


@router.get("/tipos-cuenta/{tipo_id}", response_model=TipoCuentaRead)
async def obtener_tipo_cuenta(
    tipo_id: int,
    db: AsyncSession = Depends(get_session),
):
    result = await TipoCuentaService.get(db, tipo_id)
    if not result:
        raise HTTPException(status_code=404, detail="Tipo de cuenta no encontrado")
    return result


@router.put("/tipos-cuenta/{tipo_id}", response_model=TipoCuentaRead)
async def actualizar_tipo_cuenta(
    tipo_id: int,
    data: TipoCuentaUpdate,
    db: AsyncSession = Depends(get_session),
):
    result = await TipoCuentaService.update(db, tipo_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Tipo de cuenta no encontrado")
    return result


@router.delete("/tipos-cuenta/{tipo_id}", status_code=204)
async def eliminar_tipo_cuenta(
    tipo_id: int,
    db: AsyncSession = Depends(get_session),
):
    success = await TipoCuentaService.delete(db, tipo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tipo de cuenta no encontrado")
