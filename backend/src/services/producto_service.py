from typing import List, Optional
from sqlmodel.ext.asyncio.session import AsyncSession
from src.repository import productos_repo
from src.dto import (
    ProductosCreate,
    ProductosUpdate,
    ProductosRead,
)
from src.services.existencia_service import ExistenciaService


class ProductosService:
    @staticmethod
    async def _inject_stock(db: AsyncSession, producto: ProductosRead) -> ProductosRead:
        producto.stock = await ExistenciaService.calcular_stock_producto(
            db, producto.id_producto
        )
        return producto

    @staticmethod
    async def create_producto(
        db: AsyncSession, producto: ProductosCreate
    ) -> ProductosRead:
        db_producto = await productos_repo.create(db, obj_in=producto)
        return await ProductosService._inject_stock(
            db, ProductosRead.model_validate(db_producto)
        )

    @staticmethod
    async def get_producto(db: AsyncSession, producto_id: int) -> ProductosRead:
        db_producto = await productos_repo.get(db, id=producto_id)
        if not db_producto:
            return None
        return await ProductosService._inject_stock(
            db, ProductosRead.model_validate(db_producto)
        )

    @staticmethod
    async def get_productos(
        db: AsyncSession, skip: int = 0, limit: int = 100, search: Optional[str] = None
    ) -> List[ProductosRead]:
        db_productos = await productos_repo.get_multi(
            db, skip=skip, limit=limit, search=search
        )
        return [ProductosRead.model_validate(p) for p in db_productos]

    @staticmethod
    async def update_producto(
        db: AsyncSession, producto_id: int, producto: ProductosUpdate
    ) -> ProductosRead:
        db_producto = await productos_repo.get(db, id=producto_id)
        if db_producto:
            updated_producto = await productos_repo.update(
                db, db_obj=db_producto, obj_in=producto
            )
            return await ProductosService._inject_stock(
                db, ProductosRead.model_validate(updated_producto)
            )
        return None

    @staticmethod
    async def delete_producto(db: AsyncSession, producto_id: int) -> bool:
        result = await productos_repo.remove(db, id=producto_id)
        return result is not None

    @staticmethod
    async def search_productos(db: AsyncSession, nombre: str) -> List[ProductosRead]:
        db_productos = await productos_repo.get_by_nombre(db, nombre=nombre)
        return [
            await ProductosService._inject_stock(db, ProductosRead.model_validate(p))
            for p in db_productos
        ]

    @staticmethod
    async def get_productos_by_anexo(
        db: AsyncSession, anexo_id: int
    ) -> List[ProductosRead]:
        """Obtener productos disponibles en un anexo específico."""
        from src.services.movimiento_service import MovimientoService

        productos_data = await MovimientoService.get_productos_by_anexo(db, anexo_id)

        result = []
        for p_data in productos_data:
            producto = await ProductosService.get_producto(db, p_data["id_producto"])
            if producto:
                producto_dict = producto.model_dump()
                producto_dict["cantidad"] = p_data["cantidad"]
                result.append(ProductosRead(**producto_dict))
        return result

    @staticmethod
    async def get_productos_con_stock(db: AsyncSession) -> List[ProductosRead]:
        """Obtener productos con stock disponible."""
        from src.services.movimiento_service import MovimientoService

        productos_data = await MovimientoService.get_productos_con_stock(db)

        result = []
        for p_data in productos_data:
            producto = await ProductosService.get_producto(db, p_data["id_producto"])
            if producto:
                producto_dict = producto.model_dump()
                producto_dict["cantidad"] = p_data["cantidad"]
                result.append(ProductosRead(**producto_dict))
        return result
