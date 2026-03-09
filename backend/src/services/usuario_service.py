import hashlib
from typing import List
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select
from src.repository.base import CRUDBase
from src.models import Grupo, Usuario, Funcionalidad, GrupoFuncionalidad
from src.dto import (
    GrupoCreate,
    GrupoUpdate,
    GrupoRead,
    GrupoSimpleRead,
    FuncionalidadRead,
    UsuarioCreate,
    UsuarioUpdate,
    UsuarioRead,
    DependenciaSimpleRead,
)

grupo_repo = CRUDBase[Grupo, GrupoCreate, GrupoUpdate](Grupo)
usuario_repo = CRUDBase[Usuario, UsuarioCreate, UsuarioUpdate](Usuario)


class GrupoService:
    @staticmethod
    async def create(db: AsyncSession, data: GrupoCreate) -> GrupoRead:
        funcionalidades_ids = data.funcionalidades or []
        data_dict = data.model_dump(exclude={"funcionalidades"})

        db_obj = Grupo(**data_dict)
        db.add(db_obj)
        await db.flush()

        for func_id in funcionalidades_ids:
            gf = GrupoFuncionalidad(id_grupo=db_obj.id_grupo, id_funcionalidad=func_id)
            db.add(gf)

        await db.commit()
        await db.refresh(db_obj)

        return await GrupoService._build_grupo_read(db, db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> GrupoRead:
        statement = (
            select(Grupo)
            .where(Grupo.id_grupo == id)
            .options(
                selectinload(Grupo.funcionalidades).selectinload(
                    GrupoFuncionalidad.funcionalidad
                )
            )
        )
        result = await db.exec(statement)
        db_obj = result.one_or_none()
        return await GrupoService._build_grupo_read(db, db_obj) if db_obj else None

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[GrupoRead]:
        statement = (
            select(Grupo)
            .offset(skip)
            .limit(limit)
            .options(
                selectinload(Grupo.funcionalidades).selectinload(
                    GrupoFuncionalidad.funcionalidad
                )
            )
        )
        result = await db.exec(statement)
        db_objs = result.all()
        return [await GrupoService._build_grupo_read(db, obj) for obj in db_objs]

    @staticmethod
    async def update(db: AsyncSession, id: int, data: GrupoUpdate) -> GrupoRead:
        db_obj = await grupo_repo.get(db, id=id)
        if db_obj:
            data_dict = data.model_dump(exclude={"funcionalidades"}, exclude_unset=True)
            for key, value in data_dict.items():
                setattr(db_obj, key, value)

            if data.funcionalidades is not None:
                statement = select(GrupoFuncionalidad).where(
                    GrupoFuncionalidad.id_grupo == id
                )
                result = await db.exec(statement)
                existing = result.all()
                for gf in existing:
                    await db.delete(gf)

                for func_id in data.funcionalidades:
                    gf = GrupoFuncionalidad(id_grupo=id, id_funcionalidad=func_id)
                    db.add(gf)

            await db.commit()
            await db.refresh(db_obj)
            return await GrupoService._build_grupo_read(db, db_obj)
        return None

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await grupo_repo.remove(db, id=id)
        return result is not None

    @staticmethod
    async def _build_grupo_read(db: AsyncSession, grupo: Grupo) -> GrupoRead:
        statement = (
            select(GrupoFuncionalidad)
            .where(GrupoFuncionalidad.id_grupo == grupo.id_grupo)
            .options(selectinload(GrupoFuncionalidad.funcionalidad))
        )
        result = await db.exec(statement)
        funcionalidades = result.all()

        func_reads = [
            FuncionalidadRead(
                id_funcionalidad=gf.funcionalidad.id_funcionalidad,
                nombre=gf.funcionalidad.nombre,
            )
            for gf in funcionalidades
        ]

        return GrupoRead(
            id_grupo=grupo.id_grupo,
            nombre=grupo.nombre,
            descripcion=grupo.descripcion,
            funcionalidades=func_reads,
        )


class UsuarioService:
    @staticmethod
    def _generar_alias(nombre: str, primer_apellido: str) -> str:
        return f"{nombre.lower()}.{primer_apellido.lower()}"

    @staticmethod
    def _generar_contrasenia(ci: str) -> tuple[str, str]:
        import random
        import string

        password_temporal = "".join(
            random.choices(string.ascii_lowercase + string.digits, k=8)
        )
        contrasenia_hasheada = hashlib.sha256(password_temporal.encode()).hexdigest()[
            :32
        ]
        return contrasenia_hasheada, password_temporal

    @staticmethod
    async def create(db: AsyncSession, data: UsuarioCreate) -> UsuarioRead:
        # Generar alias y contraseña si no vienen en los datos
        alias = data.alias or UsuarioService._generar_alias(
            data.nombre, data.primer_apellido
        )

        if data.contrasenia:
            contrasenia = data.contrasenia
            password_temporal = data.contrasenia
        else:
            contrasenia, password_temporal = UsuarioService._generar_contrasenia(
                data.ci
            )

        # Crear objeto con todos los datos
        usuario_data = {
            "ci": data.ci,
            "nombre": data.nombre,
            "primer_apellido": data.primer_apellido,
            "segundo_apellido": data.segundo_apellido,
            "id_grupo": data.id_grupo,
            "id_dependencia": data.id_dependencia,
            "alias": alias,
            "contrasenia": contrasenia,
        }

        db_obj = await usuario_repo.create(db, obj_in=UsuarioCreate(**usuario_data))

        # Recargar el objeto con las relaciones
        statement = (
            select(Usuario)
            .where(Usuario.id_usuario == db_obj.id_usuario)
            .options(
                selectinload(Usuario.grupo),
                selectinload(Usuario.dependencia),
            )
        )
        results = await db.exec(statement)
        db_obj = results.first()

        # Construir manualmente el objeto de respuesta para evitar el problema de lazy loading
        grupo_data = None
        if db_obj.grupo:
            grupo_data = GrupoSimpleRead(
                id_grupo=db_obj.grupo.id_grupo,
                nombre=db_obj.grupo.nombre,
                descripcion=db_obj.grupo.descripcion,
            )

        dependencia_data = None
        if db_obj.dependencia:
            dependencia_data = DependenciaSimpleRead(
                id_dependencia=db_obj.dependencia.id_dependencia,
                nombre=db_obj.dependencia.nombre,
            )

        return UsuarioRead(
            id_usuario=db_obj.id_usuario,
            ci=db_obj.ci,
            nombre=db_obj.nombre,
            primer_apellido=db_obj.primer_apellido,
            segundo_apellido=db_obj.segundo_apellido,
            alias=db_obj.alias,
            id_grupo=db_obj.id_grupo,
            id_dependencia=db_obj.id_dependencia,
            password_temporal=password_temporal,
            grupo=grupo_data,
            dependencia=dependencia_data,
        )

    @staticmethod
    async def get(db: AsyncSession, id: int) -> UsuarioRead:
        statement = (
            select(Usuario)
            .where(Usuario.id_usuario == id)
            .options(
                selectinload(Usuario.grupo),
                selectinload(Usuario.dependencia),
            )
        )
        results = await db.exec(statement)
        db_obj = results.first()
        if not db_obj:
            return None

        grupo_data = None
        if db_obj.grupo:
            grupo_data = GrupoSimpleRead(
                id_grupo=db_obj.grupo.id_grupo,
                nombre=db_obj.grupo.nombre,
                descripcion=db_obj.grupo.descripcion,
            )

        dependencia_data = None
        if db_obj.dependencia:
            dependencia_data = DependenciaSimpleRead(
                id_dependencia=db_obj.dependencia.id_dependencia,
                nombre=db_obj.dependencia.nombre,
            )

        return UsuarioRead(
            id_usuario=db_obj.id_usuario,
            ci=db_obj.ci,
            nombre=db_obj.nombre,
            primer_apellido=db_obj.primer_apellido,
            segundo_apellido=db_obj.segundo_apellido,
            alias=db_obj.alias,
            id_grupo=db_obj.id_grupo,
            id_dependencia=db_obj.id_dependencia,
            grupo=grupo_data,
            dependencia=dependencia_data,
        )

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[UsuarioRead]:
        statement = (
            select(Usuario)
            .options(
                selectinload(Usuario.grupo),
                selectinload(Usuario.dependencia),
            )
            .offset(skip)
            .limit(limit)
        )
        results = await db.exec(statement)
        db_objs = results.all()

        usuarios = []
        for db_obj in db_objs:
            grupo_data = None
            if db_obj.grupo:
                grupo_data = GrupoSimpleRead(
                    id_grupo=db_obj.grupo.id_grupo,
                    nombre=db_obj.grupo.nombre,
                    descripcion=db_obj.grupo.descripcion,
                )

            dependencia_data = None
            if db_obj.dependencia:
                dependencia_data = DependenciaSimpleRead(
                    id_dependencia=db_obj.dependencia.id_dependencia,
                    nombre=db_obj.dependencia.nombre,
                )

            usuarios.append(
                UsuarioRead(
                    id_usuario=db_obj.id_usuario,
                    ci=db_obj.ci,
                    nombre=db_obj.nombre,
                    primer_apellido=db_obj.primer_apellido,
                    segundo_apellido=db_obj.segundo_apellido,
                    alias=db_obj.alias,
                    id_grupo=db_obj.id_grupo,
                    id_dependencia=db_obj.id_dependencia,
                    grupo=grupo_data,
                    dependencia=dependencia_data,
                )
            )
        return usuarios

    @staticmethod
    async def update(db: AsyncSession, id: int, data: UsuarioUpdate) -> UsuarioRead:
        statement = (
            select(Usuario)
            .where(Usuario.id_usuario == id)
            .options(
                selectinload(Usuario.grupo),
                selectinload(Usuario.dependencia),
            )
        )
        results = await db.exec(statement)
        db_obj = results.first()
        if not db_obj:
            return None

        updated = await usuario_repo.update(db, db_obj=db_obj, obj_in=data)

        # Recargar para obtener las relaciones
        statement = (
            select(Usuario)
            .where(Usuario.id_usuario == id)
            .options(
                selectinload(Usuario.grupo),
                selectinload(Usuario.dependencia),
            )
        )
        results = await db.exec(statement)
        db_obj = results.first()

        grupo_data = None
        if db_obj and db_obj.grupo:
            grupo_data = GrupoSimpleRead(
                id_grupo=db_obj.grupo.id_grupo,
                nombre=db_obj.grupo.nombre,
                descripcion=db_obj.grupo.descripcion,
            )

        dependencia_data = None
        if db_obj and db_obj.dependencia:
            dependencia_data = DependenciaSimpleRead(
                id_dependencia=db_obj.dependencia.id_dependencia,
                nombre=db_obj.dependencia.nombre,
            )

        return UsuarioRead(
            id_usuario=updated.id_usuario,
            ci=updated.ci,
            nombre=updated.nombre,
            primer_apellido=updated.primer_apellido,
            segundo_apellido=updated.segundo_apellido,
            alias=updated.alias,
            id_grupo=updated.id_grupo,
            id_dependencia=updated.id_dependencia,
            grupo=grupo_data,
            dependencia=dependencia_data,
        )

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await usuario_repo.remove(db, id=id)
        return result is not None
