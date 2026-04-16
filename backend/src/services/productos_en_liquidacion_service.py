from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from src.repository.productos_en_liquidacion_repo import (
    productos_en_liquidacion_repo,
)
from src.models.productos_en_liquidacion import ProductosEnLiquidacion
from src.models.item_anexo import ItemAnexo
from src.dto.productos_en_liquidacion_dto import (
    ProductosEnLiquidacionCreate,
    ProductosEnLiquidacionRead,
    ProductosEnLiquidacionUpdate,
)


class ProductosEnLiquidacionService:
    @staticmethod
    async def generate_codigo(db: AsyncSession) -> str:
        anio = datetime.now().year
        cantidad = await productos_en_liquidacion_repo.get_codigo_anio(db, anio)
        return f"{anio}.{cantidad}"

    @staticmethod
    async def create(
        db: AsyncSession, data: ProductosEnLiquidacionCreate
    ) -> ProductosEnLiquidacionRead:
        codigo = await ProductosEnLiquidacionService.generate_codigo(db)

        db_producto = ProductosEnLiquidacion(
            codigo=codigo,
            id_producto=data.id_producto,
            cantidad=data.cantidad,
            precio=data.precio,
            id_moneda=data.id_moneda,
            tipo_compra=data.tipo_compra,
            id_factura=data.id_factura,
            id_venta_efectivo=data.id_venta_efectivo,
            id_anexo=data.id_anexo,
            liquidada=False,
        )

        db.add(db_producto)
        await db.commit()
        await db.refresh(db_producto)

        return ProductosEnLiquidacionRead.model_validate(db_producto)

    @staticmethod
    async def get(
        db: AsyncSession, producto_en_liquidacion_id: int
    ) -> Optional[ProductosEnLiquidacionRead]:
        db_producto = await productos_en_liquidacion_repo.get_with_relations(
            db, producto_en_liquidacion_id
        )
        if db_producto:
            return ProductosEnLiquidacionRead.model_validate(
                db_producto, from_attributes=True
            )
        return None

    @staticmethod
    async def get_multi(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[ProductosEnLiquidacionRead]:
        db_productos = await productos_en_liquidacion_repo.get_multi_with_relations(
            db, skip=skip, limit=limit
        )
        results = []
        for p in db_productos:
            try:
                results.append(
                    ProductosEnLiquidacionRead.model_validate(p, from_attributes=True)
                )
            except Exception as e:
                print(f"Error validating product: {e}")
                results.append(
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
                    )
                )
        return results

    @staticmethod
    async def get_pendientes(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[ProductosEnLiquidacionRead]:
        db_productos = await productos_en_liquidacion_repo.get_pendientes(
            db, skip=skip, limit=limit
        )
        return [
            ProductosEnLiquidacionRead.model_validate(p, from_attributes=True)
            for p in db_productos
        ]

    @staticmethod
    async def get_liquidadas(
        db: AsyncSession, skip: int = 0, limit: int = 100
    ) -> List[ProductosEnLiquidacionRead]:
        db_productos = await productos_en_liquidacion_repo.get_liquidadas(
            db, skip=skip, limit=limit
        )
        return [
            ProductosEnLiquidacionRead.model_validate(p, from_attributes=True)
            for p in db_productos
        ]

    @staticmethod
    async def update(
        db: AsyncSession,
        producto_en_liquidacion_id: int,
        data: ProductosEnLiquidacionUpdate,
    ) -> Optional[ProductosEnLiquidacionRead]:
        db_producto = await productos_en_liquidacion_repo.get(
            db, producto_en_liquidacion_id
        )
        if not db_producto:
            return None

        obj_data = data.model_dump(exclude_unset=True)
        for field, value in obj_data.items():
            setattr(db_producto, field, value)

        db.add(db_producto)
        await db.commit()
        await db.refresh(db_producto)

        return ProductosEnLiquidacionRead.model_validate(db_producto)

    @staticmethod
    async def marcar_liquidada(
        db: AsyncSession, producto_en_liquidacion_id: int
    ) -> Optional[ProductosEnLiquidacionRead]:
        db_producto = await productos_en_liquidacion_repo.get(
            db, producto_en_liquidacion_id
        )
        if not db_producto:
            return None

        db_producto.liquidada = True
        db_producto.fecha_liquidacion = datetime.utcnow()

        db.add(db_producto)
        await db.commit()
        await db.refresh(db_producto)

        return ProductosEnLiquidacionRead.model_validate(db_producto)

    @staticmethod
    async def delete(db: AsyncSession, producto_en_liquidacion_id: int) -> bool:
        db_producto = await productos_en_liquidacion_repo.get(
            db, producto_en_liquidacion_id
        )
        if not db_producto:
            return False

        await db.delete(db_producto)
        await db.commit()
        return True


productos_en_liquidacion_service = ProductosEnLiquidacionService()


async def get_codigo_from_item_anexo(
    db: AsyncSession, id_producto: int
) -> Optional[str]:
    """Obtiene el código más antiguo de item_anexo para un producto específico."""
    statement = (
        select(ItemAnexo)
        .where(ItemAnexo.id_producto == id_producto)
        .order_by(ItemAnexo.id_item_anexo.asc())
        .limit(1)
    )
    result = await db.exec(statement)
    item = result.first()
    return item.codigo if item else None


async def agregar_desde_factura(
    db: AsyncSession, id_factura: int, productos: List[dict]
) -> None:
    """Agrega productos desde una factura a la tabla de productos_en_liquidacion."""
    for prod in productos:
        codigo = await get_codigo_from_item_anexo(db, prod["id_producto"])
        if not codigo:
            codigo = await productos_en_liquidacion_service.generate_codigo(db)
        db_producto = ProductosEnLiquidacion(
            codigo=codigo,
            id_producto=prod["id_producto"],
            cantidad=prod["cantidad"],
            precio=Decimal(str(prod.get("precio_venta", prod.get("precio", 0)))),
            id_moneda=prod.get("id_moneda", 1),
            tipo_compra="FACTURA",
            id_factura=id_factura,
            liquidada=False,
        )
        db.add(db_producto)
    await db.commit()


async def agregar_desde_venta_efectivo(
    db: AsyncSession, id_venta_efectivo: int, productos: List[dict]
) -> None:
    """Agrega productos desde una venta en efectivo a la tabla de productos_en_liquidacion."""
    for prod in productos:
        codigo = await get_codigo_from_item_anexo(db, prod["id_producto"])
        if not codigo:
            codigo = await productos_en_liquidacion_service.generate_codigo(db)
        db_producto = ProductosEnLiquidacion(
            codigo=codigo,
            id_producto=prod["id_producto"],
            cantidad=prod["cantidad"],
            precio=Decimal(str(prod.get("precio_venta", prod.get("precio", 0)))),
            id_moneda=prod.get("id_moneda", 1),
            tipo_compra="VENTA_EFECTIVO",
            id_venta_efectivo=id_venta_efectivo,
            liquidada=False,
        )
        db.add(db_producto)
    await db.commit()


async def agregar_desde_venta_efectivo(
    db: AsyncSession, id_venta_efectivo: int, productos: List[dict]
) -> None:
    """Agrega productos desde una venta en efectivo a la tabla de productos_en_liquidacion."""
    for prod in productos:
        codigo = await productos_en_liquidacion_service.generate_codigo(db)
        db_producto = ProductosEnLiquidacion(
            codigo=codigo,
            id_producto=prod["id_producto"],
            cantidad=prod["cantidad"],
            precio=Decimal(str(prod.get("precio_venta", prod.get("precio", 0)))),
            id_moneda=prod.get("id_moneda", 1),
            tipo_compra="VENTA_EFECTIVO",
            id_venta_efectivo=id_venta_efectivo,
            liquidada=False,
        )
        db.add(db_producto)
    await db.commit()


async def agregar_desde_anexo(
    db: AsyncSession, id_anexo: int, productos: List[dict]
) -> None:
    """Agrega productos desde un anexo a la tabla de productos_en_liquidacion."""
    for prod in productos:
        codigo = await productos_en_liquidacion_service.generate_codigo(db)
        db_producto = ProductosEnLiquidacion(
            codigo=codigo,
            id_producto=prod["id_producto"],
            cantidad=prod["cantidad"],
            precio=prod.get("precio", 0),
            id_moneda=prod.get("id_moneda", 1),
            tipo_compra="ANEXO",
            id_anexo=id_anexo,
            liquidada=False,
        )
        db.add(db_producto)
    await db.commit()
