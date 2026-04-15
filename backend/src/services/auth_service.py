import os
from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy import text
from jose import JWTError, jwt
import bcrypt
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.models import (
    Usuario,
    Dependencia,
    Grupo,
    Funcionalidad,
    GrupoFuncionalidad,
    Sesion,
    ConexionDatabase,
)
from src.dto.auth_dto import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    AliasSearchResponse,
    UsuarioInfo,
    DependenciaInfo,
    GrupoInfo,
    FuncionalidadInfo,
    PerfilUpdateRequest,
    PerfilResponse,
)

SECRET_KEY = os.getenv("SECRET_KEY", "caguayo-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_dependencia_with_hijos(
    db: AsyncSession, id_dependencia: int
) -> List[Dependencia]:
    """Obtiene la dependencia y todas sus descendientes (hijas, nietas, etc.)"""
    dependencias = []

    async def _get_hijos(parent_id: int):
        statement = select(Dependencia).where(Dependencia.codigo_padre == parent_id)
        results = await db.exec(statement)
        hijos = results.all()
        for hijo in hijos:
            dependencias.append(hijo)
            await _get_hijos(hijo.id_dependencia)

    # Obtener la dependencia principal
    dep_principal = await db.get(Dependencia, id_dependencia)
    if dep_principal:
        dependencias.append(dep_principal)
        await _get_hijos(id_dependencia)

    return dependencias


async def search_by_alias(
    db: AsyncSession, alias: str
) -> Optional[AliasSearchResponse]:
    """Busca un usuario por alias y retorna su información (sin validar contraseña)"""
    statement = select(Usuario).where(Usuario.alias == alias)
    results = await db.exec(statement)
    usuario = results.first()

    if not usuario:
        return None

    # Obtener dependencia
    dependencia = None
    if usuario.id_dependencia:
        dependencia = await db.get(Dependencia, usuario.id_dependencia)

    # Obtener grupo
    grupo = await db.get(Grupo, usuario.id_grupo)

    return AliasSearchResponse(
        alias=usuario.alias,
        dependencia=DependenciaInfo(
            id_dependencia=dependencia.id_dependencia,
            nombre=dependencia.nombre,
            base_datos=dependencia.base_datos,
            host=dependencia.host,
            puerto=dependencia.puerto,
            email=dependencia.email,
            telefono=dependencia.telefono,
            direccion=dependencia.direccion,
        )
        if dependencia
        else None,
        grupos=[GrupoInfo(id_grupo=grupo.id_grupo, nombre=grupo.nombre)]
        if grupo
        else [],
    )


async def login(db: AsyncSession, login_data: LoginRequest) -> Optional[LoginResponse]:
    """Autentica al usuario en la base de datos seleccionada"""

    # 1. Buscar la conexión a la base de datos seleccionada en la BD central
    statement = select(ConexionDatabase).where(
        ConexionDatabase.nombre_database == login_data.base_datos
    )
    results = await db.exec(statement)
    conexion = results.first()

    # 2. Si no hay conexión en la BD central, usar valores por defecto
    host = conexion.host if conexion else "localhost"
    puerto = conexion.puerto if conexion else 5432
    usuario_db = conexion.usuario if conexion else "postgres"
    contrasenia_db = conexion.contrasenia if conexion else "1234"

    # 3. Conectarse a la base de datos seleccionada
    from sqlmodel import Session, create_engine

    engine = create_engine(
        "postgresql://",
        connect_args={
            "host": host,
            "port": puerto,
            "user": usuario_db,
            "password": contrasenia_db,
            "dbname": login_data.base_datos,
            "client_encoding": "utf8",
        },
    )

    # 4. Buscar el usuario en la base de datos seleccionada
    with Session(engine) as db_target:
        db_target.execute(text("SET client_encoding TO 'UTF8'"))
        statement = select(Usuario).where(Usuario.alias == login_data.alias)
        results = db_target.exec(statement)
        usuario = results.first()

        if not usuario:
            return None

        # 4. Verificar contraseña
        if not verify_password(login_data.contrasenia, usuario.contrasenia):
            return None

        # 5. Obtener la dependencia desde la BD central
        dependencia = None
        if usuario.id_dependencia:
            statement = select(Dependencia).where(
                Dependencia.id_dependencia == usuario.id_dependencia
            )
            results = await db.exec(statement)
            dependencia = results.first()

        # 6. Obtener grupo
        grupo = None
        if usuario.id_grupo:
            grupo = await db.get(Grupo, usuario.id_grupo)

        # 7. Obtener funcionalidades del grupo (desde la BD del usuario)
        statement = select(GrupoFuncionalidad).where(
            GrupoFuncionalidad.id_grupo == usuario.id_grupo
        )
        results = db_target.exec(statement)
        grupo_funcionalidades = results.all()

        funcionalidades = []
        for gf in grupo_funcionalidades:
            func = db_target.get(Funcionalidad, gf.id_funcionalidad)
            if func:
                funcionalidades.append(
                    FuncionalidadInfo(
                        id_funcionalidad=func.id_funcionalidad,
                        nombre=func.nombre,
                    )
                )

    # 8. Crear token JWT
    token_data = {
        "sub": str(usuario.id_usuario),
        "alias": usuario.alias,
        "base_datos": login_data.base_datos,
    }
    token = create_access_token(token_data)

    # 9. Guardar sesión en la base de datos
    fecha_expiracion = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    sesion = Sesion(
        id_usuario=usuario.id_usuario,
        token=token,
        base_datos=login_data.base_datos,
        fecha_expiracion=fecha_expiracion,
    )
    db.add(sesion)
    await db.commit()

    return LoginResponse(
        token=token,
        usuario=UsuarioInfo(
            id_usuario=usuario.id_usuario,
            ci=usuario.ci,
            nombre=usuario.nombre,
            primer_apellido=usuario.primer_apellido,
            segundo_apellido=usuario.segundo_apellido,
            alias=usuario.alias,
            dependencia=DependenciaInfo(
                id_dependencia=dependencia.id_dependencia,
                nombre=dependencia.nombre,
                base_datos=dependencia.base_datos,
                host=dependencia.host,
                puerto=dependencia.puerto,
                email=dependencia.email,
                telefono=dependencia.telefono,
                direccion=dependencia.direccion,
            )
            if dependencia
            else None,
        ),
        funcionalidades=funcionalidades,
        base_datos=login_data.base_datos,
    )


