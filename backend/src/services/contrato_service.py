from typing import List
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from src.repository.base import CRUDBase
from src.models import TipoContrato, EstadoContrato
from src.dto import (
    TipoContratoCreate,
    TipoContratoUpdate,
    TipoContratoRead,
    EstadoContratoCreate,
    EstadoContratoUpdate,
    EstadoContratoRead,
)

tipo_contrato_repo = CRUDBase[TipoContrato, TipoContratoCreate, TipoContratoUpdate](
    TipoContrato
)
estado_contrato_repo = CRUDBase[
    EstadoContrato, EstadoContratoCreate, EstadoContratoUpdate
](EstadoContrato)


class TipoContratoService:
    @staticmethod
    async def create(db: AsyncSession, data: TipoContratoCreate) -> TipoContratoRead:
        db_obj = await tipo_contrato_repo.create(db, obj_in=data)
        return TipoContratoRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> TipoContratoRead:
        db_obj = await tipo_contrato_repo.get(db, id=id)
        return TipoContratoRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[TipoContratoRead]:
        db_objs = await tipo_contrato_repo.get_multi(db, skip=skip, limit=limit)
        return [TipoContratoRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def update(
        db: AsyncSession, id: int, data: TipoContratoUpdate
    ) -> TipoContratoRead:
        db_obj = await tipo_contrato_repo.get(db, id=id)
        if db_obj:
            updated = await tipo_contrato_repo.update(db, db_obj=db_obj, obj_in=data)
            return TipoContratoRead.model_validate(updated)
        return None

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await tipo_contrato_repo.remove(db, id=id)
        return result is not None


class EstadoContratoService:
    @staticmethod
    async def create(
        db: AsyncSession, data: EstadoContratoCreate
    ) -> EstadoContratoRead:
        db_obj = await estado_contrato_repo.create(db, obj_in=data)
        return EstadoContratoRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> EstadoContratoRead:
        db_obj = await estado_contrato_repo.get(db, id=id)
        return EstadoContratoRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[EstadoContratoRead]:
        db_objs = await estado_contrato_repo.get_multi(db, skip=skip, limit=limit)
        return [EstadoContratoRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def update(
        db: AsyncSession, id: int, data: EstadoContratoUpdate
    ) -> EstadoContratoRead:
        db_obj = await estado_contrato_repo.get(db, id=id)
        if db_obj:
            updated = await estado_contrato_repo.update(db, db_obj=db_obj, obj_in=data)
            return EstadoContratoRead.model_validate(updated)
        return None

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await estado_contrato_repo.remove(db, id=id)
        return result is not None
