from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import create_engine


class DatabaseCreationResult(BaseModel):
    creada: bool
    ya_existia: bool
    tablas: List[str]
    mensaje: str


from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload
from src.database.connection import get_session
from src.models import Dependencia, TipoDependencia, Provincia, Municipio, Cuenta
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
)
from src.services.cuenta_service import CuentaService
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


class ValidarConexionRequest(BaseModel):
    host: str
    puerto: int
    usuario: str
    contrasenia: str
    base_datos: str


class ValidarConexionResponse(BaseModel):
    valida: bool
    mensaje: str
    ya_existe: bool
    tiene_tablas: bool
    tablas: List[str]


def probar_conexion_db(
    host: str, puerto: int, usuario: str, contrasenia: str, base_datos: str
) -> ValidarConexionResponse:
    """Prueba la conexión a la base de datos"""
    import psycopg2

    conn_params = {
        "host": host,
        "port": puerto,
        "user": usuario,
        "password": contrasenia,
    }

    try:
        # Probar conexión al servidor (usando template1 como base de datos por defecto)
        conn = psycopg2.connect(dbname="template1", **conn_params)
        conn.autocommit = True
        cursor = conn.cursor()

        # Verificar si la base de datos existe
        cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{base_datos}'")
        existe = cursor.fetchone() is not None

        tiene_tablas = False
        tablas = []

        if existe:
            # Verificar si tiene tablas
            cursor.execute(
                f"SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND datname = '{base_datos}'"
            )
            try:
                cursor.execute(
                    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
                )
                tablas = [row[0] for row in cursor.fetchall()]
                tiene_tablas = len(tablas) > 0
            except:
                pass

            cursor.close()
            conn.close()

            # Conectar a la base de datos específica para verificar tablas
            conn = psycopg2.connect(dbname=base_datos, **conn_params)
            conn.autocommit = True
            cursor = conn.cursor()
            cursor.execute(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
            )
            tablas = [row[0] for row in cursor.fetchall()]
            tiene_tablas = len(tablas) > 0
            cursor.close()
            conn.close()

            return ValidarConexionResponse(
                valida=True,
                mensaje=f"La base de datos '{base_datos}' ya existe"
                + (f" con {len(tablas)} tablas" if tiene_tablas else " (sin tablas)"),
                ya_existe=True,
                tiene_tablas=tiene_tablas,
                tablas=tablas,
            )
        else:
            cursor.close()
            conn.close()

            return ValidarConexionResponse(
                valida=True,
                mensaje=f"Conexión exitosa. La base de datos '{base_datos}' será creada.",
                ya_existe=False,
                tiene_tablas=False,
                tablas=[],
            )

    except psycopg2.OperationalError as e:
        error_msg = str(e)
        if (
            "could not connect to server" in error_msg.lower()
            or "connection refused" in error_msg.lower()
        ):
            return ValidarConexionResponse(
                valida=False,
                mensaje="No se puede conectar al servidor. Verifique el host y puerto.",
                ya_existe=False,
                tiene_tablas=False,
                tablas=[],
            )
        elif "password authentication failed" in error_msg.lower():
            return ValidarConexionResponse(
                valida=False,
                mensaje="Credenciales incorrectas. Verifique usuario y contraseña.",
                ya_existe=False,
                tiene_tablas=False,
                tablas=[],
            )
        elif "database" in error_msg.lower() and "does not exist" in error_msg.lower():
            return ValidarConexionResponse(
                valida=True,
                mensaje=f"La base de datos '{base_datos}' no existe. Será creada.",
                ya_existe=False,
                tiene_tablas=False,
                tablas=[],
            )
        else:
            return ValidarConexionResponse(
                valida=False,
                mensaje=f"Error de conexión: {error_msg}",
                ya_existe=False,
                tiene_tablas=False,
                tablas=[],
            )
    except Exception as e:
        return ValidarConexionResponse(
            valida=False,
            mensaje=f"Error: {str(e)}",
            ya_existe=False,
            tiene_tablas=False,
            tablas=[],
        )


@router.post("/validar-conexion", response_model=ValidarConexionResponse)
async def validar_conexion_base_datos(data: ValidarConexionRequest):
    """Valida la conexión a la base de datos"""
    return probar_conexion_db(
        data.host, data.puerto, data.usuario, data.contrasenia, data.base_datos
    )


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
        selectinload(Dependencia.municipio),
        selectinload(Dependencia.cuentas).selectinload(Cuenta.tipo_cuenta),
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
        selectinload(Dependencia.cuentas).selectinload(Cuenta.tipo_cuenta),
    )
    if padre_id:
        statement = statement.where(Dependencia.codigo_padre == padre_id)
    else:
        statement = statement.where(Dependencia.codigo_padre.is_(None))
    results = await db.exec(statement)
    dependencias = results.all()
    return [DependenciaRead.model_validate(d) for d in dependencias]


