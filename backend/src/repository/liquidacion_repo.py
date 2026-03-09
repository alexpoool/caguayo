from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional, Type, TypeVar
from src.repository.base import CRUDBase
from src.models.liquidacion import Liquidacion, ProductosLiquidacion

ModelType = TypeVar("ModelType")


class LiquidacionRepository(CRUDBase[Liquidacion, dict, dict]):
    async def get_by_codigo(
        self, db: AsyncSession, codigo: str
    ) -> Optional[Liquidacion]:
        statement = select(Liquidacion).where(Liquidacion.codigo == codigo)
        result = await db.exec(statement)
        return result.first()

    async def get_by_cliente(
        self, db: AsyncSession, cliente_id: int, skip: int = 0, limit: int = 100
    ) -> List[Liquidacion]:
        statement = (
            select(Liquidacion)
            .where(Liquidacion.id_cliente == cliente_id)
            .offset(skip)
            .limit(limit)
        )
        result = await db.exec(statement)
        return result.all()

    async def get_by_factura(
        self, db: AsyncSession, factura_id: int
    ) -> Optional[Liquidacion]:
        statement = select(Liquidacion).where(Liquidacion.id_factura == factura_id)
        result = await db.exec(statement)
        return result.first()

    async def get_with_relations(
        self, db: AsyncSession, id: int
    ) -> Optional[Liquidacion]:
        statement = select(Liquidacion).where(Liquidacion.id_liquidacion == id)
        result = await db.exec(statement)
        return result.first()

    async def get_multi_with_relations(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[Liquidacion]:
        statement = select(Liquidacion).offset(skip).limit(limit)
        result = await db.exec(statement)
        return result.all()

    async def get_pendientes(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[Liquidacion]:
        statement = (
            select(Liquidacion)
            .where(Liquidacion.liquidada == False)
            .offset(skip)
            .limit(limit)
        )
        result = await db.exec(statement)
        return result.all()

    async def get_liquidadas(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[Liquidacion]:
        statement = (
            select(Liquidacion)
            .where(Liquidacion.liquidada == True)
            .offset(skip)
            .limit(limit)
        )
        result = await db.exec(statement)
        return result.all()


class ProductosLiquidacionRepository(CRUDBase[ProductosLiquidacion, dict, dict]):
    async def get_by_liquidacion(
        self, db: AsyncSession, liquidacion_id: int
    ) -> List[ProductosLiquidacion]:
        statement = select(ProductosLiquidacion).where(
            ProductosLiquidacion.id_liquidacion == liquidacion_id
        )
        result = await db.exec(statement)
        return result.all()

    async def get_by_transaccion(
        self, db: AsyncSession, tipo_transaccion: str, id_transaccion: int
    ) -> List[ProductosLiquidacion]:
        statement = select(ProductosLiquidacion).where(
            ProductosLiquidacion.tipo_transaccion == tipo_transaccion,
            ProductosLiquidacion.id_transaccion == id_transaccion,
        )
        result = await db.exec(statement)
        return result.all()

    async def get_pendientes_by_cliente(
        self, db: AsyncSession, cliente_id: int
    ) -> List[ProductosLiquidacion]:
        statement = select(ProductosLiquidacion).where(
            ProductosLiquidacion.liquidado == False
        )
        result = await db.exec(statement)
        return result.all()


liquidacion_repo = LiquidacionRepository(Liquidacion)
productos_liquidacion_repo = ProductosLiquidacionRepository(ProductosLiquidacion)
