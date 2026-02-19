import hashlib
from typing import List
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select
from src.repository.base import CRUDBase
from src.models import Grupo, Usuario
from src.dto import (
    GrupoCreate,
    GrupoUpdate,
    GrupoRead,
    UsuarioCreate,
    UsuarioUpdate,
    UsuarioRead,
)

grupo_repo = CRUDBase[Grupo, GrupoCreate, GrupoUpdate](Grupo)
usuario_repo = CRUDBase[Usuario, UsuarioCreate, UsuarioUpdate](Usuario)


class GrupoService:
    @staticmethod
    async def create(db: AsyncSession, data: GrupoCreate) -> GrupoRead:
        db_obj = await grupo_repo.create(db, obj_in=data)
        return GrupoRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> GrupoRead:
        db_obj = await grupo_repo.get(db, id=id)
        return GrupoRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[GrupoRead]:
        db_objs = await grupo_repo.get_multi(db, skip=skip, limit=limit)
        return [GrupoRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def update(db: AsyncSession, id: int, data: GrupoUpdate) -> GrupoRead:
        db_obj = await grupo_repo.get(db, id=id)
        if db_obj:
            updated = await grupo_repo.update(db, db_obj=db_obj, obj_in=data)
            return GrupoRead.model_validate(updated)
        return None

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await grupo_repo.remove(db, id=id)
        return result is not None


class UsuarioService:
    @staticmethod
    def _generar_alias(nombre: str, primer_apellido: str) -> str:
        return f"{nombre.lower()}.{primer_apellido.lower()}"

    @staticmethod
    def _generar_contrasenia(ci: str) -> str:
        return hashlib.sha256(ci.encode()).hexdigest()[:32]

    @staticmethod
    async def create(db: AsyncSession, data: UsuarioCreate) -> UsuarioRead:
        # Generar alias y contraseña si no vienen en los datos
        alias = data.alias or UsuarioService._generar_alias(
            data.nombre, data.primer_apellido
        )
        contrasenia = data.contrasenia or UsuarioService._generar_contrasenia(data.ci)

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

        return UsuarioRead.model_validate(db_obj)

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
        return UsuarioRead.model_validate(db_obj) if db_obj else None

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
        return [UsuarioRead.model_validate(obj) for obj in db_objs]

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
        if db_obj:
            updated = await usuario_repo.update(db, db_obj=db_obj, obj_in=data)
            return UsuarioRead.model_validate(updated)
        return None

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await usuario_repo.remove(db, id=id)
        return result is not None
