from typing import List
from sqlmodel.ext.asyncio.session import AsyncSession
from src.repository.base import CRUDBase
from src.models import TipoCuenta
from src.dto import TipoCuentaCreate, TipoCuentaUpdate, TipoCuentaRead

tipo_cuenta_repo = CRUDBase[TipoCuenta, TipoCuentaCreate, TipoCuentaUpdate](TipoCuenta)


class TipoCuentaService:
    @staticmethod
    async def create(db: AsyncSession, data: TipoCuentaCreate) -> TipoCuentaRead:
        db_obj = await tipo_cuenta_repo.create(db, obj_in=data)
        return TipoCuentaRead.model_validate(db_obj)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> TipoCuentaRead:
        db_obj = await tipo_cuenta_repo.get(db, id=id)
        return TipoCuentaRead.model_validate(db_obj) if db_obj else None

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[TipoCuentaRead]:
        db_objs = await tipo_cuenta_repo.get_multi(db, skip=skip, limit=limit)
        return [TipoCuentaRead.model_validate(obj) for obj in db_objs]

    @staticmethod
    async def update(
        db: AsyncSession, id: int, data: TipoCuentaUpdate
    ) -> TipoCuentaRead:
        db_obj = await tipo_cuenta_repo.get(db, id=id)
        if db_obj:
            updated = await tipo_cuenta_repo.update(db, db_obj=db_obj, obj_in=data)
            return TipoCuentaRead.model_validate(updated)
        return None

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        result = await tipo_cuenta_repo.remove(db, id=id)
        return result is not None
