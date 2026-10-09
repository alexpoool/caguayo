import logging
from typing import List, Optional
from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    Query,
    Request,
)
from sqlmodel.ext.asyncio.session import AsyncSession
from src.database.connection import get_session
from src.services.contrato_service import TipoContratoService, EstadoContratoService
from src.services.proveedor_convenio_service import (
    TipoClienteService,
    TipoConvenioService,
    TipoProveedorService,
)
from src.services.tipo_dependencia_service import tipo_dependencia_service
from src.services import especialidad_service, migracion_service
from src.dto import (
    EstadoMigracion,
    FicheroLegacyInfo,
    FicherosSubidos,
    InformeMigracion,
    TipoContratoCreate,
    TipoContratoRead,
    TipoContratoUpdate,
    EstadoContratoCreate,
    EstadoContratoRead,
    EstadoContratoUpdate,
    TipoClienteCreate,
    TipoClienteRead,
    TipoClienteUpdate,
    TipoProveedorCreate,
    TipoProveedorRead,
    TipoProveedorUpdate,
    TipoConvenioCreate,
    TipoConvenioRead,
    TipoConvenioUpdate,
    EspecialidadCreate,
    EspecialidadRead,
    EspecialidadUpdate,
    TipoDependenciaCreate,
    TipoDependenciaRead,
    TipoDependenciaUpdate,
)

router = APIRouter(
    prefix="/configuracion", tags=["configuracion"], redirect_slashes=False
)

logger = logging.getLogger(__name__)


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


