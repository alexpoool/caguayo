from src.repository import categorias_repo
from src.models import Categorias
from src.dto import CategoriasCreate, CategoriasUpdate, CategoriasRead
from src.services.base_service import GenericService
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List


class CategoriaServiceClass(
    GenericService[Categorias, CategoriasCreate, CategoriasUpdate, CategoriasRead]
):
    _cache_all_categorias: List[CategoriasRead] | None = None

    async def get_all(self, db: AsyncSession) -> List[CategoriasRead]:
        if self._cache_all_categorias is not None:
            return self._cache_all_categorias
        result = await super().get_all(db)
        self._cache_all_categorias = result
        return result

    async def create(
        self, db: AsyncSession, *, obj_in: CategoriasCreate
    ) -> CategoriasRead:
        result = await super().create(db, obj_in=obj_in)
        self._cache_all_categorias = None
        return result

    async def update(
        self, db: AsyncSession, *, db_obj: Categorias, obj_in: CategoriasUpdate
    ) -> CategoriasRead:
        result = await super().update(db, db_obj=db_obj, obj_in=obj_in)
        self._cache_all_categorias = None
        return result


categoria_service = CategoriaServiceClass(
    repository=categorias_repo,
    read_schema=CategoriasRead,
    model_name="Categorias",
    default_load_options=[selectinload(Categorias.subcategorias)],
)
