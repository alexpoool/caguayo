from typing import List
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from src.repository.base import CRUDBase
from src.models import TipoProvedor, TipoConvenio
from src.dto import (
    TipoProvedorCreate,
    TipoProvedorUpdate,
    TipoProvedorRead,
    TipoConvenioCreate,
    TipoConvenioUpdate,
    TipoConvenioRead,
)

tipo_provedor_repo = CRUDBase[TipoProvedor, TipoProvedorCreate, TipoProvedorUpdate](
    TipoProvedor
)
tipo_convenio_repo = CRUDBase[TipoConvenio, TipoConvenioCreate, TipoConvenioUpdate](
    TipoConvenio
)


class TipoProvedorService:
    @staticmethod
    async def create(db: AsyncSession, data: TipoProvedorCreate) -> TipoProvedorRead:
        db_obj = await tipo_provedor_repo.create(db, obj_in=data)
        return TipoProvedorRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> TipoProvedorRead:
        db_obj = await tipo_provedor_repo.get(db, id=id)
        return TipoProvedorRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[TipoProvedorRead]:
        db_objs = await tipo_provedor_repo.get_multi(db, skip=skip, limit=limit)
        return [TipoProvedorRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def update(
        db: AsyncSession, id: int, data: TipoProvedorUpdate
    ) -> TipoProvedorRead:
        db_obj = await tipo_provedor_repo.get(db, id=id)
        if db_obj:
            updated = await tipo_provedor_repo.update(db, db_obj=db_obj, obj_in=data)
            return TipoProvedorRead.model_validate(updated)
        return None

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await tipo_provedor_repo.remove(db, id=id)
        return result is not None


class TipoConvenioService:
    @staticmethod
    async def create(db: AsyncSession, data: TipoConvenioCreate) -> TipoConvenioRead:
        db_obj = await tipo_convenio_repo.create(db, obj_in=data)
        return TipoConvenioRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> TipoConvenioRead:
        db_obj = await tipo_convenio_repo.get(db, id=id)
        return TipoConvenioRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[TipoConvenioRead]:
        db_objs = await tipo_convenio_repo.get_multi(db, skip=skip, limit=limit)
        return [TipoConvenioRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def update(
        db: AsyncSession, id: int, data: TipoConvenioUpdate
    ) -> TipoConvenioRead:
        db_obj = await tipo_convenio_repo.get(db, id=id)
        if db_obj:
            updated = await tipo_convenio_repo.update(db, db_obj=db_obj, obj_in=data)
            return TipoConvenioRead.model_validate(updated)
        return None

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await tipo_convenio_repo.remove(db, id=id)
        return result is not None
