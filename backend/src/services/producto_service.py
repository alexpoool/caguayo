from typing import List
from sqlmodel.ext.asyncio.session import AsyncSession
from src.repository import productos_repo
from src.dto import (
    ProductosCreate,
    ProductosUpdate,
    ProductosRead,
)


class ProductosService:
    @staticmethod
    async def create_producto(
        db: AsyncSession, producto: ProductosCreate
    ) -> ProductosRead:
        db_producto = await productos_repo.create(db, obj_in=producto)
        return ProductosRead.from_orm(db_producto)

    @staticmethod
    async def get_producto(db: AsyncSession, producto_id: int) -> ProductosRead:
        db_producto = await productos_repo.get(db, id=producto_id)
        return ProductosRead.from_orm(db_producto) if db_producto else None

    @staticmethod
    async def get_productos(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[ProductosRead]:
        db_productos = await productos_repo.get_multi(db, skip=skip, limit=limit)
        return [ProductosRead.from_orm(p) for p in db_productos]

    @staticmethod
    async def update_producto(
        db: AsyncSession, producto_id: int, producto: ProductosUpdate
    ) -> ProductosRead:
        db_producto = await productos_repo.get(db, id=producto_id)
        if db_producto:
            updated_producto = await productos_repo.update(
                db, db_obj=db_producto, obj_in=producto
            )
            return ProductosRead.from_orm(updated_producto)
        return None

    @staticmethod
    async def delete_producto(db: AsyncSession, producto_id: int) -> bool:
        result = await productos_repo.remove(db, id=producto_id)
        return result is not None

    @staticmethod
    async def search_productos(db: AsyncSession, nombre: str) -> List[ProductosRead]:
        db_productos = await productos_repo.get_by_nombre(db, nombre=nombre)
        return [ProductosRead.from_orm(p) for p in db_productos]