def crear_base_datos(
    nombre_db: str,
    usuario: str = None,
    contrasenia: str = None,
    puerto: int = 5432,
    host: str = "localhost",
    nombre_dependencia: str = None,
    direccion: str = None,
    telefono: str = None,
    email: str = None,
    web: str = None,
    descripcion: str = None,
    id_tipo_dependencia: int = None,
    nombre_tipo_dependencia: str = None,
    id_provincia: int = None,
    id_municipio: int = None,
    cuentas: list = None,
):
    """Crea una nueva base de datos y sus tablas con datos iniciales usando db.sql como plantilla"""
    import psycopg2
    import bcrypt
    from sqlalchemy import create_engine
    from sqlmodel import Session, select

    from src.models import (
        Funcionalidad,
        Grupo,
        Usuario,
        GrupoFuncionalidad,
        TipoDependencia,
        Dependencia,
        Cuenta,
        TipoCuenta,
    )

    import os

    db_sql_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "sql", "db.sql"
    )

    conn_params = {
        "host": host,
        "port": puerto,
        "user": "postgres",
        "password": "1234",
    }

    if usuario and contrasenia:
        conn_params["user"] = usuario
        conn_params["password"] = contrasenia

    try:
        conn = psycopg2.connect(dbname="template1", **conn_params)
        conn.autocommit = True
        cursor = conn.cursor()

        cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{nombre_db}'")
        db_existe = cursor.fetchone() is not None

        if not db_existe:
            cursor.execute(f'CREATE DATABASE "{nombre_db}"')
            cursor.close()
            conn.close()

            conn = psycopg2.connect(dbname=nombre_db, **conn_params)
            conn.autocommit = True
            cursor = conn.cursor()

            try:
                cursor.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
            except Exception as ext_error:
                print(f"Warning creating extension: {ext_error}")

            try:
                cursor.execute("SELECT 1 FROM pg_roles WHERE rolname = 'usuariolector'")
                if not cursor.fetchone():
                    cursor.execute(
                        "CREATE USER usuariolector WITH PASSWORD 'usuariolector123'"
                    )
                    cursor.execute(
                        "GRANT SELECT ON TABLE pg_catalog.pg_database TO usuariolector"
                    )
                cursor.execute(
                    f'GRANT CONNECT ON DATABASE "{nombre_db}" TO usuariolector'
                )
            except Exception as lector_error:
                print(f"Warning creating lector user: {lector_error}")

            cursor.close()
            conn.close()

            with open(db_sql_path, "r") as f:
                sql_content = f.read()

            conn = psycopg2.connect(dbname=nombre_db, **conn_params)
            conn.autocommit = True
            cursor = conn.cursor()
            cursor.execute(sql_content)
            cursor.close()
            conn.close()

            conn = psycopg2.connect(dbname=nombre_db, **conn_params)
            cursor = conn.cursor()
            cursor.execute(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
            )
            tablas = [row[0] for row in cursor.fetchall()]
            cursor.close()
            conn.close()
        else:
            try:
                cursor.execute(
                    f'GRANT CONNECT ON DATABASE "{nombre_db}" TO usuariolector'
                )
            except Exception as lector_error:
                print(f"Warning granting CONNECT: {lector_error}")

            cursor.close()
            conn.close()

            conn = psycopg2.connect(dbname=nombre_db, **conn_params)
            cursor = conn.cursor()
            cursor.execute(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
            )
            tablas = [row[0] for row in cursor.fetchall()]
            cursor.close()
            conn.close()

        db_url = f"postgresql://{conn_params['user']}:{conn_params['password']}@{host}:{puerto}/{nombre_db}"
        engine = create_engine(db_url)

        with Session(engine) as db_session:
            funcionalidades = db_session.exec(select(Funcionalidad)).all()

            if not funcionalidades:
                for nombre_func in [
                    "movimientos",
                    "pendientes",
                    "producto",
                    "configuracion",
                    "usuarios",
                    "grupos",
                    "monedas",
                    "dependencias",
                ]:
                    func = Funcionalidad(nombre=nombre_func)
                    db_session.add(func)
                db_session.commit()
                funcionalidades = db_session.exec(select(Funcionalidad)).all()

            grupo_existente = db_session.exec(
                select(Grupo).where(Grupo.nombre == "Super Admin")
            ).first()

            if not grupo_existente:
                grupo_super = Grupo(
                    nombre="Super Admin", descripcion="Grupo con todos los permisos"
                )
                db_session.add(grupo_super)
                db_session.commit()
                db_session.refresh(grupo_super)
                id_grupo = grupo_super.id_grupo
            else:
                id_grupo = grupo_existente.id_grupo

            if id_grupo is not None:
                for func in funcionalidades:
                    if func.id_funcionalidad is None:
                        continue
                    gf_existente = db_session.exec(
                        select(GrupoFuncionalidad).where(
                            GrupoFuncionalidad.id_grupo == id_grupo,
                            GrupoFuncionalidad.id_funcionalidad
                            == func.id_funcionalidad,
                        )
                    ).first()
                    if not gf_existente:
                        gf = GrupoFuncionalidad(
                            id_grupo=id_grupo, id_funcionalidad=func.id_funcionalidad
                        )
                        db_session.add(gf)

                db_session.commit()

                usuario_existente = db_session.exec(
                    select(Usuario).where(Usuario.alias == "superadmin")
                ).first()

                if not usuario_existente:
                    contrasenia_hash = bcrypt.hashpw(
                        "superadmin123".encode("utf-8"), bcrypt.gensalt()
                    ).decode("utf-8")
                    super_usuario = Usuario(
                        ci="00000000000",
                        nombre="Super",
                        primer_apellido="Admin",
                        segundo_apellido="",
                        alias="superadmin",
                        contrasenia=contrasenia_hash,
                        id_grupo=id_grupo,
                        id_dependencia=None,
                    )
                    db_session.add(super_usuario)
                    db_session.commit()

            tipos_cuenta_existentes = db_session.exec(select(TipoCuenta)).all()
            if not tipos_cuenta_existentes:
                for nombre in ["Banco", "Caja", "Efectivo", "Transferencia"]:
                    tipo = TipoCuenta(nombre=nombre)
                    db_session.add(tipo)
                db_session.commit()

            tipo_dep = None
            if id_tipo_dependencia:
                tipo_dep = db_session.exec(
                    select(TipoDependencia).where(
                        TipoDependencia.id_tipo_dependencia == id_tipo_dependencia
                    )
                ).first()
                if not tipo_dep and nombre_tipo_dependencia:
                    tipo_dep = TipoDependencia(nombre=nombre_tipo_dependencia)
                    db_session.add(tipo_dep)
                    db_session.commit()
                    db_session.refresh(tipo_dep)

            id_dependencia_creada = None
            if nombre_dependencia:
                dependencia = Dependencia(
                    nombre=nombre_dependencia,
                    direccion=direccion or "",
                    telefono=telefono or "",
                    email=email,
                    web=web,
                    descripcion=descripcion,
                    id_tipo_dependencia=tipo_dep.id_tipo_dependencia
                    if tipo_dep
                    else None,
                    id_provincia=id_provincia,
                    id_municipio=id_municipio,
                    base_datos=nombre_db,
                )
                db_session.add(dependencia)
                db_session.commit()
                db_session.refresh(dependencia)
                id_dependencia_creada = dependencia.id_dependencia

            if cuentas and id_dependencia_creada:
                for cuenta_data in cuentas:
                    cuenta = Cuenta(
                        id_dependencia=id_dependencia_creada,
                        id_tipo_cuenta=cuenta_data.get("id_tipo_cuenta"),
                        titular=cuenta_data.get("titular"),
                        banco=cuenta_data.get("banco"),
                        sucursal=cuenta_data.get("sucursal"),
                        direccion=cuenta_data.get("direccion"),
                    )
                    db_session.add(cuenta)
                db_session.commit()

        return {
            "creada": True,
            "ya_existia": db_existe,
            "tablas": tablas,
            "mensaje": f"Base de datos '{nombre_db}' procesada exitosamente con {len(tablas)} tablas y super usuario",
        }

    except Exception as e:
        print(f"Error creando base de datos: {e}")
        return {
            "creada": False,
            "ya_existia": False,
            "tablas": [],
            "mensaje": f"Error: {str(e)}",
        }


