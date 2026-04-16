from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import text
from sqlalchemy.orm import selectinload
from src.database.connection import get_session
from src.models import (
    Dependencia,
    TipoDependencia,
    Provincia,
    Municipio,
    Cuenta,
    CuentaDependencia,
)
from src.dto import (
    DependenciaCreate,
    DependenciaConCuentasCreate,
    DependenciaRead,
    DependenciaUpdate,
    TipoDependenciaCreate,
    TipoDependenciaRead,
    TipoDependenciaUpdate,
    ProvinciaRead,
    MunicipioRead,
    CuentaCreate,
    CuentaDependenciaCreate,
    CuentaDependenciaRead,
    CuentaDependenciaUpdate,
)
from src.services.cuenta_service import cuenta_service
from src.services.cuenta_dependencia_service import cuenta_dependencia_service
from src.services.database_service import DatabaseService
from src.repository.base import CRUDBase
from sqlmodel import select, func

router = APIRouter(
    prefix="/dependencias", tags=["dependencias"], redirect_slashes=False
)

dependencia_repo = CRUDBase[Dependencia, DependenciaCreate, DependenciaUpdate](
    Dependencia
)
tipo_dependencia_repo = CRUDBase[
    TipoDependencia, TipoDependenciaCreate, TipoDependenciaUpdate
](TipoDependencia)


async def validar_ciclo_dependencia(
    db: AsyncSession, dependencia_id: int, nuevo_padre_id: int
) -> bool:
    """
    Valida que no se cree un ciclo en la jerarquía de dependencias.
    Retorna True si hay ciclo, False si no hay ciclo.
    """
    if not nuevo_padre_id:
        return False

    # No puede ser su propio padre
    if dependencia_id == nuevo_padre_id:
        return True

    # Verificar hacia arriba en la jerarquía
    actual_id = nuevo_padre_id
    visitados = set()

    while actual_id:
        if actual_id in visitados:
            # Ciclo detectado
            return True
        visitados.add(actual_id)

        # Obtener el padre del actual
        statement = select(Dependencia.codigo_padre).where(
            Dependencia.id_dependencia == actual_id
        )
        result = await db.exec(statement)
        padre_id = result.first()

        # Si el padre es la dependencia que estamos validando, hay ciclo
        if padre_id == dependencia_id:
            return True

        actual_id = padre_id

    return False


@router.get("", response_model=List[DependenciaRead])
async def listar_dependencias(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: str = Query(None, description="Buscar por nombre"),
    db: AsyncSession = Depends(get_session),
):
    statement = select(Dependencia).options(
        selectinload(Dependencia.tipo_dependencia),
        selectinload(Dependencia.provincia),
        selectinload(Dependencia.municipio).selectinload(Municipio.provincia),
        selectinload(Dependencia.cuentas),
    )
    if search:
        statement = statement.where(
            func.lower(Dependencia.nombre).contains(func.lower(search))
        )
    statement = statement.offset(skip).limit(limit)
    results = await db.exec(statement)
    dependencias = results.all()
    return [DependenciaRead.model_validate(d) for d in dependencias]


@router.get("/jerarquia", response_model=List[DependenciaRead])
async def listar_dependencias_jerarquia(
    padre_id: int = Query(None, description="ID de la dependencia padre"),
    db: AsyncSession = Depends(get_session),
):
    statement = select(Dependencia).options(
        selectinload(Dependencia.tipo_dependencia),
        selectinload(Dependencia.provincia),
        selectinload(Dependencia.municipio),
        selectinload(Dependencia.cuentas),
    )
    if padre_id:
        statement = statement.where(Dependencia.codigo_padre == padre_id)
    else:
        statement = statement.where(Dependencia.codigo_padre.is_(None))
    results = await db.exec(statement)
    dependencias = results.all()
    return [DependenciaRead.model_validate(d) for d in dependencias]


