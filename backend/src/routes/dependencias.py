import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from src.database.connection import get_session
from src.models import (
    Dependencia,
    TipoDependencia,
    Provincia,
    Municipio,
    CuentaDependencia,
    ConexionDatabase,
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
    todas: bool = Query(
        False, description="Retornar todas las dependencias del sistema"
    ),
    db: AsyncSession = Depends(get_session),
):
    statement = select(Dependencia).options(
        selectinload(Dependencia.tipo_dependencia),
        selectinload(Dependencia.provincia),
        selectinload(Dependencia.municipio).selectinload(Municipio.provincia),
        selectinload(Dependencia.cuentas),
        selectinload(Dependencia.cuentas_dependencias).selectinload(
            CuentaDependencia.moneda
        ),
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
        selectinload(Dependencia.cuentas_dependencias).selectinload(
            CuentaDependencia.moneda
        ),
    )
    if padre_id:
        statement = statement.where(Dependencia.codigo_padre == padre_id)
    else:
        statement = statement.where(Dependencia.codigo_padre.is_(None))
    results = await db.exec(statement)
    dependencias = results.all()
    return [DependenciaRead.model_validate(d) for d in dependencias]


@router.get("/bases-de-datos", tags=["bases-de-datos"])
async def get_bases_de_datos(
    db: AsyncSession = Depends(get_session),
):
    """Obtiene todas las bases de datos existentes de la tabla conexion_database"""
    from sqlmodel import select

    statement = select(ConexionDatabase)
    results = await db.exec(statement)
    bases_de_datos = results.all()

    return [
        {
            "id_conexion": bd.id_conexion,
            "nombre_database": bd.nombre_database,
            "host": bd.host,
            "puerto": bd.puerto,
            "usuario": bd.usuario,
        }
        for bd in bases_de_datos
    ]


@router.post("", response_model=DependenciaRead, status_code=201)
async def crear_dependencia(
    data: DependenciaConCuentasCreate,
    db: AsyncSession = Depends(get_session),
):
    from sqlmodel import select

    codigo_padre = data.dependencia.codigo_padre

    if codigo_padre is not None:
        statement = select(Dependencia).where(
            Dependencia.id_dependencia == codigo_padre
        )
        results = await db.exec(statement)
        dependencia_padre = results.first()

        if not dependencia_padre:
            raise HTTPException(
                status_code=404,
                detail="Dependencia padre no encontrada",
            )

        if dependencia_padre.base_datos is None:
            raise HTTPException(
                status_code=400,
                detail="La dependencia padre no tiene base de datos asignada",
            )

    if codigo_padre:
        tiene_ciclo = await validar_ciclo_dependencia(db, 0, codigo_padre)
        if tiene_ciclo:
            raise HTTPException(
                status_code=400,
                detail="No se puede crear la dependencia porque se formaría un ciclo en la jerarquía",
            )

    try:
        db_obj = await dependencia_repo.create(db, obj_in=data.dependencia)
    except IntegrityError as e:
        error_msg = str(e.orig)
        if "dependencia_nit_key" in error_msg:
            raise HTTPException(
                status_code=409, detail="El NIT ya está registrado en otra dependencia"
            )
        raise HTTPException(status_code=409, detail="Conflicto: el registro ya existe")

    cuentas_creadas = []
    if data.cuentas:
        for cuenta_data in data.cuentas:
            cuenta_create = CuentaCreate(
                id_dependencia=db_obj.id_dependencia,
                **cuenta_data.model_dump(exclude={"id_dependencia"}),
            )
            cuenta_obj = await cuenta_service.create(db, cuenta_create)

            cuenta_dep_data = cuenta_data.model_dump(
                exclude={"id_cliente", "id_dependencia"}
            )
            cuenta_dep_obj = CuentaDependencia(
                id_dependencia=db_obj.id_dependencia,
                **cuenta_dep_data,
            )
            db.add(cuenta_dep_obj)
            await db.commit()
            await db.refresh(cuenta_dep_obj)

            cuentas_creadas.append(cuenta_obj)

    tablas_creadas = None

    if data.base_datos_existente:
        db_obj.base_datos = data.base_datos_existente
        db_obj = await dependencia_repo.update(db, db_obj=db_obj, obj_in=db_obj)

    elif data.dependencia.base_datos:
        try:
            tablas_creadas = DatabaseService.crear_base_datos(
                data.dependencia.base_datos, "new.sql"
            )
        except Exception as e:
            await dependencia_repo.remove(db, id=db_obj.id_dependencia)
            raise HTTPException(
                status_code=500,
                detail=f"Error al crear la base de datos: {str(e)}",
            )

        # Sincronizar datos de referencia desde caguayosa a la nueva BD
        DatabaseService.replicar_datos_desde_central(data.dependencia.base_datos)

        # Insertar usuario admin con id_dependencia apuntando a la nueva dependencia
        DatabaseService.insertar_admin_en_db(
            data.dependencia.base_datos, db_obj.id_dependencia
        )

    from src.services.replicacion_service import ReplicacionService

    ReplicacionService.replicar_dependencia(
        {
            "id_dependencia": db_obj.id_dependencia,
            "id_tipo_dependencia": db_obj.id_tipo_dependencia,
            "codigo_padre": db_obj.codigo_padre,
            "nombre": db_obj.nombre,
            "direccion": db_obj.direccion,
            "telefono": db_obj.telefono,
            "email": db_obj.email,
            "web": db_obj.web,
            "base_datos": db_obj.base_datos,
            "host": db_obj.host,
            "puerto": db_obj.puerto,
            "id_provincia": db_obj.id_provincia,
            "id_municipio": db_obj.id_municipio,
            "descripcion": db_obj.descripcion,
        },
        "INSERT",
    )
    for cuenta_obj in cuentas_creadas:
        ReplicacionService.replicar_cuenta_dependencia(
            {
                "id_cuenta": cuenta_obj.id_cuenta,
                "id_dependencia": cuenta_obj.id_dependencia,
                "id_moneda": cuenta_obj.id_moneda,
                "titular": cuenta_obj.titular,
                "banco": cuenta_obj.banco,
                "sucursal": cuenta_obj.sucursal,
                "numero_cuenta": cuenta_obj.numero_cuenta,
                "direccion": cuenta_obj.direccion,
            },
            "INSERT",
        )

    # Registrar la nueva BD en conexion_database DESPUÉS del PUSH,
    # para que el PUSH no replique duplicados a la BD recién creada
    if data.dependencia.base_datos:
        conexion = ConexionDatabase(
            host="localhost",
            puerto=5432,
            nombre_database=data.dependencia.base_datos,
            usuario=os.getenv("ADMIN_DB_USER", "postgres"),
            contrasenia=os.getenv("ADMIN_DB_PASSWORD", "debianpostgres"),
        )
        db.add(conexion)
        await db.commit()
        await db.refresh(conexion)

    statement = (
        select(Dependencia)
        .where(Dependencia.id_dependencia == db_obj.id_dependencia)
        .options(
            selectinload(Dependencia.tipo_dependencia),
            selectinload(Dependencia.provincia),
            selectinload(Dependencia.municipio),
            selectinload(Dependencia.cuentas),
            selectinload(Dependencia.cuentas_dependencias).selectinload(
                CuentaDependencia.moneda
            ),
            selectinload(Dependencia.padre),
        )
    )
    results = await db.exec(statement)
    db_obj_full = results.first()
    response = DependenciaRead.model_validate(db_obj_full)
    response.tablas_creadas = tablas_creadas
    return response


