from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List
from src.models import Movimiento
from src.repository.base import CRUDBase
from src.dto import (
    MovimientoCreate,
    MovimientoUpdate,
)


class MovimientoRepository(CRUDBase[Movimiento, MovimientoCreate, MovimientoUpdate]):
    async def get_by_tipo(
        self, db: AsyncSession, id_tipo_movimiento: int
    ) -> List[Movimiento]:
        statement = select(Movimiento).where(
            Movimiento.id_tipo_movimiento == id_tipo_movimiento
        )
        results = await db.exec(statement)
        return results.all()

    async def get_pendientes(self, db: AsyncSession) -> List[Movimiento]:
        statement = select(Movimiento).where(Movimiento.confirmacion == False)  # noqa: E712
        results = await db.exec(statement)
        return results.all()


movimiento_repo = MovimientoRepository(Movimiento)