# Endpoints para Tipos de Proveedores
@router.get("/tipos-proveedores", response_model=List[TipoProveedorRead])
async def listar_tipos_proveedor2(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    return await TipoProveedorService.get_all(db, skip=skip, limit=limit)


@router.post("/tipos-proveedores", response_model=TipoProveedorRead, status_code=201)
async def crear_tipo_proveedor2(
    data: TipoProveedorCreate,
    db: AsyncSession = Depends(get_session),
):
    return await TipoProveedorService.create(db, data)


@router.get("/tipos-proveedores/{tipo_id}", response_model=TipoProveedorRead)
async def obtener_tipo_proveedor2(
    tipo_id: int,
    db: AsyncSession = Depends(get_session),
):
    result = await TipoProveedorService.get(db, tipo_id)
    if not result:
        raise HTTPException(status_code=404, detail="Tipo de proveedor no encontrado")
    return result


@router.put("/tipos-proveedores/{tipo_id}", response_model=TipoProveedorRead)
async def actualizar_tipo_proveedor2(
    tipo_id: int,
    data: TipoProveedorUpdate,
    db: AsyncSession = Depends(get_session),
):
    result = await TipoProveedorService.update(db, tipo_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Tipo de proveedor no encontrado")
    return result


@router.delete("/tipos-proveedores/{tipo_id}", status_code=204)
async def eliminar_tipo_proveedor2(
    tipo_id: int,
    db: AsyncSession = Depends(get_session),
):
    success = await TipoProveedorService.delete(db, tipo_id)
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
    return await tipo_dependencia_service.get_multi(db, skip=skip, limit=limit)


@router.post("/tipos-dependencia", response_model=TipoDependenciaRead, status_code=201)
async def crear_tipo_dependencia(
    data: TipoDependenciaCreate,
    db: AsyncSession = Depends(get_session),
):
    db_obj = await tipo_dependencia_service.create(db, data)

    from src.services.replicacion_service import ReplicacionService

    ReplicacionService.replicar_tipo_dependencia(
        {
            "id_tipo_dependencia": db_obj.id_tipo_dependencia,
            "nombre": db_obj.nombre,
            "descripcion": db_obj.descripcion,
        },
        "INSERT",
    )

    return db_obj


@router.get("/tipos-dependencia/{tipo_id}", response_model=TipoDependenciaRead)
async def obtener_tipo_dependencia(
    tipo_id: int,
    db: AsyncSession = Depends(get_session),
):
    result = await tipo_dependencia_service.get(db, tipo_id)
    if not result:
        raise HTTPException(status_code=404, detail="Tipo de dependencia no encontrado")
    return result


@router.put("/tipos-dependencia/{tipo_id}", response_model=TipoDependenciaRead)
async def actualizar_tipo_dependencia(
    tipo_id: int,
    data: TipoDependenciaUpdate,
    db: AsyncSession = Depends(get_session),
):
    result = await tipo_dependencia_service.update(db, tipo_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Tipo de dependencia no encontrado")
    return result


@router.delete("/tipos-dependencia/{tipo_id}", status_code=204)
async def eliminar_tipo_dependencia(
    tipo_id: int,
    db: AsyncSession = Depends(get_session),
):
    success = await tipo_dependencia_service.delete(db, tipo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tipo de dependencia no encontrado")


# --- Especialidades del artista -------------------------------------------
#
# Sin DELETE duro a propósito: la FK de clientes_persona_natural es
# ON DELETE SET NULL, así que borrar una especialidad en uso vaciaría en
# silencio el campo de todos sus artistas. DELETE desactiva; PUT reactiva.

@router.get("/especialidades", response_model=List[EspecialidadRead])
async def listar_especialidades(
    solo_activas: bool = Query(
        False, description="Omitir las especialidades desactivadas"
    ),
    db: AsyncSession = Depends(get_session),
):
    return await especialidad_service.get_all(db, solo_activas=solo_activas)


@router.post("/especialidades", response_model=EspecialidadRead, status_code=201)
async def crear_especialidad(
    data: EspecialidadCreate,
    db: AsyncSession = Depends(get_session),
):
    return await especialidad_service.create(db, data)


@router.get("/especialidades/{especialidad_id}", response_model=EspecialidadRead)
async def obtener_especialidad(
    especialidad_id: int,
    db: AsyncSession = Depends(get_session),
):
    result = await especialidad_service.get(db, especialidad_id)
    if not result:
        raise HTTPException(status_code=404, detail="Especialidad no encontrada")
    return result


@router.put("/especialidades/{especialidad_id}", response_model=EspecialidadRead)
async def actualizar_especialidad(
    especialidad_id: int,
    data: EspecialidadUpdate,
    db: AsyncSession = Depends(get_session),
):
    result = await especialidad_service.update(db, especialidad_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Especialidad no encontrada")
    return result


@router.delete("/especialidades/{especialidad_id}", response_model=EspecialidadRead)
async def desactivar_especialidad(
    especialidad_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Desactiva la especialidad; conserva el enlace de los artistas."""
    result = await especialidad_service.desactivar(db, especialidad_id)
    if not result:
        raise HTTPException(status_code=404, detail="Especialidad no encontrada")
    return result


@router.post("/especialidades/{especialidad_id}/reactivar", response_model=EspecialidadRead)
async def reactivar_especialidad(
    especialidad_id: int,
    db: AsyncSession = Depends(get_session),
):
    result = await especialidad_service.reactivar(db, especialidad_id)
    if not result:
        raise HTTPException(status_code=404, detail="Especialidad no encontrada")
    return result


# --- Migración del legacy --------------------------------------------------
#
# El legacy está en dos bases distintas, así que se suben dos ficheros. El
# comercial no tiene ni una fila de tipo_convenio, así que con el primero solo
# no se puede migrar todo.
#
# Nada de esto borra datos: se limita a lanzar el ETL, que es idempotente. Si la
# base ya está migrada, sale con 0 inserciones.

@router.get("/migracion/estado", response_model=EstadoMigracion)
async def estado_migracion(db: AsyncSession = Depends(get_session)):
    """Recuentos, salud de la base y qué ficheros hay subidos."""
    return await migracion_service.estado(db)


@router.get("/migracion/fichero", response_model=FicherosSubidos)
async def listar_ficheros():
    return {"ficheros": migracion_service.ficheros_subidos()}


@router.post("/migracion/fichero", response_model=FicheroLegacyInfo)
async def subir_fichero(
    rol: str = Query(..., description="comercial | principal"),
    x_nombre_fichero: Optional[str] = Header(None, alias="X-Nombre-Fichero"),
    request: Request = None,
):
    """Recibe los bytes crudos del fichero.

    Se leen con `request.body()` y no con `UploadFile` a propósito: el backend
    no tiene python-multipart y esta forma no lo necesita.
    """
    crudo = await request.body()
    info = migracion_service.guardar_fichero(rol, crudo)
    if x_nombre_fichero:
        logger.info("Migración: fichero '%s' subido para el rol %s",
                    x_nombre_fichero, rol)
    return info


@router.delete("/migracion/fichero", status_code=204)
async def quitar_fichero(rol: str = Query(...)):
    migracion_service.quitar_fichero(rol)


@router.post("/migracion/analizar", response_model=InformeMigracion)
async def analizar_migracion(db: AsyncSession = Depends(get_session)):
    """Corre el ETL en seco. No escribe nada. Habilita el botón de ejecutar."""
    return await migracion_service.migrar(db, commit=False)


@router.post("/migracion/ejecutar", response_model=InformeMigracion)
async def ejecutar_migracion(db: AsyncSession = Depends(get_session)):
    """Corre el ETL con --commit. Sólo insertar, nunca borra."""
    return await migracion_service.migrar(db, commit=True)