async def get_current_user(db: AsyncSession, token: str) -> Optional[UsuarioInfo]:
    """Obtiene el usuario actual basado en el token JWT"""
    payload = decode_token(token)
    if not payload:
        return None

    usuario_id = payload.get("sub")
    if not usuario_id:
        return None

    # Verificar que la sesión exista y no haya expirado
    statement = select(Sesion).where(Sesion.token == token)
    results = await db.exec(statement)
    sesion = results.first()

    if not sesion:
        return None

    if sesion.fecha_expiracion < datetime.utcnow():
        # Eliminar sesión expirada
        await db.delete(sesion)
        await db.commit()
        return None

    # Obtener usuario
    usuario = await db.get(Usuario, int(usuario_id))
    if not usuario:
        return None

    # Obtener dependencia
    dependencia = None
    if usuario.id_dependencia:
        dependencia = await db.get(Dependencia, usuario.id_dependencia)

    # Obtener grupo
    grupo = await db.get(Grupo, usuario.id_grupo)

    return UsuarioInfo(
        id_usuario=usuario.id_usuario,
        ci=usuario.ci,
        nombre=usuario.nombre,
        primer_apellido=usuario.primer_apellido,
        segundo_apellido=usuario.segundo_apellido,
        alias=usuario.alias,
        dependencia=DependenciaInfo(
            id_dependencia=dependencia.id_dependencia,
            nombre=dependencia.nombre,
            base_datos=dependencia.base_datos,
            host=dependencia.host,
            puerto=dependencia.puerto,
            email=dependencia.email,
            telefono=dependencia.telefono,
            direccion=dependencia.direccion,
        )
        if dependencia
        else None,
        grupo=GrupoInfo(
            id_grupo=grupo.id_grupo,
            nombre=grupo.nombre,
        )
        if grupo
        else None,
    )


async def get_funcionalidades_by_token(
    db: AsyncSession, token: str
) -> List[FuncionalidadInfo]:
    """Obtiene las funcionalidades del grupo del usuario basado en el token"""
    payload = decode_token(token)
    if not payload:
        return []

    usuario_id = payload.get("sub")
    if not usuario_id:
        return []

    # Obtener usuario
    usuario = await db.get(Usuario, int(usuario_id))
    if not usuario:
        return []

    # Obtener funcionalidades del grupo
    statement = select(GrupoFuncionalidad).where(
        GrupoFuncionalidad.id_grupo == usuario.id_grupo
    )
    results = await db.exec(statement)
    grupo_funcionalidades = results.all()

    funcionalidades = []
    for gf in grupo_funcionalidades:
        func = await db.get(Funcionalidad, gf.id_funcionalidad)
        if func:
            funcionalidades.append(
                FuncionalidadInfo(
                    id_funcionalidad=func.id_funcionalidad,
                    nombre=func.nombre,
                )
            )

    return funcionalidades


async def logout(db: AsyncSession, token: str) -> bool:
    """Cierra la sesión del usuario"""
    statement = select(Sesion).where(Sesion.token == token)
    results = await db.exec(statement)
    sesion = results.first()

    if sesion:
        await db.delete(sesion)
        await db.commit()
        return True

    return False


