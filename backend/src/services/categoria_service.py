from typing import List
from sqlmodel import Session
from src.repository import categorias_repo
from src.dto import (
    CategoriasCreate,
    CategoriasUpdate,
    CategoriasRead,
)

class CategoriasService:
    @staticmethod
    def create_categoria(db: Session, categoria: CategoriasCreate) -> CategoriasRead:
        db_categoria = categorias_repo.create(db, obj_in=categoria)
        return CategoriasRead.from_orm(db_categoria)

    @staticmethod
    def get_categoria(db: Session, categoria_id: int) -> CategoriasRead:
        db_categoria = categorias_repo.get(db, id=categoria_id)
        return CategoriasRead.from_orm(db_categoria) if db_categoria else None

    @staticmethod
    def get_categorias(
        db: Session, skip: int = 0, limit: int = 100
    ) -> List[CategoriasRead]:
        db_categorias = categorias_repo.get_multi(db, skip=skip, limit=limit)
        return [CategoriasRead.from_orm(c) for c in db_categorias]

    @staticmethod
    def update_categoria(
        db: Session, categoria_id: int, categoria: CategoriasUpdate
    ) -> CategoriasRead:
        db_categoria = categorias_repo.get(db, id=categoria_id)
        if db_categoria:
            updated_categoria = categorias_repo.update(
                db, db_obj=db_categoria, obj_in=categoria
            )
            return CategoriasRead.from_orm(updated_categoria)
        return None

    @staticmethod
    def delete_categoria(db: Session, categoria_id: int) -> bool:
        return categorias_repo.remove(db, id=categoria_id) is not None
