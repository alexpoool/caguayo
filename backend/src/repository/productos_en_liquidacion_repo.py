from sqlmodel import select, func
from sqlalchemy import or_
from sqlalchemy.orm import selectinload
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional, Type, TypeVar
from datetime import datetime
from src.repository.base import CRUDBase
from src.models.productos_en_liquidacion import ProductosEnLiquidacion

ModelType = TypeVar("ModelType")


class ProductosEnLiquidacionRepository(CRUDBase[ProductosEnLiquidacion, dict, dict]):
    async def get_with_relations(
        self, db: AsyncSession, id: int
    ) -> Optional[ProductosEnLiquidacion]:
        statement = select(ProductosEnLiquidacion).where(
            ProductosEnLiquidacion.id_producto_en_liquidacion == id
        )
        result = await db.exec(statement)
        return result.first()

    async def get_multi_with_relations(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[ProductosEnLiquidacion]:
        statement = (
            select(ProductosEnLiquidacion)
            .order_by(ProductosEnLiquidacion.fecha.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.exec(statement)
        return result.all()

    async def get_pendientes(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[ProductosEnLiquidacion]:
        statement = (
            select(ProductosEnLiquidacion)
            .where(ProductosEnLiquidacion.liquidada == False)
            .options(
                selectinload(ProductosEnLiquidacion.producto),
                selectinload(ProductosEnLiquidacion.moneda),
            )
            .order_by(ProductosEnLiquidacion.fecha.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.exec(statement)
        return result.all()

    async def get_liquidadas(
        self, db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[ProductosEnLiquidacion]:
        statement = (
            select(ProductosEnLiquidacion)
            .where(ProductosEnLiquidacion.liquidada == True)
            .options(
                selectinload(ProductosEnLiquidacion.producto),
                selectinload(ProductosEnLiquidacion.moneda),
            )
            .order_by(ProductosEnLiquidacion.fecha_liquidacion.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.exec(statement)
        return result.all()

    async def get_by_factura(
        self, db: AsyncSession, factura_id: int
    ) -> List[ProductosEnLiquidacion]:
        statement = select(ProductosEnLiquidacion).where(
            ProductosEnLiquidacion.id_factura == factura_id
        )
        result = await db.exec(statement)
        return result.all()

    async def get_by_venta_efectivo(
        self, db: AsyncSession, venta_efectivo_id: int
    ) -> List[ProductosEnLiquidacion]:
        statement = select(ProductosEnLiquidacion).where(
            ProductosEnLiquidacion.id_venta_efectivo == venta_efectivo_id
        )
        result = await db.exec(statement)
        return result.all()

    async def get_by_anexo(
        self, db: AsyncSession, anexo_id: int
    ) -> List[ProductosEnLiquidacion]:
        statement = select(ProductosEnLiquidacion).where(
            ProductosEnLiquidacion.id_anexo == anexo_id
        )
        result = await db.exec(statement)
        return result.all()

    async def get_by_producto(
        self, db: AsyncSession, producto_id: int, skip: int = 0, limit: int = 100
    ) -> List[ProductosEnLiquidacion]:
        statement = (
            select(ProductosEnLiquidacion)
            .where(ProductosEnLiquidacion.id_producto == producto_id)
            .order_by(ProductosEnLiquidacion.fecha.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.exec(statement)
        return result.all()

    async def get_cantidad_productos_anio(self, db: AsyncSession, anio: int) -> int:
        statement = (
            select(func.count())
            .select_from(ProductosEnLiquidacion)
            .where(func.extract("YEAR", ProductosEnLiquidacion.fecha) == anio)
        )
        result = await db.exec(statement)
        return result.one()

    async def get_codigo_anio(self, db: AsyncSession, anio: int) -> int:
        statement = (
            select(func.count())
            .select_from(ProductosEnLiquidacion)
            .where(func.extract("YEAR", ProductosEnLiquidacion.fecha) == anio)
        )
        result = await db.exec(statement)
        return result.one() + 1

    async def get_pendientes_by_cliente(
        self, db: AsyncSession, cliente_id: int
    ) -> List[ProductosEnLiquidacion]:
        statement = (
            select(ProductosEnLiquidacion)
            .where(
                ProductosEnLiquidacion.liquidada == False,
                ProductosEnLiquidacion.id_anexo.in_(
                    select(ProductosEnLiquidacion.id_anexo).where(
                        ProductosEnLiquidacion.id_anexo.isnot(None)
                    )
                ),
            )
            .order_by(ProductosEnLiquidacion.fecha.desc())
        )
        result = await db.exec(statement)
        return result.all()

    async def get_pendientes_by_cliente_y_anexo(
        self, db: AsyncSession, cliente_id: int, anexo_id: Optional[int] = None
    ) -> List[dict]:
        from src.models.anexo import Anexo
        from src.models.convenio import Convenio
        from src.models.item_anexo import ItemAnexo
        from src.models.item_venta_efectivo import ItemVentaEfectivo
        from src.models.item_factura import ItemFactura
        from src.models.producto import Productos

        base_joins = (
            select(
                ProductosEnLiquidacion,
                Productos.nombre.label("producto_nombre"),
                func.coalesce(
                    ItemAnexo.cantidad,
                    ItemVentaEfectivo.cantidad,
                    ItemFactura.cantidad,
                ).label("cantidad_original"),
            )
            .join(
                Productos, ProductosEnLiquidacion.id_producto == Productos.id_producto
            )
            .outerjoin(
                ItemAnexo,
                (ProductosEnLiquidacion.id_anexo == ItemAnexo.id_anexo)
                & (ProductosEnLiquidacion.id_producto == ItemAnexo.id_producto),
            )
            .outerjoin(
                ItemVentaEfectivo,
                (
                    ProductosEnLiquidacion.id_venta_efectivo
                    == ItemVentaEfectivo.id_venta_efectivo
                )
                & (ProductosEnLiquidacion.id_producto == ItemVentaEfectivo.id_producto),
            )
            .outerjoin(
                ItemFactura,
                (ProductosEnLiquidacion.id_factura == ItemFactura.id_factura)
                & (ProductosEnLiquidacion.id_producto == ItemFactura.id_producto),
            )
        )

        if anexo_id:
            statement = (
                base_joins.outerjoin(
                    Anexo, ProductosEnLiquidacion.id_anexo == Anexo.id_anexo
                )
                .outerjoin(Convenio, Anexo.id_convenio == Convenio.id_convenio)
                .where(
                    ProductosEnLiquidacion.liquidada == False,
                    ProductosEnLiquidacion.id_anexo == anexo_id,
                    or_(
                        Convenio.id_cliente == cliente_id,
                        ProductosEnLiquidacion.id_venta_efectivo.isnot(None),
                    ),
                )
            )
        else:
            statement = (
                base_joins.outerjoin(
                    Anexo, ProductosEnLiquidacion.id_anexo == Anexo.id_anexo
                )
                .outerjoin(Convenio, Anexo.id_convenio == Convenio.id_convenio)
                .where(
                    ProductosEnLiquidacion.liquidada == False,
                    or_(
                        Convenio.id_cliente == cliente_id,
                        ProductosEnLiquidacion.id_venta_efectivo.isnot(None),
                    ),
                )
            )

        statement = statement.order_by(ProductosEnLiquidacion.fecha.desc())

        result = await db.exec(statement)
        rows = result.all()

        items = []
        for row in rows:
            from src.dto.productos_en_liquidacion_dto import ProductosEnLiquidacionRead

            pel = row[0]
            producto_nombre = row[1]
            cantidad_original = row[2]

            cantidad_liquidada = 0
            if pel.id_anexo is not None:
                cantidad_stmt = select(
                    func.coalesce(func.sum(ProductosEnLiquidacion.cantidad), 0)
                ).where(
                    ProductosEnLiquidacion.id_producto == pel.id_producto,
                    ProductosEnLiquidacion.id_anexo == pel.id_anexo,
                    ProductosEnLiquidacion.liquidada == True,
                )
            elif pel.id_venta_efectivo is not None:
                cantidad_stmt = select(
                    func.coalesce(func.sum(ProductosEnLiquidacion.cantidad), 0)
                ).where(
                    ProductosEnLiquidacion.id_producto == pel.id_producto,
                    ProductosEnLiquidacion.id_venta_efectivo == pel.id_venta_efectivo,
                    ProductosEnLiquidacion.liquidada == True,
                )
            else:
                cantidad_stmt = None

            if cantidad_stmt:
                cantidad_result = await db.exec(cantidad_stmt)
                cantidad_liquidada = cantidad_result.one() or 0

            items.append(
                {
                    **ProductosEnLiquidacionRead.model_validate(pel).model_dump(),
                    "producto_nombre": producto_nombre,
                    "cantidad_original": cantidad_original,
                    "cantidad_liquidada": cantidad_liquidada,
                }
            )

        return items

    async def get_by_ids(
        self, db: AsyncSession, ids: List[int]
    ) -> List[ProductosEnLiquidacion]:
        statement = select(ProductosEnLiquidacion).where(
            ProductosEnLiquidacion.id_producto_en_liquidacion.in_(ids)
        )
        result = await db.exec(statement)
        return result.all()

    async def get_items_anexo_con_estado_por_cliente(
        self, db: AsyncSession, cliente_id: int, anexo_id: Optional[int] = None
    ) -> List[dict]:
        """Obtiene todos los items de anexos del cliente con su estado (EN_CONSIGNACION, A LIQUIDAR, LIQUIDADO)."""
        from src.models.item_anexo import ItemAnexo
        from src.models.anexo import Anexo
        from src.models.convenio import Convenio
        from src.models.producto import Productos

        statement = (
            select(
                ItemAnexo.id_item_anexo,
                ItemAnexo.id_producto,
                ItemAnexo.id_anexo,
                ItemAnexo.cantidad.label("cantidad_item_anexo"),
                ItemAnexo.precio_compra,
                ItemAnexo.precio_venta,
                ItemAnexo.id_moneda,
                Anexo.nombre_anexo,
                Productos.nombre.label("producto_nombre"),
                Productos.codigo.label("producto_codigo"),
                ProductosEnLiquidacion.id_producto_en_liquidacion,
                ProductosEnLiquidacion.liquidada,
                ProductosEnLiquidacion.id_venta_efectivo,
                ProductosEnLiquidacion.cantidad.label("cantidad_liquidacion"),
            )
            .distinct()
            .join(Anexo, ItemAnexo.id_anexo == Anexo.id_anexo)
            .join(Convenio, Anexo.id_convenio == Convenio.id_convenio)
            .join(Productos, ItemAnexo.id_producto == Productos.id_producto)
            .outerjoin(
                ProductosEnLiquidacion,
                (ItemAnexo.id_producto == ProductosEnLiquidacion.id_producto)
                & (
                    or_(
                        ItemAnexo.id_anexo == ProductosEnLiquidacion.id_anexo,
                        ProductosEnLiquidacion.id_venta_efectivo.isnot(None),
                    )
                ),
            )
            .where(Convenio.id_cliente == cliente_id)
            .order_by(Anexo.nombre_anexo, Productos.nombre)
        )

        if anexo_id:
            statement = statement.where(Anexo.id_anexo == anexo_id)

        result = await db.exec(statement)
        rows = result.all()

        items = []

        for row in rows:
            (
                id_item_anexo,
                id_producto,
                id_anexo,
                cantidad_item_anexo,
                precio_compra,
                precio_venta,
                id_moneda,
                nombre_anexo,
                producto_nombre,
                producto_codigo,
                id_pel,
                liquidada,
                id_venta_efectivo,
                cantidad_liquidacion,
            ) = row

            cantidad_original = int(cantidad_item_anexo) if cantidad_item_anexo else 0

            cantidad_pendiente = 0
            cantidad_liquidada = 0

            if id_pel is not None:
                pel_stmt = select(
                    func.coalesce(func.sum(ProductosEnLiquidacion.cantidad), 0).label(
                        "total"
                    ),
                    func.coalesce(
                        func.sum(
                            func.case(
                                (
                                    ProductosEnLiquidacion.liquidada == False,
                                    ProductosEnLiquidacion.cantidad,
                                ),
                                else_=0,
                            )
                        ),
                        0,
                    ).label("pendiente"),
                ).where(ProductosEnLiquidacion.id_producto == id_producto)

                if id_anexo:
                    pel_stmt = pel_stmt.where(
                        ProductosEnLiquidacion.id_anexo == id_anexo
                    )
                elif id_venta_efectivo:
                    pel_stmt = pel_stmt.where(
                        ProductosEnLiquidacion.id_venta_efectivo == id_venta_efectivo
                    )

                pel_result = await db.exec(pel_stmt)
                pel_row = pel_result.one()

                cantidad_liquidada = int(pel_row.total) if pel_row.total else 0
                cantidad_pendiente = int(pel_row.pendiente) if pel_row.pendiente else 0

            por_liquidar = max(0, cantidad_original - cantidad_liquidada)

            if cantidad_pendiente > por_liquidar:
                cantidad_pendiente = por_liquidar

            if id_pel is None:
                if id_venta_efectivo is not None:
                    estado = "A LIQUIDAR"
                else:
                    estado = "EN_CONSIGNACION"
            elif liquidada:
                estado = "LIQUIDADO"
            else:
                estado = "A LIQUIDAR"

            items.append(
                {
                    "id_item_anexo": id_item_anexo,
                    "id_producto": id_producto,
                    "id_anexo": id_anexo,
                    "cantidad": cantidad_pendiente,
                    "cantidad_original": cantidad_original,
                    "cantidad_liquidada": cantidad_liquidada,
                    "precio_compra": float(precio_compra),
                    "precio_venta": float(precio_venta),
                    "id_moneda": id_moneda,
                    "nombre_anexo": nombre_anexo,
                    "producto_nombre": producto_nombre,
                    "producto_codigo": producto_codigo,
                    "id_producto_en_liquidacion": id_pel,
                    "estado": estado,
                    "id_venta_efectivo": id_venta_efectivo,
                }
            )

        return items


productos_en_liquidacion_repo = ProductosEnLiquidacionRepository(ProductosEnLiquidacion)
