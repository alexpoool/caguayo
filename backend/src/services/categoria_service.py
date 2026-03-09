from typing import List
from sqlmodel.ext.asyncio.session import AsyncSession
from src.repository import categorias_repo
from src.dto import (
    CategoriasCreate,
    CategoriasUpdate,
    CategoriasRead,
)


class CategoriasService:
    @staticmethod
    async def create_categoria(
        db: AsyncSession, categoria: CategoriasCreate
    ) -> CategoriasRead:
        db_categoria = await categorias_repo.create(db, obj_in=categoria)
        return CategoriasRead.from_orm(db_categoria)

    @staticmethod
    async def get_categoria(db: AsyncSession, categoria_id: int) -> CategoriasRead:
        db_categoria = await categorias_repo.get(db, id=categoria_id)
        return CategoriasRead.from_orm(db_categoria) if db_categoria else None

    @staticmethod
    async def get_categorias(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[CategoriasRead]:
        db_categorias = await categorias_repo.get_multi(db, skip=skip, limit=limit)
        return [CategoriasRead.from_orm(c) for c in db_categorias]

    @staticmethod
    async def update_categoria(
        db: AsyncSession, categoria_id: int, categoria: CategoriasUpdate
    ) -> CategoriasRead:
        db_categoria = await categorias_repo.get(db, id=categoria_id)
        if db_categoria:
            updated_categoria = await categorias_repo.update(
                db, db_obj=db_categoria, obj_in=categoria
            )
            return CategoriasRead.from_orm(updated_categoria)
        return None

    @staticmethod
    async def delete_categoria(db: AsyncSession, categoria_id: int) -> bool:
        result = await categorias_repo.remove(db, id=categoria_id)
        return result is not None