@router.post("", response_model=DependenciaRead, status_code=201)
async def crear_dependencia(
    data: DependenciaConCuentasCreate,
    db: AsyncSession = Depends(get_session),
):
    if data.dependencia.codigo_padre:
        tiene_ciclo = await validar_ciclo_dependencia(
            db, 0, data.dependencia.codigo_padre
        )
        if tiene_ciclo:
            raise HTTPException(
                status_code=400,
                detail="No se puede crear la dependencia porque se formaría un ciclo en la jerarquía",
            )

    db_obj = await dependencia_repo.create(db, obj_in=data.dependencia)

    if data.cuentas:
        for cuenta_data in data.cuentas:
            cuenta_create = CuentaCreate(
                id_dependencia=db_obj.id_dependencia,
                **cuenta_data.model_dump(exclude={"id_dependencia"}),
            )
            await cuenta_service.create(db, cuenta_create)

    # Primero crear la BD si existe base_datos
    if data.dependencia.base_datos:
        try:
            tablas = DatabaseService.crear_base_datos(data.dependencia.base_datos)
        except Exception as e:
            # Si falla la creación de la BD, eliminamos la dependencia creada
            await dependencia_repo.remove(db, id=db_obj.id_dependencia)
            raise HTTPException(
                status_code=500,
                detail=f"Error al crear la base de datos: {str(e)}",
            )
        # Retornar solo los datos básicos para evitar error de serialización
        return DependenciaRead(
            id_dependencia=db_obj.id_dependencia,
            id_tipo_dependencia=db_obj.id_tipo_dependencia,
            codigo_padre=db_obj.codigo_padre,
            nombre=db_obj.nombre,
            direccion=db_obj.direccion,
            telefono=db_obj.telefono,
            email=db_obj.email,
            web=db_obj.web,
            base_datos=db_obj.base_datos,
            host=db_obj.host,
            puerto=db_obj.puerto,
            id_provincia=db_obj.id_provincia,
            id_municipio=db_obj.id_municipio,
            descripcion=db_obj.descripcion,
            tablas_creadas=tablas,
        )

    # Si no tiene base_datos, cargar con relaciones normalmente
    statement = (
        select(Dependencia)
        .where(Dependencia.id_dependencia == db_obj.id_dependencia)
        .options(
            selectinload(Dependencia.tipo_dependencia),
            selectinload(Dependencia.provincia),
            selectinload(Dependencia.municipio),
            selectinload(Dependencia.cuentas),
            selectinload(Dependencia.padre),
        )
    )
    results = await db.exec(statement)
    db_obj = results.first()

    response = DependenciaRead.model_validate(db_obj)

    return response


@router.get("/{dependencia_id}", response_model=DependenciaRead)
async def obtener_dependencia(
    dependencia_id: int,
    db: AsyncSession = Depends(get_session),
):
    statement = (
        select(Dependencia)
        .where(Dependencia.id_dependencia == dependencia_id)
        .options(
            selectinload(Dependencia.tipo_dependencia),
            selectinload(Dependencia.provincia),
            selectinload(Dependencia.municipio),
            selectinload(Dependencia.cuentas),
        )
    )
    results = await db.exec(statement)
    db_obj = results.first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Dependencia no encontrada")
    return DependenciaRead.model_validate(db_obj)


