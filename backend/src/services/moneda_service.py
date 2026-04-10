from src.repository.base import CRUDBase
from src.models import Moneda
from src.dto import MonedaCreate, MonedaUpdate, MonedaRead
from src.services.base_service import GenericService
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List

moneda_repo = CRUDBase[Moneda, MonedaCreate, MonedaUpdate](Moneda)


class MonedaServiceClass(
    GenericService[Moneda, MonedaCreate, MonedaUpdate, MonedaRead]
):
    _cache_all_monedas: List[MonedaRead] | None = None

    async def get_all(self, db: AsyncSession) -> List[MonedaRead]:
        if self._cache_all_monedas is not None:
            return self._cache_all_monedas
        result = await super().get_all(db)
        self._cache_all_monedas = result
        return result

    async def create(self, db: AsyncSession, *, obj_in: MonedaCreate) -> MonedaRead:
        result = await super().create(db, obj_in=obj_in)
        self._cache_all_monedas = None
        return result

    async def update(
        self, db: AsyncSession, *, db_obj: Moneda, obj_in: MonedaUpdate
    ) -> MonedaRead:
        result = await super().update(db, db_obj=db_obj, obj_in=obj_in)
        self._cache_all_monedas = None
        return result

    async def remove(self, db: AsyncSession, *, id: int) -> MonedaRead:
        result = await super().remove(db, id=id)
        self._cache_all_monedas = None
        return result


moneda_service = MonedaServiceClass(
    repository=moneda_repo, read_schema=MonedaRead, model_name="Moneda"
)
