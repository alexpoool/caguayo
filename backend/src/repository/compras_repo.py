from datetime import datetime
from typing import List

from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.compra import Compra, EstadoCompra
from src.models.detalle_compra import DetalleCompra
from src.repository.base import CRUDBase
from src.dto.compras_dto import CompraCreate, CompraUpdate, DetalleCompraCreate


class ComprasRepository(CRUDBase[Compra, CompraCreate, CompraUpdate]):
    async def get_by_cliente(
        self, db: AsyncSession, id_cliente: int, skip: int = 0, limit: int = 100
    ) -> List[Compra]:
        statement = (
            select(self.model)
            .options(
                selectinload(Compra.cliente),
                selectinload(Compra.detalles).selectinload(DetalleCompra.producto),
            )
            .where(self.model.id_cliente == id_cliente)
            .order_by(self.model.fecha.desc())
            .offset(skip)
            .limit(limit)
        )
        results = await db.exec(statement)
        return list(results.all())

    async def get_by_estado(
        self, db: AsyncSession, estado: str, skip: int = 0, limit: int = 100
    ) -> List[Compra]:
        statement = (
            select(self.model)
            .options(
                selectinload(Compra.cliente),
                selectinload(Compra.detalles).selectinload(DetalleCompra.producto),
            )
            .where(self.model.estado == estado)
            .order_by(self.model.fecha.desc())
            .offset(skip)
            .limit(limit)
        )
        results = await db.exec(statement)
        return list(results.all())

    async def get_by_fecha_range(
        self, db: AsyncSession, fecha_inicio: datetime, fecha_fin: datetime
    ) -> List[Compra]:
        statement = (
            select(self.model)
            .options(
                selectinload(Compra.cliente),
                selectinload(Compra.detalles).selectinload(DetalleCompra.producto),
            )
            .where(self.model.fecha >= fecha_inicio, self.model.fecha <= fecha_fin)
            .order_by(self.model.fecha.desc())
        )
        results = await db.exec(statement)
        return list(results.all())


class DetalleCompraRepository(CRUDBase[DetalleCompra, DetalleCompraCreate, dict]):
    async def get_by_compra(
        self, db: AsyncSession, id_compra: int
    ) -> List[DetalleCompra]:
        statement = (
            select(self.model)
            .options(selectinload(DetalleCompra.producto))
            .where(self.model.id_compra == id_compra)
        )
        results = await db.exec(statement)
        return list(results.all())


# Instancias
compras_repo = ComprasRepository(Compra)
detalle_compra_repo = DetalleCompraRepository(DetalleCompra)
