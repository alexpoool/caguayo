from typing import List, Optional
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, func
from src.repository import productos_repo
from src.dto import (
    ProductosCreate,
    ProductosUpdate,
    ProductosRead,
)
from src.services.existencia_service import ExistenciaService
from src.core.exceptions import BusinessLogicError


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
    async def next_codigo(db: AsyncSession, id_subcategoria: int) -> str:
        return await productos_repo.next_codigo(db, id_subcategoria)

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
        from src.models.movimiento import Movimiento
        from src.models.item_anexo import ItemAnexo
        from src.models.detalle_compra import DetalleCompra
        from src.models.detalle_venta import DetalleVenta

        # Verificar movimientos asociados
        stmt_mov = select(func.count()).select_from(Movimiento).where(
            Movimiento.id_producto == producto_id
        )
        result_mov = await db.exec(stmt_mov)
        if (result_mov.one() or 0) > 0:
            raise BusinessLogicError(
                "No se puede eliminar el producto porque tiene movimientos de inventario asociados."
            )

        # Verificar items en anexo
        stmt_ia = select(func.count()).select_from(ItemAnexo).where(
            ItemAnexo.id_producto == producto_id
        )
        result_ia = await db.exec(stmt_ia)
        if (result_ia.one() or 0) > 0:
            raise BusinessLogicError(
                "No se puede eliminar el producto porque tiene items en anexo asociados."
            )

        # Verificar detalles de compra
        stmt_dc = select(func.count()).select_from(DetalleCompra).where(
            DetalleCompra.id_producto == producto_id
        )
        result_dc = await db.exec(stmt_dc)
        if (result_dc.one() or 0) > 0:
            raise BusinessLogicError(
                "No se puede eliminar el producto porque tiene detalles de compra asociados."
            )

        # Verificar detalles de venta
        stmt_dv = select(func.count()).select_from(DetalleVenta).where(
            DetalleVenta.id_producto == producto_id
        )
        result_dv = await db.exec(stmt_dv)
        if (result_dv.one() or 0) > 0:
            raise BusinessLogicError(
                "No se puede eliminar el producto porque tiene detalles de venta asociados."
            )

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
