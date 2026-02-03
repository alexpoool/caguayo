from typing import List
from sqlmodel import Session
from src.repository import productos_repo
from src.dto import (
    ProductosCreate,
    ProductosUpdate,
    ProductosRead,
)

class ProductosService:
    @staticmethod
    def create_producto(db: Session, producto: ProductosCreate) -> ProductosRead:
        db_producto = productos_repo.create(db, obj_in=producto)
        return ProductosRead.from_orm(db_producto)

    @staticmethod
    def get_producto(db: Session, producto_id: int) -> ProductosRead:
        db_producto = productos_repo.get(db, id=producto_id)
        return ProductosRead.from_orm(db_producto) if db_producto else None

    @staticmethod
    def get_productos(
        db: Session, skip: int = 0, limit: int = 100
    ) -> List[ProductosRead]:
        db_productos = productos_repo.get_multi(db, skip=skip, limit=limit)
        return [ProductosRead.from_orm(p) for p in db_productos]

    @staticmethod
    def update_producto(
        db: Session, producto_id: int, producto: ProductosUpdate
    ) -> ProductosRead:
        db_producto = productos_repo.get(db, id=producto_id)
        if db_producto:
            updated_producto = productos_repo.update(
                db, db_obj=db_producto, obj_in=producto
            )
            return ProductosRead.from_orm(updated_producto)
        return None

    @staticmethod
    def delete_producto(db: Session, producto_id: int) -> bool:
        return productos_repo.remove(db, id=producto_id) is not None

    @staticmethod
    def search_productos(db: Session, nombre: str) -> List[ProductosRead]:
        db_productos = productos_repo.get_by_nombre(db, nombre=nombre)
        return [ProductosRead.from_orm(p) for p in db_productos]
