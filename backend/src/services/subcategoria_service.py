from typing import List
from sqlmodel.ext.asyncio.session import AsyncSession
from src.repository.subcategorias_repo import subcategorias_repo
from src.dto import (
    SubcategoriasCreate,
    SubcategoriasUpdate,
    SubcategoriasRead,
)


def _to_read_dto(db_subcategoria) -> SubcategoriasRead:
    """Convierte un modelo de base de datos a DTO, evitando problemas con relaciones lazy."""
    return SubcategoriasRead(
        id_subcategoria=db_subcategoria.id_subcategoria,
        id_categoria=db_subcategoria.id_categoria,
        nombre=db_subcategoria.nombre,
        descripcion=db_subcategoria.descripcion,
        categoria=None,  # No cargamos la relación para evitar problemas
    )


class SubcategoriasService:
    @staticmethod
    async def create_subcategoria(
        db: AsyncSession, subcategoria: SubcategoriasCreate
    ) -> SubcategoriasRead:
        db_subcategoria = await subcategorias_repo.create(db, obj_in=subcategoria)
        return _to_read_dto(db_subcategoria)

    @staticmethod
    async def get_subcategoria(
        db: AsyncSession, subcategoria_id: int
    ) -> SubcategoriasRead | None:
        db_subcategoria = await subcategorias_repo.get(db, id=subcategoria_id)
        return _to_read_dto(db_subcategoria) if db_subcategoria else None

    @staticmethod
    async def get_subcategorias(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[SubcategoriasRead]:
        db_subcategorias = await subcategorias_repo.get_multi(
            db, skip=skip, limit=limit
        )
        return [_to_read_dto(s) for s in db_subcategorias]

    @staticmethod
    async def update_subcategoria(
        db: AsyncSession, subcategoria_id: int, subcategoria: SubcategoriasUpdate
    ) -> SubcategoriasRead | None:
        db_subcategoria = await subcategorias_repo.get(db, id=subcategoria_id)
        if db_subcategoria:
            updated_subcategoria = await subcategorias_repo.update(
                db, db_obj=db_subcategoria, obj_in=subcategoria
            )
            return _to_read_dto(updated_subcategoria)
        return None

    @staticmethod
    async def delete_subcategoria(db: AsyncSession, subcategoria_id: int) -> bool:
        result = await subcategorias_repo.remove(db, id=subcategoria_id)
        return result is not None