class DependenciaConDatabaseResponse(BaseModel):
    dependencia: DependenciaRead
    database_result: DatabaseCreationResult


@router.post("", response_model=DependenciaConDatabaseResponse, status_code=201)
async def crear_dependencia(
    data: DependenciaConCuentasCreate,
    db: AsyncSession = Depends(get_session),
):
    # Validar que no se cree un ciclo
    if data.dependencia.codigo_padre:
        tiene_ciclo = await validar_ciclo_dependencia(
            db, 0, data.dependencia.codigo_padre
        )
        if tiene_ciclo:
            raise HTTPException(
                status_code=400,
                detail="No se puede crear la dependencia porque se formaría un ciclo en la jerarquía",
            )

    # Crear la dependencia
    db_obj = await dependencia_repo.create(db, obj_in=data.dependencia)

    # Crear la base de datos si se especificó
    db_result = None
    if data.dependencia.base_datos:
        # Obtener el nombre del tipo de dependencia
        nombre_tipo_dep = None
        if data.dependencia.id_tipo_dependencia:
            tipo_dep = await db.get(
                TipoDependencia, data.dependencia.id_tipo_dependencia
            )
            if tipo_dep:
                nombre_tipo_dep = tipo_dep.nombre

        db_result = crear_base_datos(
            data.dependencia.base_datos,
            data.dependencia.usuario,
            data.dependencia.contrasenia,
            data.dependencia.puerto or 5432,
            data.dependencia.host or "localhost",
            nombre_dependencia=data.dependencia.nombre,
            direccion=data.dependencia.direccion,
            telefono=data.dependencia.telefono,
            email=data.dependencia.email,
            web=data.dependencia.web,
            descripcion=data.dependencia.descripcion,
            id_tipo_dependencia=data.dependencia.id_tipo_dependencia,
            nombre_tipo_dependencia=nombre_tipo_dep,
            id_provincia=data.dependencia.id_provincia,
            id_municipio=data.dependencia.id_municipio,
            cuentas=[c.model_dump() for c in data.cuentas] if data.cuentas else None,
        )
        if not db_result or not db_result.get("creada", False):
            print(
                f"Advertencia: No se pudo crear la base de datos {data.dependencia.base_datos}"
            )

    # Crear las cuentas asociadas a la dependencia en la BD central
    if data.cuentas:
        for cuenta_data in data.cuentas:
            cuenta_create = CuentaCreate(
                id_dependencia=db_obj.id_dependencia,
                **cuenta_data.model_dump(exclude={"id_dependencia"}),
            )
            await CuentaService.create(db, cuenta_create)

    # Recargar el objeto con las relaciones
    statement = (
        select(Dependencia)
        .where(Dependencia.id_dependencia == db_obj.id_dependencia)
        .options(
            selectinload(Dependencia.tipo_dependencia),
            selectinload(Dependencia.provincia),
            selectinload(Dependencia.municipio),
            selectinload(Dependencia.cuentas).selectinload(Cuenta.tipo_cuenta),
            selectinload(Dependencia.padre),
        )
    )
    results = await db.exec(statement)
    db_obj = results.first()

    # Crear resultado de la base de datos
    if db_result is None:
        db_result = {
            "creada": False,
            "ya_existia": False,
            "tablas": [],
            "mensaje": "No se especificó base de datos",
        }

    database_result = DatabaseCreationResult(**db_result)

    return DependenciaConDatabaseResponse(
        dependencia=DependenciaRead.model_validate(db_obj),
        database_result=database_result,
    )


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
            selectinload(Dependencia.cuentas).selectinload(Cuenta.tipo_cuenta),
        )
    )
    results = await db.exec(statement)
    db_obj = results.first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Dependencia no encontrada")
    return DependenciaRead.model_validate(db_obj)