@router.put("/{dependencia_id}", response_model=DependenciaRead)
async def actualizar_dependencia(
    dependencia_id: int,
    data: DependenciaUpdate,
    db: AsyncSession = Depends(get_session),
):
    db_obj = await dependencia_repo.get(db, id=dependencia_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Dependencia no encontrada")

    # Validar que no se cree un ciclo si se está cambiando el padre
    if data.codigo_padre is not None:
        tiene_ciclo = await validar_ciclo_dependencia(
            db, dependencia_id, data.codigo_padre
        )
        if tiene_ciclo:
            raise HTTPException(
                status_code=400,
                detail="No se puede actualizar la dependencia porque se formaría un ciclo en la jerarquía",
            )

    updated = await dependencia_repo.update(db, db_obj=db_obj, obj_in=data)

    # Recargar el objeto con las relaciones
    statement = (
        select(Dependencia)
        .where(Dependencia.id_dependencia == dependencia_id)
        .options(
            selectinload(Dependencia.tipo_dependencia),
            selectinload(Dependencia.provincia),
            selectinload(Dependencia.municipio),
            selectinload(Dependencia.cuentas),
            selectinload(Dependencia.padre).selectinload(Dependencia.tipo_dependencia),
            selectinload(Dependencia.padre).selectinload(Dependencia.provincia),
            selectinload(Dependencia.padre).selectinload(Dependencia.municipio),
            selectinload(Dependencia.padre).selectinload(Dependencia.cuentas),
            selectinload(Dependencia.padre).selectinload(Dependencia.padre),
        )
    )
    results = await db.exec(statement)
    db_obj = results.first()

    return DependenciaRead.model_validate(db_obj)


@router.delete("/{dependencia_id}", status_code=204)
async def eliminar_dependencia(
    dependencia_id: int,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        text("DELETE FROM dependencia WHERE id_dependencia = :id"),
        {"id": dependencia_id},
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Dependencia no encontrada")


@router.get("/tipos", response_model=List[TipoDependenciaRead])
async def listar_tipos_dependencia(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    db_objs = await tipo_dependencia_repo.get_multi(db, skip=skip, limit=limit)
    return [TipoDependenciaRead.model_validate(obj) for obj in db_objs]


@router.post("/tipos", response_model=TipoDependenciaRead, status_code=201)
async def crear_tipo_dependencia(
    data: TipoDependenciaCreate,
    db: AsyncSession = Depends(get_session),
):
    db_obj = await tipo_dependencia_repo.create(db, obj_in=data)
    return TipoDependenciaRead.model_validate(db_obj)


@router.put("/tipos/{tipo_id}", response_model=TipoDependenciaRead)
async def actualizar_tipo_dependencia(
    tipo_id: int,
    data: TipoDependenciaUpdate,
    db: AsyncSession = Depends(get_session),
):
    db_obj = await tipo_dependencia_repo.get(db, id=tipo_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Tipo de dependencia no encontrado")
    updated = await tipo_dependencia_repo.update(db, db_obj=db_obj, obj_in=data)
    return TipoDependenciaRead.model_validate(updated)


@router.delete("/tipos/{tipo_id}", status_code=204)
async def eliminar_tipo_dependencia(
    tipo_id: int,
    db: AsyncSession = Depends(get_session),
):
    success = await tipo_dependencia_repo.remove(db, id=tipo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tipo de dependencia no encontrado")


@router.get("/ubicaciones/provincias", response_model=List[ProvinciaRead])
async def listar_provincias(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    statement = select(Provincia).offset(skip).limit(limit)
    results = await db.exec(statement)
    provincias = results.all()
    return [ProvinciaRead.model_validate(p) for p in provincias]


@router.get("/ubicaciones/municipios", response_model=List[MunicipioRead])
async def listar_municipios(
    provincia_id: int = Query(None, description="Filtrar por provincia"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    statement = select(Municipio).options(selectinload(Municipio.provincia))
    if provincia_id:
        statement = statement.where(Municipio.id_provincia == provincia_id)
    statement = statement.offset(skip).limit(limit)
    results = await db.exec(statement)
    municipios = results.all()
    return [MunicipioRead.model_validate(m) for m in municipios]


# =====================================================
# Endpoints para cuenta_dependencias (replicación dblink)
# =====================================================


@router.get("/cuentas", response_model=List[CuentaDependenciaRead])
async def listar_cuentas_dependencias(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_session),
):
    """Listar cuentas bancarias de dependencias (desde BD central)."""
    return await cuenta_dependencia_service.get_all(db, skip=skip, limit=limit)


@router.get("/cuentas/{cuenta_id}", response_model=CuentaDependenciaRead)
async def obtener_cuenta_dependencia(
    cuenta_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener una cuenta de dependencia por ID."""
    cuenta = await cuenta_dependencia_service.get(db, cuenta_id)
    if not cuenta:
        raise HTTPException(
            status_code=404, detail="Cuenta de dependencia no encontrada"
        )
    return cuenta


@router.get(
    "/cuentas/dependencia/{id_dependencia}",
    response_model=List[CuentaDependenciaRead],
)
async def obtener_cuentas_por_dependencia(
    id_dependencia: int,
    db: AsyncSession = Depends(get_session),
):
    """Obtener cuentas por ID de dependencia."""
    from sqlmodel import select

    statement = select(CuentaDependencia).where(
        CuentaDependencia.id_dependencia == id_dependencia
    )
    results = await db.exec(statement)
    return results.all()


@router.post("/cuentas", response_model=CuentaDependenciaRead, status_code=201)
async def crear_cuenta_dependencia(
    cuenta: CuentaDependenciaCreate,
    db: AsyncSession = Depends(get_session),
):
    """Crear una cuenta de dependencia (se guarda en BD central)."""
    try:
        return await cuenta_dependencia_service.create(db, cuenta)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al crear cuenta de dependencia: {str(e)}"
        )


@router.put("/cuentas/{cuenta_id}", response_model=CuentaDependenciaRead)
async def actualizar_cuenta_dependencia(
    cuenta_id: int,
    update_data: CuentaDependenciaUpdate,
    db: AsyncSession = Depends(get_session),
):
    """Actualizar una cuenta de dependencia."""
    try:
        cuenta = await cuenta_dependencia_service.update(db, cuenta_id, update_data)
        if not cuenta:
            raise HTTPException(
                status_code=404, detail="Cuenta de dependencia no encontrada"
            )
        return cuenta
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al actualizar cuenta de dependencia: {str(e)}",
        )


@router.delete("/cuentas/{cuenta_id}", status_code=204)
async def eliminar_cuenta_dependencia(
    cuenta_id: int,
    db: AsyncSession = Depends(get_session),
):
    """Eliminar una cuenta de dependencia."""
    try:
        success = await cuenta_dependencia_service.delete(db, cuenta_id)
        if not success:
            raise HTTPException(
                status_code=404, detail="Cuenta de dependencia no encontrada"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error al eliminar cuenta de dependencia: {str(e)}"
        )