async def update_perfil(
    db: AsyncSession, token: str, perfil_data: PerfilUpdateRequest
) -> Optional[PerfilResponse]:
    """Actualiza el perfil del usuario (alias y/o contraseña)"""
    payload = decode_token(token)
    if not payload:
        return None

    usuario_id = payload.get("sub")
    if not usuario_id:
        return None

    # Obtener usuario
    usuario = await db.get(Usuario, int(usuario_id))
    if not usuario:
        return None

    # Verificar contraseña actual si se va a cambiar la contraseña
    if perfil_data.contrasenia_nueva:
        if not perfil_data.contrasenia_actual:
            return None
        if not verify_password(perfil_data.contrasenia_actual, usuario.contrasenia):
            return None
        usuario.contrasenia = get_password_hash(perfil_data.contrasenia_nueva)

    # Actualizar alias si se proporcionó
    if perfil_data.alias:
        # Verificar que el nuevo alias no esté en uso
        statement = select(Usuario).where(Usuario.alias == perfil_data.alias)
        results = await db.exec(statement)
        existing = results.first()
        if existing and existing.id_usuario != usuario.id_usuario:
            return None
        usuario.alias = perfil_data.alias

    await db.commit()
    await db.refresh(usuario)

    # Obtener dependencia y grupo
    dependencia = None
    if usuario.id_dependencia:
        dependencia = await db.get(Dependencia, usuario.id_dependencia)

    grupo = await db.get(Grupo, usuario.id_grupo)

    return PerfilResponse(
        id_usuario=usuario.id_usuario,
        ci=usuario.ci,
        nombre=usuario.nombre,
        primer_apellido=usuario.primer_apellido,
        segundo_apellido=usuario.segundo_apellido,
        alias=usuario.alias,
        grupo=GrupoInfo(
            id_grupo=grupo.id_grupo,
            nombre=grupo.nombre,
        )
        if grupo
        else None,
        dependencia=DependenciaInfo(
            id_dependencia=dependencia.id_dependencia,
            nombre=dependencia.nombre,
            base_datos=dependencia.base_datos,
            host=dependencia.host,
            puerto=dependencia.puerto,
            email=dependencia.email,
            telefono=dependencia.telefono,
            direccion=dependencia.direccion,
        )
        if dependencia
        else None,
    )


async def get_all_bases_datos_by_alias(
    db: AsyncSession, alias: str
) -> List[DependenciaInfo]:
    """Obtiene todas las bases de datos disponibles para un usuario (su dependencia + hijos que tienen base de datos)"""
    statement = select(Usuario).where(Usuario.alias == alias)
    results = await db.exec(statement)
    usuario = results.first()

    if not usuario or not usuario.id_dependencia:
        return []

    dependencias = await get_dependencia_with_hijos(db, usuario.id_dependencia)

    # Filtrar solo dependencias que tienen base de datos asignada
    dependencias_con_db = [d for d in dependencias if d.base_datos]

    return [
        DependenciaInfo(
            id_dependencia=d.id_dependencia,
            nombre=d.nombre,
            base_datos=d.base_datos,
            host=d.host,
            puerto=d.puerto,
            email=d.email,
            telefono=d.telefono,
            direccion=d.direccion,
        )
        for d in dependencias_con_db
    ]


