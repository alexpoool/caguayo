import random
import string
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import select
from src.repository.liquidacion_repo import liquidacion_repo
from src.repository.productos_en_liquidacion_repo import productos_en_liquidacion_repo
from src.services.existencia_service import ExistenciaService
from src.models.liquidacion import Liquidacion
from src.models.producto import Productos
from src.models.movimiento import Movimiento
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
    async def generate_codigo_liquidacion(
        db: AsyncSession, nit: Optional[str] = None
    ) -> str:
        anio = datetime.now().year
        cantidad = await liquidacion_repo.get_codigo_anio(db, anio)
        prefijo = f"{nit}." if nit else ""
        return f"{prefijo}C.{anio}.{cantidad}"

    @staticmethod
    async def create_liquidacion(
        db: AsyncSession, data: LiquidacionCreate, nit: Optional[str] = None
    ) -> LiquidacionRead:
        producto_ids = [
            pid for pid in data.producto_ids if pid not in (None, "", "undefined")
        ]

        # Normalizar valores opcionales
        id_convenio = (
            data.id_convenio
            if data.id_convenio not in (None, "", "undefined")
            else None
        )
        id_anexo = (
            data.id_anexo if data.id_anexo not in (None, "", "undefined") else None
        )

        productos_db = await productos_en_liquidacion_repo.get_by_ids(db, producto_ids)

        if not productos_db:
            raise ValueError("No se encontraron productos para liquidar")

        # Validar que las facturas estén pagadas completamente
        from src.models.contrato import Factura
        from src.repository.pago_repo import pago_repo

        facturas_validar = set()
        for prod in productos_db:
            if prod.id_factura and prod.tipo_compra == "FACTURA":
                facturas_validar.add(prod.id_factura)

        for id_factura in facturas_validar:
            factura = await db.get(Factura, id_factura)
            if factura:
                total_pagado = await pago_repo.get_total_pagado(db, id_factura)
                if total_pagado < factura.monto:
                    pendiente = factura.monto - total_pagado
                    raise ValueError(
                        f"Factura {factura.codigo_factura} no está pagada completamente. "
                        f"Pagado: {total_pagado}, Pendiente: {pendiente}"
                    )

        # Validar que las cantidades a liquidar no excedan las cantidades originales
        # para productos de CONSIGNACION
        for prod in productos_db:
            if prod.id_anexo:
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
                            TipoConvenio.nombre != "COMPRA VENTA",
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

        # Validar existencias usando el servicio de existencias
        # Solo para productos de consignación (sin factura/venta asociada)
        # Los productos de factura/venta ya descontaron stock al crearse la transacción
        productos_validar = [
            {"id_producto": prod.id_producto, "cantidad": prod.cantidad}
            for prod in productos_db
            if prod.tipo_compra not in ("FACTURA", "VENTA_EFECTIVO")
        ]

        resultado_validacion = await ExistenciaService.validar_multiple(
            db, productos_validar
        )

        if not resultado_validacion["valido"]:
            errores = resultado_validacion["errores"]
            mensaje = "\n".join(
                [f"Producto {e['id_producto']}: {e['mensaje']}" for e in errores]
            )
            raise ValueError(f"Stock insuficiente:\n{mensaje}")

        importe = Decimal("0.00")
        for prod in productos_db:
            producto = await db.get(Productos, prod.id_producto)
            if producto:
                importe += producto.precio_venta * prod.cantidad

        data.devengado or Decimal("0.00")
        tributario = data.tributario or Decimal("0.00")
        comision_bancaria = data.comision_bancaria or Decimal("0.00")
        gasto_empresa = data.gasto_empresa or Decimal("0.00")
        porcentaje_caguayo = data.porcentaje_caguayo or Decimal("10.00")

        importe_caguayo = importe * (porcentaje_caguayo / 100)
        devengado_calculado = importe - importe_caguayo
        tributario_monto = devengado_calculado * (tributario / 100)
        subtotal = devengado_calculado - tributario_monto
        neto_pagar = subtotal - gasto_empresa - comision_bancaria

        codigo = await LiquidacionService.generate_codigo_liquidacion(db, nit=nit)

        db_liquidacion = Liquidacion(
            codigo=codigo,
            id_cliente=data.id_cliente,
            id_convenio=id_convenio,
            id_anexo=id_anexo,
            id_moneda=data.id_moneda,
            liquidada=False,
            fecha_emision=data.fecha_emision or date.today(),
            observaciones=data.observaciones,
            devengado=devengado_calculado,
            tributario=tributario,
            comision_bancaria=comision_bancaria,
            gasto_empresa=gasto_empresa,
            importe=importe,
            importe_caguayo=importe_caguayo,
            tributario_monto=tributario_monto,
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
            db, producto_ids
        )

        productos_en_liquidacion_list = []
        for p in productos_response:
            anexo_info = None
            if p.id_anexo:
                from src.models.anexo import Anexo

                anexo = await db.get(Anexo, p.id_anexo)
                if anexo:
                    anexo_info = {
                        "id_anexo": anexo.id_anexo,
                        "nombre_anexo": anexo.nombre_anexo,
                    }

            pel_read = ProductosEnLiquidacionRead(
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
            productos_en_liquidacion_list.append(pel_read)

        try:
            result = LiquidacionRead(
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
                importe_caguayo=db_liquidacion.importe_caguayo,
                tributario_monto=db_liquidacion.tributario_monto,
                porcentaje_caguayo=db_liquidacion.porcentaje_caguayo,
                neto_pagar=db_liquidacion.neto_pagar,
                tipo_pago=db_liquidacion.tipo_pago,
                productos_en_liquidacion=productos_en_liquidacion_list,
            )
            return result
        except Exception as serialization_error:
            raise ValueError(
                f"Error serializando respuesta: {serialization_error}, "
                f"productos_en_liquidacion_list len={len(productos_en_liquidacion_list)}, "
                f"db_liquidacion.id_liquidacion={db_liquidacion.id_liquidacion}"
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
        return [LiquidacionRead.model_validate(liq) for liq in db_liquidaciones]

    @staticmethod
    async def get_liquidaciones_pendientes(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[LiquidacionRead]:
        db_liquidaciones = await liquidacion_repo.get_pendientes_with_relations(
            db, skip=skip, limit=limit
        )
        return [LiquidacionRead.model_validate(liq) for liq in db_liquidaciones]

    @staticmethod
    async def get_liquidaciones_liquidadas(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[LiquidacionRead]:
        db_liquidaciones = await liquidacion_repo.get_liquidadas_with_relations(
            db, skip=skip, limit=limit
        )
        return [LiquidacionRead.model_validate(liq) for liq in db_liquidaciones]

    @staticmethod
    async def get_liquidaciones_by_cliente(
        db: AsyncSession, cliente_id: int, skip: int = 0, limit: int = 100
    ) -> List[LiquidacionRead]:
        db_liquidaciones = await liquidacion_repo.get_by_cliente_with_relations(
            db, cliente_id, skip=skip, limit=limit
        )
        return [LiquidacionRead.model_validate(liq) for liq in db_liquidaciones]

    @staticmethod
    async def get_productos_pendientes_by_cliente(
        db: AsyncSession,
        cliente_id: int,
        anexo_id: Optional[int] = None,
        moneda_id: Optional[int] = None,
    ) -> List[dict]:
        return await productos_en_liquidacion_repo.get_pendientes_by_cliente_y_anexo(
            db, cliente_id, anexo_id, moneda_id
        )

    @staticmethod
    async def get_items_anexo_con_estado(
        db: AsyncSession,
        cliente_id: int,
        anexo_id: Optional[int] = None,
        moneda_id: Optional[int] = None,
    ) -> List[dict]:
        """Obtiene todos los items de anexos del cliente con estado (EN_CONSIGNACION, A LIQUIDAR, LIQUIDADO)."""
        return (
            await productos_en_liquidacion_repo.get_items_anexo_con_estado_por_cliente(
                db, cliente_id, anexo_id, moneda_id
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

        # Validar que las facturas estén pagadas completamente
        from src.models.contrato import Factura
        from src.repository.pago_repo import pago_repo

        for pel in db_liquidacion.productos_en_liquidacion:
            if pel.id_factura and pel.tipo_compra == "FACTURA":
                factura = await db.get(Factura, pel.id_factura)
                if factura:
                    total_pagado = await pago_repo.get_total_pagado(db, pel.id_factura)
                    if total_pagado < factura.monto:
                        pendiente = factura.monto - total_pagado
                        raise ValueError(
                            f"Factura {factura.codigo_factura} no está pagada completamente. "
                            f"Pagado: {total_pagado}, Pendiente: {pendiente}"
                        )

        db_liquidacion.liquidada = True
        db_liquidacion.fecha_liquidacion = date.today()
        if data.tipo_pago:
            db_liquidacion.tipo_pago = data.tipo_pago
        if data.observaciones:
            db_liquidacion.observaciones = data.observaciones

        await db.commit()
        await db.refresh(db_liquidacion)

        db_liquidacion = await liquidacion_repo.get_with_relations(db, liquidacion_id)
        return LiquidacionRead.model_validate(db_liquidacion)

    @staticmethod
    async def delete_liquidacion(db: AsyncSession, liquidacion_id: int) -> bool:
        db_liquidacion = await liquidacion_repo.get_with_relations(db, liquidacion_id)
        if not db_liquidacion:
            return False

        for prod in db_liquidacion.productos_en_liquidacion:
            prod.id_liquidacion = None
            prod.liquidada = False
            prod.fecha_liquidacion = None
            db.add(prod)

        # Cancelar movimientos asociados a la liquidación
        stmt = select(Movimiento).where(Movimiento.id_liquidacion == liquidacion_id)
        result = await db.exec(stmt)
        for mov in result.all():
            if mov.estado != "cancelado":
                mov.estado = "cancelado"
                db.add(mov)

        await db.delete(db_liquidacion)
        await db.commit()
        return True

    @staticmethod
    async def aprobar(db: AsyncSession, liquidacion_id: int) -> bool:
        """Aprobar una liquidación - marca como liquidada."""
        from sqlalchemy import update
        from src.models.liquidacion import Liquidacion

        stmt = (
            update(Liquidacion)
            .where(Liquidacion.id_liquidacion == liquidacion_id)
            .values(liquidada=True)
        )
        await db.exec(stmt)
        await db.commit()
        return True


liquidacion_service = LiquidacionService()
