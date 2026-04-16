from decimal import Decimal
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List
from src.models.contrato import Factura
from src.models.pago import Pago
from src.repository.pago_repo import pago_repo
from src.dto.pago_dto import PagoCreate, PagoRead


class PagoService:
    @staticmethod
    async def create(db: AsyncSession, data: PagoCreate) -> PagoRead:
        factura = await db.get(Factura, data.id_factura)
        if not factura:
            raise ValueError("Factura no encontrada")

        total_pagado = await pago_repo.get_total_pagado(db, data.id_factura)
        pendiente = factura.monto - total_pagado

        if data.monto > pendiente:
            raise ValueError(
                f"El monto ({data.monto}) excede lo pendiente ({pendiente})"
            )

        if data.monto <= 0:
            raise ValueError("El monto debe ser mayor que cero")

        pago = await pago_repo.create_pago(db, data)

        factura.pago_actual = total_pagado + data.monto
        await db.commit()
        await db.refresh(factura)

        return PagoRead(
            id_pago=pago.id_pago,
            id_factura=pago.id_factura,
            fecha=pago.fecha,
            monto=pago.monto,
            id_moneda=pago.id_moneda,
            tipo_pago=pago.tipo_pago,
            referencia=pago.referencia,
            observaciones=pago.observaciones,
        )

    @staticmethod
    async def get_by_factura(db: AsyncSession, id_factura: int) -> List[PagoRead]:
        pagos = await pago_repo.get_by_factura(db, id_factura)
        return [
            PagoRead(
                id_pago=p.id_pago,
                id_factura=p.id_factura,
                fecha=p.fecha,
                monto=p.monto,
                id_moneda=p.id_moneda,
                tipo_pago=p.tipo_pago,
                referencia=p.referencia,
                observaciones=p.observaciones,
            )
            for p in pagos
        ]

    @staticmethod
    async def delete(db: AsyncSession, id_pago: int) -> bool:
        pago = await db.get(Pago, id_pago)
        if not pago:
            return False

        id_factura = pago.id_factura
        deleted = await pago_repo.delete_pago(db, id_pago)
        if not deleted:
            return False

        factura = await db.get(Factura, id_factura)
        if factura:
            total_pagado = await pago_repo.get_total_pagado(db, id_factura)
            factura.pago_actual = total_pagado
            await db.commit()

        return True
