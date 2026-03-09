import random
import string
from typing import List, Optional
from datetime import date
from decimal import Decimal
from sqlmodel.ext.asyncio.session import AsyncSession
from src.repository.liquidacion_repo import (
    liquidacion_repo,
    productos_liquidacion_repo,
)
from src.models.liquidacion import Liquidacion, ProductosLiquidacion, TipoPago
from src.dto import (
    LiquidacionCreate,
    LiquidacionRead,
    LiquidacionUpdate,
    LiquidacionConfirmar,
    ProductosLiquidacionCreate,
    ProductosLiquidacionRead,
)


def generate_codigo() -> str:
    return "".join(random.choices(string.digits, k=10))


class LiquidacionService:
    @staticmethod
    async def create_liquidacion(
        db: AsyncSession, data: LiquidacionCreate
    ) -> LiquidacionRead:
        db_liquidacion = Liquidacion(
            codigo=generate_codigo(),
            id_cliente=data.id_cliente,
            id_factura=data.id_factura,
            id_moneda=data.id_moneda,
            liquidada=False,
            fecha_emision=data.fecha_emision or date.today(),
            descripcion=data.descripcion,
            devengado=data.devengado or Decimal("0.00"),
            tributario=data.tributario or Decimal("0.00"),
            comision_bancaria=data.comision_bancaria or Decimal("0.00"),
            gasto_empresa=data.gasto_empresa or Decimal("0.00"),
            tipo_concepto=data.tipo_concepto,
            importe=data.importe,
            observacion=data.observacion,
            tipo_pago=TipoPago(data.tipo_pago)
            if data.tipo_pago
            else TipoPago.TRANSFERENCIA,
        )
        db.add(db_liquidacion)
        await db.commit()
        await db.refresh(db_liquidacion)

        for producto_data in data.productos:
            db_producto_liquidacion = ProductosLiquidacion(
                codigo=generate_codigo(),
                cantidad=producto_data.cantidad,
                liquidado=False,
                tipo_transaccion=producto_data.tipo_transaccion,
                id_transaccion=producto_data.id_transaccion,
                id_liquidacion=db_liquidacion.id_liquidacion,
                id_producto=producto_data.id_producto,
            )
            db.add(db_producto_liquidacion)

        await db.commit()

        db_liquidacion = await liquidacion_repo.get_with_relations(
            db, db_liquidacion.id_liquidacion
        )
        return LiquidacionRead.model_validate(db_liquidacion)

    @staticmethod
    async def get_liquidacion(
        db: AsyncSession, liquidacion_id: int
    ) -> Optional[LiquidacionRead]:
        db_liquidacion = await liquidacion_repo.get_with_relations(db, liquidacion_id)
        return (
            LiquidacionRead.model_validate(db_liquidacion) if db_liquidacion else None
        )

    @staticmethod
    async def get_liquidaciones(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[LiquidacionRead]:
        db_liquidaciones = await liquidacion_repo.get_multi_with_relations(
            db, skip=skip, limit=limit
        )
        return [LiquidacionRead.model_validate(l) for l in db_liquidaciones]

    @staticmethod
    async def get_liquidaciones_pendientes(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[LiquidacionRead]:
        db_liquidaciones = await liquidacion_repo.get_pendientes(
            db, skip=skip, limit=limit
        )
        return [LiquidacionRead.model_validate(l) for l in db_liquidaciones]

    @staticmethod
    async def get_liquidaciones_liquidadas(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[LiquidacionRead]:
        db_liquidaciones = await liquidacion_repo.get_liquidadas(
            db, skip=skip, limit=limit
        )
        return [LiquidacionRead.model_validate(l) for l in db_liquidaciones]

    @staticmethod
    async def get_liquidaciones_by_cliente(
        db: AsyncSession, cliente_id: int, skip: int = 0, limit: int = 100
    ) -> List[LiquidacionRead]:
        db_liquidaciones = await liquidacion_repo.get_by_cliente(
            db, cliente_id, skip=skip, limit=limit
        )
        return [LiquidacionRead.model_validate(l) for l in db_liquidaciones]

    @staticmethod
    async def update_liquidacion(
        db: AsyncSession, liquidacion_id: int, data: LiquidacionUpdate
    ) -> Optional[LiquidacionRead]:
        db_liquidacion = await liquidacion_repo.get(db, liquidacion_id)
        if not db_liquidacion:
            return None

        obj_data = data.model_dump(exclude_unset=True)
        for field, value in obj_data.items():
            setattr(db_liquidacion, field, value)

        db.add(db_liquidacion)
        await db.commit()
        await db.refresh(db_liquidacion)

        db_liquidacion = await liquidacion_repo.get_with_relations(db, liquidacion_id)
        return LiquidacionRead.model_validate(db_liquidacion)

    @staticmethod
    async def confirmar_liquidacion(
        db: AsyncSession, liquidacion_id: int, data: LiquidacionConfirmar
    ) -> Optional[LiquidacionRead]:
        db_liquidacion = await liquidacion_repo.get_with_relations(db, liquidacion_id)
        if not db_liquidacion:
            return None

        if db_liquidacion.liquidada:
            raise ValueError("La liquidación ya está confirmada")

        db_liquidacion.liquidada = True
        db_liquidacion.fecha_liquidacion = date.today()
        db_liquidacion.tipo_pago = (
            TipoPago(data.tipo_pago) if data.tipo_pago else db_liquidacion.tipo_pago
        )

        if data.devengado is not None:
            db_liquidacion.devengado = data.devengado
        if data.tributario is not None:
            db_liquidacion.tributario = data.tributario
        if data.comision_bancaria is not None:
            db_liquidacion.comision_bancaria = data.comision_bancaria
        if data.gasto_empresa is not None:
            db_liquidacion.gasto_empresa = data.gasto_empresa

        db_liquidacion.neto_pagar = (
            db_liquidacion.importe
            - db_liquidacion.tributario
            - db_liquidacion.comision_bancaria
            - db_liquidacion.gasto_empresa
        )

        if data.observacion:
            db_liquidacion.observacion = data.observacion

        for producto_liq in db_liquidacion.productos_liquidacion:
            producto_liq.liquidado = True

        await db.commit()
        await db.refresh(db_liquidacion)

        db_liquidacion = await liquidacion_repo.get_with_relations(db, liquidacion_id)
        return LiquidacionRead.model_validate(db_liquidacion)

    @staticmethod
    async def delete_liquidacion(db: AsyncSession, liquidacion_id: int) -> bool:
        db_liquidacion = await liquidacion_repo.get_with_relations(db, liquidacion_id)
        if not db_liquidacion:
            return False

        for producto_liq in db_liquidacion.productos_liquidacion:
            await db.delete(producto_liq)

        await db.delete(db_liquidacion)
        await db.commit()
        return True

    @staticmethod
    async def agregar_productos_liquidacion(
        db: AsyncSession,
        liquidacion_id: int,
        productos: List[ProductosLiquidacionCreate],
    ) -> Optional[LiquidacionRead]:
        db_liquidacion = await liquidacion_repo.get(db, liquidacion_id)
        if not db_liquidacion:
            return None

        for producto_data in productos:
            db_producto_liquidacion = ProductosLiquidacion(
                codigo=generate_codigo(),
                cantidad=producto_data.cantidad,
                liquidado=False,
                tipo_transaccion=producto_data.tipo_transaccion,
                id_transaccion=producto_data.id_transaccion,
                id_liquidacion=liquidacion_id,
                id_producto=producto_data.id_producto,
            )
            db.add(db_producto_liquidacion)

        await db.commit()

        db_liquidacion = await liquidacion_repo.get_with_relations(db, liquidacion_id)
        return LiquidacionRead.model_validate(db_liquidacion)

    @staticmethod
    async def eliminar_producto_liquidacion(
        db: AsyncSession, producto_liquidacion_id: int
    ) -> bool:
        db_producto = await productos_liquidacion_repo.get(db, producto_liquidacion_id)
        if not db_producto:
            return False

        await db.delete(db_producto)
        await db.commit()
        return True


liquidacion_service = LiquidacionService()
