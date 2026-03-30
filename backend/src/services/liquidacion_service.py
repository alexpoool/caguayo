import random
import string
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import select
from src.repository.liquidacion_repo import liquidacion_repo
from src.repository.productos_en_liquidacion_repo import productos_en_liquidacion_repo
from src.models.liquidacion import Liquidacion, TipoPago
from src.models.productos_en_liquidacion import ProductosEnLiquidacion
from src.models.producto import Productos
from src.dto import (
    LiquidacionCreate,
    LiquidacionRead,
    LiquidacionUpdate,
    LiquidacionConfirmar,
)
from src.dto.productos_en_liquidacion_dto import ProductosEnLiquidacionRead


def generate_codigo() -> str:
    return "".join(random.choices(string.digits, k=10))


class LiquidacionService:
    @staticmethod
    async def generate_codigo_liquidacion(db: AsyncSession) -> str:
        anio = datetime.now().year
        cantidad = await liquidacion_repo.get_codigo_anio(db, anio)
        return f"{anio}.{cantidad}"

    @staticmethod
    async def create_liquidacion(
        db: AsyncSession, data: LiquidacionCreate
    ) -> LiquidacionRead:
        productos_ids = data.producto_ids

        productos_db = await productos_en_liquidacion_repo.get_by_ids(db, productos_ids)

        if not productos_db:
            raise ValueError("No se encontraron productos para liquidar")

        importe = Decimal("0.00")
        for prod in productos_db:
            producto_stmt = select(Productos).where(
                Productos.id_producto == prod.id_producto
            )
            producto_result = await db.exec(producto_stmt)
            producto = producto_result.first()

            if producto:
                importe += producto.precio_venta * prod.cantidad

        devengado = data.devengado or Decimal("0.00")
        tributario = data.tributario or Decimal("0.00")
        comision_bancaria = data.comision_bancaria or Decimal("0.00")
        gasto_empresa = data.gasto_empresa or Decimal("0.00")

        neto_pagar = importe - tributario - comision_bancaria - gasto_empresa

        codigo = await LiquidacionService.generate_codigo_liquidacion(db)

        db_liquidacion = Liquidacion(
            codigo=codigo,
            id_cliente=data.id_cliente,
            id_convenio=data.id_convenio,
            id_anexo=data.id_anexo,
            id_moneda=data.id_moneda,
            liquidada=False,
            fecha_emision=data.fecha_emision or date.today(),
            observaciones=data.observaciones,
            devengado=devengado,
            tributario=tributario,
            comision_bancaria=comision_bancaria,
            gasto_empresa=gasto_empresa,
            importe=importe,
            neto_pagar=neto_pagar,
            tipo_pago=data.tipo_pago,
        )
        db.add(db_liquidacion)
        await db.commit()
        await db.refresh(db_liquidacion)

        for prod in productos_db:
            prod.id_liquidacion = db_liquidacion.id_liquidacion
            prod.liquidada = True
            prod.fecha_liquidacion = datetime.utcnow()
            db.add(prod)

        await db.commit()

        db_liquidacion = await liquidacion_repo.get_with_relations(
            db, db_liquidacion.id_liquidacion
        )

        productos_response = await productos_en_liquidacion_repo.get_by_ids(
            db, productos_ids
        )

        return LiquidacionRead(
            id_liquidacion=db_liquidacion.id_liquidacion,
            codigo=db_liquidacion.codigo,
            id_cliente=db_liquidacion.id_cliente,
            id_convenio=db_liquidacion.id_convenio,
            id_anexo=db_liquidacion.id_anexo,
            id_moneda=db_liquidacion.id_moneda,
            liquidada=db_liquidacion.liquidada,
            fecha_emision=db_liquidacion.fecha_emision,
            fecha_liquidacion=db_liquidacion.fecha_liquidacion,
            observaciones=db_liquidacion.observaciones,
            devengado=db_liquidacion.devengado,
            tributario=db_liquidacion.tributario,
            comision_bancaria=db_liquidacion.comision_bancaria,
            gasto_empresa=db_liquidacion.gasto_empresa,
            importe=db_liquidacion.importe,
            neto_pagar=db_liquidacion.neto_pagar,
            tipo_pago=db_liquidacion.tipo_pago,
            productos_en_liquidacion=[
                ProductosEnLiquidacionRead.model_validate(p) for p in productos_response
            ],
        )

    @staticmethod
    async def get_liquidacion(
        db: AsyncSession, liquidacion_id: int
    ) -> Optional[LiquidacionRead]:
        db_liquidacion = await liquidacion_repo.get_with_relations(db, liquidacion_id)
        if not db_liquidacion:
            return None

        productos = await productos_en_liquidacion_repo.get_by_ids(db, [])

        return LiquidacionRead.model_validate(db_liquidacion)

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
    async def get_productos_pendientes_by_cliente(
        db: AsyncSession, cliente_id: int, anexo_id: Optional[int] = None
    ) -> List[ProductosEnLiquidacionRead]:
        productos = (
            await productos_en_liquidacion_repo.get_pendientes_by_cliente_y_anexo(
                db, cliente_id, anexo_id
            )
        )
        return [ProductosEnLiquidacionRead.model_validate(p) for p in productos]

    @staticmethod
    async def get_items_anexo_con_estado(
        db: AsyncSession, cliente_id: int, anexo_id: Optional[int] = None
    ) -> List[dict]:
        """Obtiene todos los items de anexos del cliente con estado (EN_CONSIGNACION, A LIQUIDAR, LIQUIDADO)."""
        return (
            await productos_en_liquidacion_repo.get_items_anexo_con_estado_por_cliente(
                db, cliente_id, anexo_id
            )
        )

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
        db_liquidacion.tipo_pago = data.tipo_pago or db_liquidacion.tipo_pago

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

        if data.observaciones:
            db_liquidacion.observaciones = data.observacion

        await db.commit()
        await db.refresh(db_liquidacion)

        db_liquidacion = await liquidacion_repo.get_with_relations(db, liquidacion_id)
        return LiquidacionRead.model_validate(db_liquidacion)

    @staticmethod
    async def delete_liquidacion(db: AsyncSession, liquidacion_id: int) -> bool:
        db_liquidacion = await liquidacion_repo.get_with_relations(db, liquidacion_id)
        if not db_liquidacion:
            return False

        productos = await productos_en_liquidacion_repo.get_by_ids(db, [])

        for prod in productos:
            prod.id_liquidacion = None
            prod.liquidada = False
            prod.fecha_liquidacion = None
            db.add(prod)

        await db.delete(db_liquidacion)
        await db.commit()
        return True


liquidacion_service = LiquidacionService()
