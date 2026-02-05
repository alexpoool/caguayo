from typing import List
from sqlmodel.ext.asyncio.session import AsyncSession
from src.repository import movimiento_repo
from src.dto import (
    MovimientoCreate,
    MovimientoRead,
)


class MovimientoService:
    @staticmethod
    async def create_movimiento(
        db: AsyncSession, movimiento: MovimientoCreate
    ) -> MovimientoRead:
        db_movimiento = await movimiento_repo.create(db, obj_in=movimiento)
        return MovimientoRead.from_orm(db_movimiento)

    @staticmethod
    async def get_movimiento(db: AsyncSession, movimiento_id: int) -> MovimientoRead:
        db_movimiento = await movimiento_repo.get(db, id=movimiento_id)
        return MovimientoRead.from_orm(db_movimiento) if db_movimiento else None

    @staticmethod
    async def get_movimientos(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[MovimientoRead]:
        db_movimientos = await movimiento_repo.get_multi(db, skip=skip, limit=limit)
        return [MovimientoRead.from_orm(m) for m in db_movimientos]

    @staticmethod
    async def get_movimientos_pendientes(db: AsyncSession) -> List[MovimientoRead]:
        db_movimientos = await movimiento_repo.get_pendientes(db)
        return [MovimientoRead.from_orm(m) for m in db_movimientos]

    @staticmethod
    async def confirmar_movimiento(
        db: AsyncSession, movimiento_id: int
    ) -> MovimientoRead:
        db_movimiento = await movimiento_repo.get(db, id=movimiento_id)
        if db_movimiento:
            db_movimiento.confirmacion = True
            await db.commit()
            await db.refresh(db_movimiento)
            return MovimientoRead.from_orm(db_movimiento)
        return None
