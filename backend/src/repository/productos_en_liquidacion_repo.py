from sqlmodel import select, func
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
    ) -> List[ProductosEnLiquidacion]:
        from src.models.anexo import Anexo
        from src.models.convenio import Convenio

        if anexo_id:
            statement = (
                select(ProductosEnLiquidacion)
                .join(Anexo, ProductosEnLiquidacion.id_anexo == Anexo.id_anexo)
                .join(Convenio, Anexo.id_convenio == Convenio.id_convenio)
                .where(
                    ProductosEnLiquidacion.liquidada == False,
                    ProductosEnLiquidacion.id_anexo == anexo_id,
                    Convenio.id_cliente == cliente_id,
                )
                .order_by(ProductosEnLiquidacion.fecha.desc())
            )
        else:
            statement = (
                select(ProductosEnLiquidacion)
                .join(Anexo, ProductosEnLiquidacion.id_anexo == Anexo.id_anexo)
                .join(Convenio, Anexo.id_convenio == Convenio.id_convenio)
                .where(
                    ProductosEnLiquidacion.liquidada == False,
                    Convenio.id_cliente == cliente_id,
                )
                .order_by(ProductosEnLiquidacion.fecha.desc())
            )

        result = await db.exec(statement)
        return result.all()

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
        """Obtiene todos los items de anexos del cliente con su estado (NO_VENDIDO, VENDIDO, LIQUIDADO)."""
        from src.models.item_anexo import ItemAnexo
        from src.models.anexo import Anexo
        from src.models.convenio import Convenio
        from src.models.producto import Productos

        statement = (
            select(
                ItemAnexo.id_item_anexo,
                ItemAnexo.id_producto,
                ItemAnexo.id_anexo,
                ItemAnexo.cantidad,
                ItemAnexo.precio_compra,
                ItemAnexo.precio_venta,
                ItemAnexo.id_moneda,
                Anexo.nombre_anexo,
                Productos.nombre.label("producto_nombre"),
                Productos.codigo.label("producto_codigo"),
                ProductosEnLiquidacion.id_producto_en_liquidacion,
                ProductosEnLiquidacion.liquidada,
            )
            .join(Anexo, ItemAnexo.id_anexo == Anexo.id_anexo)
            .join(Convenio, Anexo.id_convenio == Convenio.id_convenio)
            .join(Productos, ItemAnexo.id_producto == Productos.id_producto)
            .outerjoin(
                ProductosEnLiquidacion,
                (ItemAnexo.id_producto == ProductosEnLiquidacion.id_producto)
                & (ItemAnexo.id_anexo == ProductosEnLiquidacion.id_anexo),
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
                cantidad,
                precio_compra,
                precio_venta,
                id_moneda,
                nombre_anexo,
                producto_nombre,
                producto_codigo,
                id_pel,
                liquidada,
            ) = row

            if id_pel is None:
                estado = "NO_VENDIDO"
            elif liquidada:
                estado = "LIQUIDADO"
            else:
                estado = "VENDIDO"

            items.append(
                {
                    "id_item_anexo": id_item_anexo,
                    "id_producto": id_producto,
                    "id_anexo": id_anexo,
                    "cantidad": cantidad,
                    "precio_compra": float(precio_compra),
                    "precio_venta": float(precio_venta),
                    "id_moneda": id_moneda,
                    "nombre_anexo": nombre_anexo,
                    "producto_nombre": producto_nombre,
                    "producto_codigo": producto_codigo,
                    "id_producto_en_liquidacion": id_pel,
                    "estado": estado,
                }
            )

        return items


productos_en_liquidacion_repo = ProductosEnLiquidacionRepository(ProductosEnLiquidacion)
