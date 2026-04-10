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

        # Validar que las cantidades a liquidar no excedan las cantidades originales
        # para productos de CONSIGNACION
        for prod in productos_db:
            if prod.id_anexo:
                # Obtener cantidad original del item_anexo
                from src.models.item_anexo import ItemAnexo
                from src.models.anexo import Anexo
                from src.models.convenio import Convenio
                from src.models.tipo_convenio import TipoConvenio
                from sqlalchemy import and_

                item_stmt = (
                    select(ItemAnexo.cantidad)
                    .join(Anexo, ItemAnexo.id_anexo == Anexo.id_anexo)
                    .join(Convenio, Anexo.id_convenio == Convenio.id_convenio)
                    .join(
                        TipoConvenio,
                        TipoConvenio.id_tipo_convenio == Convenio.id_tipo_convenio,
                    )
                    .where(
                        and_(
                            ItemAnexo.id_producto == prod.id_producto,
                            ItemAnexo.id_anexo == prod.id_anexo,
                            TipoConvenio.nombre
                            != "COMPRA VENTA",  # Solo validar para CONSIGNACION
                        )
                    )
                )
                result_item = await db.exec(item_stmt)
                cantidad_original = result_item.scalar_one_or_none()

                if cantidad_original is not None and prod.cantidad > cantidad_original:
                    raise ValueError(
                        f"La cantidad a liquidar ({prod.cantidad}) no puede exceder "
                        f"la cantidad original ({cantidad_original}) del producto en el anexo"
                    )

        importe = Decimal("0.00")

        # Batch fetching productos to avoid N+1
        producto_ids_en_db = [p.id_producto for p in productos_db]
        producto_stmt = select(Productos).where(
            Productos.id_producto.in_(producto_ids_en_db)
        )
        producto_result = await db.exec(producto_stmt)
        valid_productos_ids = {p.id_producto for p in producto_result.all()}

        for prod in productos_db:
            if prod.id_producto in valid_productos_ids:
                importe += prod.precio * prod.cantidad

        devengado = data.devengado or Decimal("0.00")
        tributario = data.tributario or Decimal("0.00")
        comision_bancaria = data.comision_bancaria or Decimal("0.00")
        gasto_empresa = data.gasto_empresa or Decimal("0.00")
        porcentaje_caguayo = data.porcentaje_caguayo or Decimal("10.00")

        importe_caguayo = importe * (porcentaje_caguayo / 100)
        devengado_calculado = importe - importe_caguayo
        tributario_monto = devengado_calculado * (tributario / 100)
        subtotal = devengado_calculado - tributario_monto
        neto_pagar = subtotal - gasto_empresa - comision_bancaria

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
            devengado=devengado_calculado,
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

        productos_en_liquidacion_list = []
        for p in productos_response:
            # Obtener información del anexo
            anexo_info = None
            if p.id_anexo:
                from src.models.anexo import Anexo

                anexo_stmt = select(Anexo).where(Anexo.id_anexo == p.id_anexo)
                anexo_result = await db.exec(anexo_stmt)
                anexo = anexo_result.first()
                if anexo:
                    anexo_info = {
                        "id_anexo": anexo.id_anexo,
                        "nombre_anexo": anexo.nombre_anexo,
                    }

            productos_en_liquidacion_list.append(
                ProductosEnLiquidacionRead(
                    id_producto_en_liquidacion=p.id_producto_en_liquidacion,
                    codigo=p.codigo,
                    id_producto=p.id_producto,
                    cantidad=p.cantidad,
                    precio=p.precio,
                    id_moneda=p.id_moneda,
                    tipo_compra=p.tipo_compra,
                    id_factura=p.id_factura,
                    id_venta_efectivo=p.id_venta_efectivo,
                    id_anexo=p.id_anexo,
                    liquidada=p.liquidada,
                    fecha=p.fecha,
                    fecha_liquidacion=p.fecha_liquidacion,
                    anexo=anexo_info,
                )
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
            productos_en_liquidacion=productos_en_liquidacion_list,
        )

    @staticmethod
    async def get_liquidacion(
        db: AsyncSession, liquidacion_id: int
    ) -> Optional[LiquidacionRead]:
        db_liquidacion = await liquidacion_repo.get_with_relations(db, liquidacion_id)
        if not db_liquidacion:
            return None

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
        db_liquidaciones = await liquidacion_repo.get_pendientes_with_relations(
            db, skip=skip, limit=limit
        )
        return [LiquidacionRead.model_validate(l) for l in db_liquidaciones]

    @staticmethod
    async def get_liquidaciones_liquidadas(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[LiquidacionRead]:
        db_liquidaciones = await liquidacion_repo.get_liquidadas_with_relations(
            db, skip=skip, limit=limit
        )
        return [LiquidacionRead.model_validate(l) for l in db_liquidaciones]

    @staticmethod
    async def get_liquidaciones_by_cliente(
        db: AsyncSession, cliente_id: int, skip: int = 0, limit: int = 100
    ) -> List[LiquidacionRead]:
        db_liquidaciones = await liquidacion_repo.get_by_cliente_with_relations(
            db, cliente_id, skip=skip, limit=limit
        )
        return [LiquidacionRead.model_validate(l) for l in db_liquidaciones]

    @staticmethod
    async def get_productos_pendientes_by_cliente(
        db: AsyncSession, cliente_id: int, anexo_id: Optional[int] = None
    ) -> List[dict]:
        return await productos_en_liquidacion_repo.get_pendientes_by_cliente_y_anexo(
            db, cliente_id, anexo_id
        )

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
            - (db_liquidacion.importe * db_liquidacion.gasto_empresa / 100)
            - (db_liquidacion.importe * db_liquidacion.comision_bancaria / 100)
        )
        db_liquidacion.neto_pagar = db_liquidacion.neto_pagar - (
            db_liquidacion.neto_pagar * db_liquidacion.tributario / 100
        )
        db_liquidacion.devengado = (
            db_liquidacion.importe
            - (db_liquidacion.importe * db_liquidacion.gasto_empresa / 100)
            - (db_liquidacion.importe * db_liquidacion.comision_bancaria / 100)
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