@router.put("/{dependencia_id}", response_model=DependenciaConDatabaseResponse)
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

    # Crear base de datos si se especificó
    db_result = None
    if data.base_datos:
        db_result = crear_base_datos(
            data.base_datos,
            data.usuario,
            data.contrasenia,
            data.puerto or 5432,
            data.host or "localhost",
        )
        if not db_result or not db_result.get("creada", False):
            print(f"Advertencia: No se pudo crear la base de datos {data.base_datos}")

    # Recargar el objeto con las relaciones
    statement = (
        select(Dependencia)
        .where(Dependencia.id_dependencia == dependencia_id)
        .options(
            selectinload(Dependencia.tipo_dependencia),
            selectinload(Dependencia.provincia),
            selectinload(Dependencia.municipio),
            selectinload(Dependencia.cuentas).selectinload(Cuenta.tipo_cuenta),
            selectinload(Dependencia.padre).selectinload(Dependencia.tipo_dependencia),
            selectinload(Dependencia.padre).selectinload(Dependencia.provincia),
            selectinload(Dependencia.padre).selectinload(Dependencia.municipio),
            selectinload(Dependencia.padre)
            .selectinload(Dependencia.cuentas)
            .selectinload(Cuenta.tipo_cuenta),
            selectinload(Dependencia.padre).selectinload(Dependencia.padre),
        )
    )
    results = await db.exec(statement)
    db_obj = results.first()

    # Crear resultado de la base de datos
    if db_result is None:
        db_result = {
            "creada": False,
            "ya_existia": False,
            "tablas": [],
            "mensaje": "No se especificó base de datos",
        }

    database_result = DatabaseCreationResult(**db_result)

    return DependenciaConDatabaseResponse(
        dependencia=DependenciaRead.model_validate(db_obj),
        database_result=database_result,
    )


@router.delete("/{dependencia_id}", status_code=204)
async def eliminar_dependencia(
    dependencia_id: int,
    db: AsyncSession = Depends(get_session),
):
    success = await dependencia_repo.remove(db, id=dependencia_id)
    if not success:
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
