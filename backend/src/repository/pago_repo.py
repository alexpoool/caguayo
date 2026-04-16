from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from decimal import Decimal
from src.models.pago import Pago
from src.dto.pago_dto import PagoCreate, PagoUpdate
from src.repository.base import CRUDBase


class PagoRepository(CRUDBase[Pago, PagoCreate, PagoUpdate]):
    async def get_by_factura(self, db: AsyncSession, id_factura: int) -> List[Pago]:
        statement = (
            select(Pago)
            .where(Pago.id_factura == id_factura)
            .order_by(Pago.fecha.desc(), Pago.id_pago.desc())
        )
        results = await db.exec(statement)
        return results.all()

    async def get_total_pagado(self, db: AsyncSession, id_factura: int) -> Decimal:
        pagos = await self.get_by_factura(db, id_factura)
        total = sum(p.monto for p in pagos)
        return total

    async def create_pago(self, db: AsyncSession, data: PagoCreate) -> Pago:
        pago_dict = {
            "id_factura": data.id_factura,
            "fecha": data.fecha,
            "monto": data.monto or Decimal("0.00"),
            "id_moneda": data.id_moneda,
            "tipo_pago": data.tipo_pago,
            "referencia": data.referencia,
            "observaciones": data.observaciones,
        }
        pago = Pago(**pago_dict)
        db.add(pago)
        await db.commit()
        await db.refresh(pago)
        return pago

    async def delete_pago(self, db: AsyncSession, id_pago: int) -> bool:
        pago = await db.get(Pago, id_pago)
        if not pago:
            return False
        await db.delete(pago)
        await db.commit()
        return True


pago_repo = PagoRepository(Pago)
