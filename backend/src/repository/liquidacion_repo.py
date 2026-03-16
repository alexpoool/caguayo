from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional, Type, TypeVar
from datetime import datetime
from src.repository.base import CRUDBase
from src.models.liquidacion import Liquidacion
from src.models.productos_en_liquidacion import ProductosEnLiquidacion

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

    async def get_by_anexo(
        self, db: AsyncSession, anexo_id: int
    ) -> Optional[Liquidacion]:
        statement = select(Liquidacion).where(Liquidacion.id_anexo == anexo_id)
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

    async def get_cantidad_liquidaciones_anio(self, db: AsyncSession, anio: int) -> int:
        statement = (
            select(func.count())
            .select_from(Liquidacion)
            .where(func.extract("YEAR", Liquidacion.fecha_emision) == anio)
        )
        result = await db.exec(statement)
        return result.one()

    async def get_codigo_anio(self, db: AsyncSession, anio: int) -> int:
        cantidad = await self.get_cantidad_liquidaciones_anio(db, anio)
        return cantidad + 1


liquidacion_repo = LiquidacionRepository(Liquidacion)
