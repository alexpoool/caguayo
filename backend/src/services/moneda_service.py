from typing import List
from sqlmodel.ext.asyncio.session import AsyncSession
from src.repository.base import CRUDBase
from src.models import Moneda
from src.dto import MonedaCreate, MonedaUpdate, MonedaRead

# Crear instancia del repositorio CRUD
moneda_repo = CRUDBase[Moneda, MonedaCreate, MonedaUpdate](Moneda)


class MonedaService:
    @staticmethod
    async def create_moneda(db: AsyncSession, moneda: MonedaCreate) -> MonedaRead:
        db_moneda = await moneda_repo.create(db, obj_in=moneda)
        return MonedaRead.model_validate(db_moneda)

    @staticmethod
    async def get_moneda(db: AsyncSession, moneda_id: int) -> MonedaRead:
        db_moneda = await moneda_repo.get(db, id=moneda_id)
        return MonedaRead.model_validate(db_moneda) if db_moneda else None

    @staticmethod
    async def get_monedas(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[MonedaRead]:
        db_monedas = await moneda_repo.get_multi(db, skip=skip, limit=limit)
        return [MonedaRead.model_validate(m) for m in db_monedas]

    @staticmethod
    async def update_moneda(
        db: AsyncSession, moneda_id: int, moneda: MonedaUpdate
    ) -> MonedaRead:
        db_moneda = await moneda_repo.get(db, id=moneda_id)
        if db_moneda:
            updated_moneda = await moneda_repo.update(
                db, db_obj=db_moneda, obj_in=moneda
            )
            return MonedaRead.model_validate(updated_moneda)
        return None

    @staticmethod
    async def delete_moneda(db: AsyncSession, moneda_id: int) -> bool:
        result = await moneda_repo.remove(db, id=moneda_id)
        return result is not None
