from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional, Type, TypeVar
from datetime import datetime
from src.repository.base import CRUDBase
from src.models.productos_en_liquidacion import ProductosEnLiquidacion

ModelType = TypeVar("ModelType")


class ProductosEnLiquidacionRepository(CRUDBase[ProductosEnLiquidacion, dict, dict]):
    async def get_with_relations(
        self, db: AsyncSession, id: int
    ) -> Optional[ProductosEnLiquidacion]:
        statement = select(ProductosEnLiquidacion).where(
            ProductosEnLiquidacion.id_producto_en_liquidacion == id
        )
        result = await db.exec(statement)
        return result.first()

    async def get_multi_with_relations(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[ProductosEnLiquidacion]:
        statement = (
            select(ProductosEnLiquidacion)
            .order_by(ProductosEnLiquidacion.fecha.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.exec(statement)
        return result.all()

    async def get_pendientes(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[ProductosEnLiquidacion]:
        statement = (
            select(ProductosEnLiquidacion)
            .where(ProductosEnLiquidacion.liquidada == False)
            .order_by(ProductosEnLiquidacion.fecha.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.exec(statement)
        return result.all()

    async def get_liquidadas(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[ProductosEnLiquidacion]:
        statement = (
            select(ProductosEnLiquidacion)
            .where(ProductosEnLiquidacion.liquidada == True)
            .order_by(ProductosEnLiquidacion.fecha_liquidacion.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.exec(statement)
        return result.all()

    async def get_by_factura(
        self, db: AsyncSession, factura_id: int
    ) -> List[ProductosEnLiquidacion]:
        statement = select(ProductosEnLiquidacion).where(
            ProductosEnLiquidacion.id_factura == factura_id
        )
        result = await db.exec(statement)
        return result.all()

    async def get_by_venta_efectivo(
        self, db: AsyncSession, venta_efectivo_id: int
    ) -> List[ProductosEnLiquidacion]:
        statement = select(ProductosEnLiquidacion).where(
            ProductosEnLiquidacion.id_venta_efectivo == venta_efectivo_id
        )
        result = await db.exec(statement)
        return result.all()

    async def get_by_anexo(
        self, db: AsyncSession, anexo_id: int
    ) -> List[ProductosEnLiquidacion]:
        statement = select(ProductosEnLiquidacion).where(
            ProductosEnLiquidacion.id_anexo == anexo_id
        )
        result = await db.exec(statement)
        return result.all()

    async def get_by_producto(
        self, db: AsyncSession, producto_id: int, skip: int = 0, limit: int = 100
    ) -> List[ProductosEnLiquidacion]:
        statement = (
            select(ProductosEnLiquidacion)
            .where(ProductosEnLiquidacion.id_producto == producto_id)
            .order_by(ProductosEnLiquidacion.fecha.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.exec(statement)
        return result.all()

    async def get_cantidad_productos_anio(self, db: AsyncSession, anio: int) -> int:
        statement = (
            select(func.count())
            .select_from(ProductosEnLiquidacion)
            .where(func.extract("YEAR", ProductosEnLiquidacion.fecha) == anio)
        )
        result = await db.exec(statement)
        return result.one()

    async def get_codigo_anio(self, db: AsyncSession, anio: int) -> int:
        statement = (
            select(func.count())
            .select_from(ProductosEnLiquidacion)
            .where(func.extract("YEAR", ProductosEnLiquidacion.fecha) == anio)
        )
        result = await db.exec(statement)
        return result.one() + 1

    async def get_pendientes_by_cliente(
        self, db: AsyncSession, cliente_id: int
    ) -> List[ProductosEnLiquidacion]:
        statement = (
            select(ProductosEnLiquidacion)
            .where(
                ProductosEnLiquidacion.liquidada == False,
                ProductosEnLiquidacion.id_anexo.in_(
                    select(ProductosEnLiquidacion.id_anexo).where(
                        ProductosEnLiquidacion.id_anexo.isnot(None)
                    )
                ),
            )
            .order_by(ProductosEnLiquidacion.fecha.desc())
        )
        result = await db.exec(statement)
        return result.all()

    async def get_pendientes_by_cliente_y_anexo(
        self, db: AsyncSession, cliente_id: int, anexo_id: Optional[int] = None
    ) -> List[ProductosEnLiquidacion]:
        from src.models.anexo import Anexo
        from src.models.convenio import Convenio

        if anexo_id:
            statement = (
                select(ProductosEnLiquidacion)
                .where(
                    ProductosEnLiquidacion.liquidada == False,
                    ProductosEnLiquidacion.id_anexo == anexo_id,
                )
                .order_by(ProductosEnLiquidacion.fecha.desc())
            )
        else:
            statement = (
                select(ProductosEnLiquidacion)
                .where(ProductosEnLiquidacion.liquidada == False)
                .order_by(ProductosEnLiquidacion.fecha.desc())
            )

        result = await db.exec(statement)
        return result.all()

    async def get_by_ids(
        self, db: AsyncSession, ids: List[int]
    ) -> List[ProductosEnLiquidacion]:
        statement = select(ProductosEnLiquidacion).where(
            ProductosEnLiquidacion.id_producto_en_liquidacion.in_(ids)
        )
        result = await db.exec(statement)
        return result.all()


productos_en_liquidacion_repo = ProductosEnLiquidacionRepository(ProductosEnLiquidacion)