async def register(
    db: AsyncSession, register_data: RegisterRequest
) -> Optional[LoginResponse]:
    """Registra un nuevo usuario en la base de datos seleccionada"""

    # 1. Buscar la conexión a la base de datos seleccionada
    statement = select(ConexionDatabase).where(
        ConexionDatabase.nombre_database == register_data.base_datos
    )
    results = await db.exec(statement)
    conexion = results.first()

    host = conexion.host if conexion else "localhost"
    puerto = conexion.puerto if conexion else 5432
    usuario_db = conexion.usuario if conexion else "postgres"
    contrasenia_db = conexion.contrasenia if conexion else "1234"

    # 2. Conectarse a la base de datos seleccionada
    from sqlmodel import Session, create_engine

    engine = create_engine(
        "postgresql://",
        connect_args={
            "host": host,
            "port": puerto,
            "user": usuario_db,
            "password": contrasenia_db,
            "dbname": register_data.base_datos,
            "client_encoding": "utf8",
        },
    )

    with Session(engine) as db_target:
        db_target.execute(text("SET client_encoding TO 'UTF8'"))
        # 3. Verificar que el alias no exista en la BD seleccionada
        statement = select(Usuario).where(Usuario.alias == register_data.alias)
        results = db_target.exec(statement)
        existing = results.first()
        if existing:
            return None

        # 4. Verificar que la dependencia exista en la BD seleccionada
        dep = db_target.get(Dependencia, register_data.id_dependencia)
        if not dep:
            return None

        # 5. Hashear contraseña con bcrypt
        hashed_password = get_password_hash(register_data.contrasenia)

        # 6. Buscar grupo ADMINISTRADOR (id_grupo=1)
        grupo = db_target.get(Grupo, 1)
        id_grupo = grupo.id_grupo if grupo else 1

        # 7. Crear el usuario
        usuario = Usuario(
            ci=register_data.ci,
            nombre=register_data.nombre,
            primer_apellido=register_data.primer_apellido,
            segundo_apellido=register_data.segundo_apellido,
            cargo=register_data.cargo,
            alias=register_data.alias,
            contrasenia=hashed_password,
            id_grupo=id_grupo,
            id_dependencia=register_data.id_dependencia,
        )
        db_target.add(usuario)
        db_target.commit()
        db_target.refresh(usuario)

        # 8. Obtener funcionalidades del grupo
        statement = select(GrupoFuncionalidad).where(
            GrupoFuncionalidad.id_grupo == id_grupo
        )
        results = db_target.exec(statement)
        grupo_funcionalidades = results.all()

        funcionalidades = []
        for gf in grupo_funcionalidades:
            func = db_target.get(Funcionalidad, gf.id_funcionalidad)
            if func:
                funcionalidades.append(
                    FuncionalidadInfo(
                        id_funcionalidad=func.id_funcionalidad,
                        nombre=func.nombre,
                    )
                )

    # 9. Obtener dependencia y grupo desde la BD central para la respuesta
    dependencia_central = None
    statement = select(Dependencia).where(
        Dependencia.id_dependencia == register_data.id_dependencia
    )
    results = await db.exec(statement)
    dependencia_central = results.first()

    grupo_central = await db.get(Grupo, id_grupo)

    # 10. Crear token JWT
    token_data = {
        "sub": str(usuario.id_usuario),
        "alias": usuario.alias,
        "base_datos": register_data.base_datos,
    }
    token = create_access_token(token_data)

    # 11. Guardar sesión
    fecha_expiracion = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    sesion = Sesion(
        id_usuario=usuario.id_usuario,
        token=token,
        base_datos=register_data.base_datos,
        fecha_expiracion=fecha_expiracion,
    )
    db.add(sesion)
    await db.commit()

    return LoginResponse(
        token=token,
        usuario=UsuarioInfo(
            id_usuario=usuario.id_usuario,
            ci=usuario.ci,
            nombre=usuario.nombre,
            primer_apellido=usuario.primer_apellido,
            segundo_apellido=usuario.segundo_apellido,
            alias=usuario.alias,
            dependencia=DependenciaInfo(
                id_dependencia=dependencia_central.id_dependencia,
                nombre=dependencia_central.nombre,
                base_datos=dependencia_central.base_datos or "",
                host=dependencia_central.host or "localhost",
                puerto=dependencia_central.puerto or 5432,
                telefono=dependencia_central.telefono,
                direccion=dependencia_central.direccion,
            )
            if dependencia_central
            else None,
            grupo=GrupoInfo(
                id_grupo=grupo_central.id_grupo,
                nombre=grupo_central.nombre,
            )
            if grupo_central
            else None,
        ),
        funcionalidades=funcionalidades,
        base_datos=register_data.base_datos,
    )


class AuthService:
    @staticmethod
    async def login(
        db: AsyncSession, login_data: LoginRequest
    ) -> Optional[LoginResponse]:
        return await login(db, login_data)

    @staticmethod
    async def logout(db: AsyncSession, token: str) -> bool:
        return await logout(db, token)

    @staticmethod
    async def get_current_user(db: AsyncSession, token: str) -> Optional[UsuarioInfo]:
        return await get_current_user(db, token)

    @staticmethod
    async def get_funcionalidades_by_token(
        db: AsyncSession, token: str
    ) -> List[FuncionalidadInfo]:
        return await get_funcionalidades_by_token(db, token)

    @staticmethod
    async def search_by_alias(
        db: AsyncSession, alias: str
    ) -> Optional[AliasSearchResponse]:
        return await search_by_alias(db, alias)

    @staticmethod
    async def get_all_bases_datos_by_alias(
        db: AsyncSession, alias: str
    ) -> List[DependenciaInfo]:
        return await get_all_bases_datos_by_alias(db, alias)

    @staticmethod
    async def update_perfil(
        db: AsyncSession, token: str, perfil_data: PerfilUpdateRequest
    ) -> PerfilResponse:
        return await update_perfil(db, token, perfil_data)

    @staticmethod
    async def register(
        db: AsyncSession, register_data: RegisterRequest
    ) -> Optional[LoginResponse]:
        return await register(db, register_data)


auth_service = AuthService()
