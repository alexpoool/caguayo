from typing import List, Optional
from decimal import Decimal
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import text

from src.repository.oferta_tienda_repo import (
    oferta_tienda_repo,
    item_oferta_tienda_repo,
)
from src.repository.contratos_repo import factura_repo
from src.services.existencia_service import ExistenciaService
from src.services.contrato_service import (
    crear_items_y_movimientos_venta,
    map_factura_to_read,
    validar_contrato_para_venta,
)
from src.core.exceptions import BusinessLogicError
from src.models import OfertaTienda
from src.dto import (
    ItemOfertaTiendaRead,
    OfertaTiendaCreate,
    OfertaTiendaReadWithDetails,
    OfertaTiendaUpdate,
    FacturaCreate,
    FacturaReadWithDetails,
    ProductoSimpleRead,
)
from src.utils.codigos_entidad import (
    generar_codigo_factura,
    generar_codigo_oferta_tienda,
)


async def map_oferta_to_read(
    db: AsyncSession, oferta: OfertaTienda
) -> OfertaTiendaReadWithDetails:
    items_con_producto = []
    for item in (oferta.items_oferta_tienda or []):
        items_con_producto.append(
            ItemOfertaTiendaRead(
                id_item_oferta_tienda=item.id_item_oferta_tienda,
                id_oferta_tienda=item.id_oferta_tienda,
                id_producto=item.id_producto,
                cantidad=item.cantidad,
                precio_compra=item.precio_compra,
                precio_venta=item.precio_venta,
                id_moneda=item.id_moneda,
                codigo=item.codigo,
                id_anexo=item.id_anexo,
                producto=ProductoSimpleRead(
                    id_producto=item.producto.id_producto,
                    codigo=item.producto.codigo,
                    nombre=item.producto.nombre,
                    precio_venta=item.producto.precio_venta,
                )
                if item.producto
                else None,
            )
        )

    return OfertaTiendaReadWithDetails(
        id_oferta_tienda=oferta.id_oferta_tienda,
        id_contrato=oferta.id_contrato,
        codigo_oferta=oferta.codigo_oferta,
        descripcion=oferta.descripcion,
        observaciones=oferta.observaciones,
        fecha=oferta.fecha,
        monto=oferta.monto,
        estado=getattr(oferta, "estado", None) or "ACTIVA",
        id_factura=getattr(oferta, "id_factura", None),
        items=items_con_producto,
    )


async def _secuencia_oferta(db: AsyncSession, id_oferta_tienda: int) -> int:
    """Secuencia de la oferta dentro de su contrato (orden por fecha, id)."""
    stmt_sec = text(
        "SELECT rn FROM ("
        "  SELECT id_oferta_tienda, "
        "         ROW_NUMBER() OVER ("
        "             PARTITION BY id_contrato ORDER BY fecha, id_oferta_tienda"
        "         ) AS rn"
        "  FROM oferta_tienda"
        ") t WHERE id_oferta_tienda = :id_oferta"
    )
    result = await db.exec(stmt_sec, params={"id_oferta": id_oferta_tienda})
    return result.one()[0]


async def _secuencia_factura(db: AsyncSession, id_factura: int) -> int:
    """Secuencia de la factura dentro de su contrato (orden por fecha, id)."""
    stmt_sec = text(
        "SELECT rn FROM ("
        "  SELECT id_factura, "
        "         ROW_NUMBER() OVER ("
        "             PARTITION BY id_contrato ORDER BY fecha, id_factura"
        "         ) AS rn"
        "  FROM factura"
        ") t WHERE id_factura = :id_factura"
    )
    result = await db.exec(stmt_sec, params={"id_factura": id_factura})
    return result.one()[0]


def _total_items(items_data: list) -> Decimal:
    return sum(
        Decimal(str(item["cantidad"])) * Decimal(str(item["precio_venta"]))
        for item in items_data
    )


