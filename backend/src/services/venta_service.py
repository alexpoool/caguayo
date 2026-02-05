from typing import List
from datetime import datetime
from sqlmodel.ext.asyncio.session import AsyncSession
from src.repository import ventas_repo
from src.dto import (
    VentasCreate,
    VentasRead,
)


class VentasService:
    @staticmethod
    async def create_venta(db: AsyncSession, venta: VentasCreate) -> VentasRead:
        db_venta = await ventas_repo.create(db, obj_in=venta)
        return VentasRead.from_orm(db_venta)

    @staticmethod
    async def get_venta(db: AsyncSession, venta_id: int) -> VentasRead:
        db_venta = await ventas_repo.get(db, id=venta_id)
        return VentasRead.from_orm(db_venta) if db_venta else None

    @staticmethod
    async def get_ventas(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[VentasRead]:
        db_ventas = await ventas_repo.get_multi(db, skip=skip, limit=limit)
        return [VentasRead.from_orm(v) for v in db_ventas]

    @staticmethod
    async def get_ventas_mes_actual(db: AsyncSession) -> List[VentasRead]:
        now = datetime.now()
        db_ventas = await ventas_repo.get_by_mes(db, year=now.year, month=now.month)
        return [VentasRead.from_orm(v) for v in db_ventas]

    @staticmethod
    async def confirmar_venta(db: AsyncSession, venta_id: int) -> VentasRead:
        db_venta = await ventas_repo.get(db, id=venta_id)
        if db_venta:
            db_venta.confirmacion = True
            await db.commit()
            await db.refresh(db_venta)
            return VentasRead.from_orm(db_venta)
        return None