# =====================================================
# Endpoints para cuenta_dependencias (replicación dblink)
# =====================================================


@router.get("/cuentas", response_model=List[CuentaDependenciaRead])
async def listar_cuentas_dependencias(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: str = Query(None, description="Buscar por titular o nombre de dependencia"),
    db: AsyncSession = Depends(get_session),
):
    """Listar cuentas bancarias de dependencias (desde BD central)."""
    from sqlmodel import select

    statement = select(CuentaDependencia).options(
        selectinload(CuentaDependencia.moneda),
        selectinload(CuentaDependencia.dependencia),
    )

    statement = statement.offset(skip).limit(limit)

    if search:
        pass

    results = await db.exec(statement)
    cuentas = results.all()

    response = []
    for cuenta in cuentas:
        dto = CuentaDependenciaRead.model_validate(cuenta)
        if cuenta.dependencia:
            dto.dependencia_nombre = cuenta.dependencia.nombre
        response.append(dto)

    if search:
        search_lower = search.lower()
        response = [
            c
            for c in response
            if search_lower in (c.titular or "").lower()
            or search_lower in (c.dependencia_nombre or "").lower()
        ]

    return response


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
    from sqlalchemy.orm import selectinload

    statement = (
        select(CuentaDependencia)
        .options(selectinload(CuentaDependencia.moneda))
        .where(CuentaDependencia.id_dependencia == id_dependencia)
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


@router.get("/{dependencia_id}", response_model=DependenciaRead)
async def obtener_dependencia(
    dependencia_id: int,
    db: AsyncSession = Depends(get_session),
):
    from sqlalchemy.orm import selectinload

    statement = (
        select(Dependencia)
        .where(Dependencia.id_dependencia == dependencia_id)
        .options(
            selectinload(Dependencia.tipo_dependencia),
            selectinload(Dependencia.provincia),
            selectinload(Dependencia.municipio).selectinload(Municipio.provincia),
            selectinload(Dependencia.cuentas),
            selectinload(Dependencia.cuentas_dependencias).selectinload(
                CuentaDependencia.moneda
            ),
            selectinload(Dependencia.padre),
        )
    )
    results = await db.exec(statement)
    db_obj = results.first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Dependencia no encontrada")

    response = DependenciaRead.model_validate(db_obj)
    return response


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
            selectinload(Dependencia.cuentas_dependencias).selectinload(
                CuentaDependencia.moneda
            ),
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


@router.delete("/{dependencia_id}")
async def eliminar_dependencia(
    dependencia_id: int,
    db: AsyncSession = Depends(get_session),
):
    dep = await db.get(Dependencia, dependencia_id)
    if not dep:
        raise HTTPException(status_code=404, detail="Dependencia no encontrada")

    base_datos = dep.base_datos
    db_name = base_datos if base_datos else None
    dep_nombre = dep.nombre

    await db.delete(dep)
    await db.commit()

    db_dropped = False
    if db_name:
        try:
            DatabaseService.eliminar_base_datos(db_name)
            db_dropped = True
        except Exception as e:
            print(f"Error dropping database {db_name}: {e}")

    return {
        "database_dropped": db_dropped,
        "database_name": db_name,
        "dependencia_nombre": dep_nombre,
    }


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
