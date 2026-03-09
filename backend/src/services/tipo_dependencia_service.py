from typing import List
from sqlmodel.ext.asyncio.session import AsyncSession
from src.repository.base import CRUDBase
from src.models import TipoDependencia
from src.dto import (
    TipoDependenciaCreate,
    TipoDependenciaUpdate,
    TipoDependenciaRead,
)

tipo_dependencia_repo = CRUDBase[
    TipoDependencia, TipoDependenciaCreate, TipoDependenciaUpdate
](TipoDependencia)


class TipoDependenciaService:
    @staticmethod
    async def create(
        db: AsyncSession, data: TipoDependenciaCreate
    ) -> TipoDependenciaRead:
        db_obj = await tipo_dependencia_repo.create(db, obj_in=data)
        return TipoDependenciaRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> TipoDependenciaRead:
        db_obj = await tipo_dependencia_repo.get(db, id=id)
        return TipoDependenciaRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[TipoDependenciaRead]:
        db_objs = await tipo_dependencia_repo.get_multi(db, skip=skip, limit=limit)
        return [TipoDependenciaRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def update(
        db: AsyncSession, id: int, data: TipoDependenciaUpdate
    ) -> TipoDependenciaRead:
        db_obj = await tipo_dependencia_repo.get(db, id=id)
        if db_obj:
            updated = await tipo_dependencia_repo.update(db, db_obj=db_obj, obj_in=data)
            return TipoDependenciaRead.model_validate(updated)
        return None

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await tipo_dependencia_repo.remove(db, id=id)
        return result is not None