class OfertaTiendaService:
    @staticmethod
    async def create(
        db: AsyncSession,
        data: OfertaTiendaCreate,
        denominacion: Optional[str] = None,
    ) -> OfertaTiendaReadWithDetails:
        """Crear una oferta de tienda.

        No valida stock ni crea movimientos: la oferta solo materializa la
        intención de venta. El stock se descuenta al convertirla en factura.
        """
        data_dict = data.model_dump(exclude_none=True)
        items_data = data_dict.pop("items", [])

        data.monto = _total_items(items_data)

        await validar_contrato_para_venta(db, data.id_contrato)

        oferta = await oferta_tienda_repo.create(db, data)

        secuencia = await _secuencia_oferta(db, oferta.id_oferta_tienda)
        oferta.codigo_oferta = generar_codigo_oferta_tienda(
            data.fecha.year, oferta.id_contrato, secuencia
        )
        db.add(oferta)
        await db.flush()

        if items_data:
            await item_oferta_tienda_repo.create_items(
                db, oferta.id_oferta_tienda, items_data
            )

        await db.commit()
        await db.refresh(oferta)

        detalles = await oferta_tienda_repo.get_by_id_with_details(
            db, oferta.id_oferta_tienda
        )
        return await map_oferta_to_read(db, detalles)

    @staticmethod
    async def get(db: AsyncSession, id: int) -> Optional[OfertaTiendaReadWithDetails]:
        oferta = await oferta_tienda_repo.get_by_id_with_details(db, id)
        if not oferta:
            return None
        return await map_oferta_to_read(db, oferta)

    @staticmethod
    async def get_all(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[OfertaTiendaReadWithDetails]:
        ofertas = await oferta_tienda_repo.get_all_with_details(db, skip, limit)
        result = []
        for oferta in ofertas:
            result.append(await map_oferta_to_read(db, oferta))
        return result

    @staticmethod
    async def get_by_contrato(
        db: AsyncSession, id_contrato: int
    ) -> List[OfertaTiendaReadWithDetails]:
        ofertas = await oferta_tienda_repo.get_by_contrato(db, id_contrato)
        result = []
        for oferta in ofertas:
            result.append(await map_oferta_to_read(db, oferta))
        return result

    @staticmethod
    async def update(
        db: AsyncSession, id: int, data: OfertaTiendaUpdate
    ) -> Optional[OfertaTiendaReadWithDetails]:
        oferta = await oferta_tienda_repo.get(db, id)
        if not oferta:
            return None
        if oferta.estado != "ACTIVA":
            raise BusinessLogicError(
                "Solo se pueden editar ofertas en estado ACTIVA."
            )

        if data.id_contrato is not None:
            await validar_contrato_para_venta(db, data.id_contrato)

        data_dict = data.model_dump(exclude_unset=True)

        items_data = None
        if "items" in data_dict:
            items_data = data_dict.pop("items") or []
            # Eliminar items anteriores antes de crear nuevos
            existing_items = await item_oferta_tienda_repo.get_by_oferta(db, id)
            for old_item in existing_items:
                await db.delete(old_item)
            await db.flush()

            if items_data:
                data_dict["monto"] = _total_items(items_data)

        oferta_actualizada = await oferta_tienda_repo.update(
            db, id, OfertaTiendaUpdate(**data_dict)
        )
        if not oferta_actualizada:
            return None

        if items_data:
            await item_oferta_tienda_repo.create_items(
                db, id, [it.model_dump(exclude_none=True) if hasattr(it, "model_dump") else it for it in items_data]
            )
            await db.commit()
            await db.refresh(oferta_actualizada)

        return await map_oferta_to_read(db, oferta_actualizada)

    @staticmethod
    async def delete(db: AsyncSession, id: int) -> bool:
        """Anular una oferta (borrado lógico).

        La oferta no tiene movimientos ni pagos asociados, así que la
        anulación no revierte nada: solo quita la oferta del listado.
        """
        oferta = await oferta_tienda_repo.get(db, id)
        if not oferta:
            return False
        if oferta.estado == "CONVERTIDA":
            raise BusinessLogicError(
                "No se puede anular: la oferta ya fue convertida en factura."
            )
        oferta.estado = "ANULADA"
        db.add(oferta)
        await db.commit()
        return True

    @staticmethod
    async def convertir(
        db: AsyncSession,
        id_oferta: int,
        denominacion: Optional[str] = None,
        id_dependencia_usuario: Optional[int] = None,
    ) -> FacturaReadWithDetails:
        """Convertir una oferta en factura.

        Copia los datos de la oferta a una factura nueva (los códigos se
        regeneran), valida stock y crea los movimientos de venta pendientes.
        Si el stock no alcanza, se bloquea y la oferta queda activa.
        """
        oferta = await oferta_tienda_repo.get_by_id_with_details(db, id_oferta)
        if not oferta:
            return None
        if oferta.estado != "ACTIVA":
            raise BusinessLogicError(
                "Solo se pueden convertir ofertas en estado ACTIVA."
            )

        contrato = await validar_contrato_para_venta(db, oferta.id_contrato)

        items = await item_oferta_tienda_repo.get_by_oferta(db, id_oferta)
        items_data = [
            {
                "id_producto": it.id_producto,
                "cantidad": it.cantidad,
                "precio_venta": it.precio_venta,
                "id_moneda": it.id_moneda,
                "id_anexo": it.id_anexo,
            }
            for it in items
        ]

        # Validar existencias: tras convertir, la factura las vende
        if items_data:
            productos_validar = [
                {"id_producto": it["id_producto"], "cantidad": it["cantidad"]}
                for it in items_data
            ]
            resultado = await ExistenciaService.validar_multiple(
                db, productos_validar, id_dependencia_usuario
            )
            if not resultado["valido"]:
                mensaje = "\n".join(
                    f"Producto {e['id_producto']}: {e['mensaje']}"
                    for e in resultado["errores"]
                )
                raise BusinessLogicError(f"Stock insuficiente:\n{mensaje}")

        data_factura = FacturaCreate(
            id_contrato=oferta.id_contrato,
            codigo_factura=None,
            descripcion=oferta.descripcion,
            observaciones=oferta.observaciones,
            fecha=oferta.fecha,
            monto=oferta.monto,
        )

        factura = await factura_repo.create(db, data_factura)

        secuencia = await _secuencia_factura(db, factura.id_factura)
        factura.codigo_factura = generar_codigo_factura(
            denominacion or "",
            factura.fecha.year,
            factura.id_contrato,
            secuencia,
        )
        db.add(factura)
        await db.flush()

        await crear_items_y_movimientos_venta(
            db, factura, contrato, items_data, id_dependencia_usuario, denominacion
        )

        oferta.estado = "CONVERTIDA"
        oferta.id_factura = factura.id_factura
        db.add(oferta)
        await db.commit()
        await db.refresh(factura)

        factura_con_detalles = await factura_repo.get_by_id_with_details(
            db, factura.id_factura
        )
        return await map_factura_to_read(db, factura_con_detalles)
