from typing import List
from sqlmodel.ext.asyncio.session import AsyncSession
from src.repository.base import CRUDBase
from src.models import Cuenta
from src.dto import CuentaCreate, CuentaUpdate, CuentaRead

cuenta_repo = CRUDBase[Cuenta, CuentaCreate, CuentaUpdate](Cuenta)


class CuentaService:
    @staticmethod
    async def create(db: AsyncSession, data: CuentaCreate) -> CuentaRead:
        db_obj = await cuenta_repo.create(db, obj_in=data)
        return CuentaRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> CuentaRead:
        db_obj = await cuenta_repo.get(db, id=id)
        return CuentaRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[CuentaRead]:
        db_objs = await cuenta_repo.get_multi(db, skip=skip, limit=limit)
        return [CuentaRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def update(db: AsyncSession, id: int, data: CuentaUpdate) -> CuentaRead:
        db_obj = await cuenta_repo.get(db, id=id)
        if db_obj:
            updated = await cuenta_repo.update(db, db_obj=db_obj, obj_in=data)
            return CuentaRead.model_validate(updated)
        return None

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await cuenta_repo.remove(db, id=id)
        return result is not None
