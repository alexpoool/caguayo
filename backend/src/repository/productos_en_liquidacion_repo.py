from sqlmodel import select, func
from sqlalchemy import or_, and_
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
            .options(
                selectinload(ProductosEnLiquidacion.producto),
                selectinload(ProductosEnLiquidacion.moneda),
                selectinload(ProductosEnLiquidacion.anexo),
            )
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
                selectinload(ProductosEnLiquidacion.anexo),
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
                selectinload(ProductosEnLiquidacion.anexo),
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
        """Obtiene todos los items de anexos del cliente con su estado:
        - CONSIGNACION: productos en item_anexo sin compras (facturas/ventas) asociadas
        - A LIQUIDAR: productos comprados (en productos_en_liquidacion) pendientes de liquidar
        - LIQUIDADO: productos en productos_en_liquidacion con liquidada=True

        Lógica:
        - Anexo CONSIGNACION: item_anexo (x) + productos_en_liquidacion (y) -> Por liquidar = x - z, A liquidar = y
        - Anexo COMPRA VENTA: va directo a productos_en_liquidacion con cantidad_original = 0
        """
        from src.models.item_anexo import ItemAnexo
        from src.models.anexo import Anexo
        from src.models.convenio import Convenio
        from src.models.producto import Productos
        from src.models.tipo_convenio import TipoConvenio

        items = []

        # Paso 1: Obtener IDs de anexos del cliente CON info de tipo de convenio
        anexos_stmt = (
            select(
                Anexo.id_anexo,
                Anexo.nombre_anexo,
                TipoConvenio.nombre.label("tipo_convenio"),
            )
            .join(Convenio, Anexo.id_convenio == Convenio.id_convenio)
            .join(
                TipoConvenio, TipoConvenio.id_tipo_convenio == Convenio.id_tipo_convenio
            )
            .where(Convenio.id_cliente == cliente_id)
        )

        if anexo_id:
            anexos_stmt = anexos_stmt.where(Anexo.id_anexo == anexo_id)

        result_anexos = await db.exec(anexos_stmt)
        rows_anexos = result_anexos.all()

        if not rows_anexos:
            return items

        # Crear diccionarios de anexos por tipo
        anexos_ids = []
        anexos_info = {}  # id_anexo -> {nombre, es_compra_venta, tipo_convenio}

        for row in rows_anexos:
            anexos_ids.append(row[0])
            es_compra_venta = row[2] == "COMPRA VENTA"
            anexos_info[row[0]] = {
                "nombre": row[1],
                "es_compra_venta": es_compra_venta,
                "tipo_convenio": row[2],
            }

        # Paso 2: Obtener todos los items de esos anexos desde item_anexo
        # (Solo para anexos de CONSIGNACION - los de COMPRA VENTA van directo a pel)
        items_anexo_stmt = (
            select(
                ItemAnexo.id_item_anexo,
                ItemAnexo.id_producto,
                ItemAnexo.id_anexo,
                ItemAnexo.cantidad,
                ItemAnexo.precio_compra,
                ItemAnexo.precio_venta,
                ItemAnexo.id_moneda,
                Anexo.nombre_anexo,
            )
            .join(Anexo, ItemAnexo.id_anexo == Anexo.id_anexo)
            .where(
                and_(
                    ItemAnexo.id_anexo.in_(anexos_ids),
                    # Excluir anexos de COMPRA VENTA - sus productos van directo a pel
                    ~Anexo.id_anexo.in_(
                        select(Anexo.id_anexo)
                        .join(Convenio, Anexo.id_convenio == Convenio.id_convenio)
                        .join(
                            TipoConvenio,
                            TipoConvenio.id_tipo_convenio == Convenio.id_tipo_convenio,
                        )
                        .where(TipoConvenio.nombre == "COMPRA VENTA")
                    ),
                )
            )
        )

        result_items = await db.exec(items_anexo_stmt)
        rows_items = result_items.all()

        # Paso 3: Obtener TODOS los productos_en_liquidacion relacionados al cliente
        # Incluye: con id_anexo, con id_factura, con id_venta_efectivo
        pel_stmt = select(ProductosEnLiquidacion).where(
            or_(
                # Productos con id_anexo en los anexos del cliente
                ProductosEnLiquidacion.id_anexo.in_(anexos_ids),
                # Productos de facturas del cliente
                and_(
                    ProductosEnLiquidacion.id_factura != None,
                    ProductosEnLiquidacion.id_producto.in_(
                        select(ItemAnexo.id_producto).where(
                            ItemAnexo.id_anexo.in_(anexos_ids)
                        )
                    ),
                ),
                # Productos de ventas efectivo del cliente
                and_(
                    ProductosEnLiquidacion.id_venta_efectivo != None,
                    ProductosEnLiquidacion.id_producto.in_(
                        select(ItemAnexo.id_producto).where(
                            ItemAnexo.id_anexo.in_(anexos_ids)
                        )
                    ),
                ),
            )
        )

        result_pel = await db.exec(pel_stmt)
        rows_pel = result_pel.all()

        # Paso 4: Procesar items de CONSIGNACION (los que tienen item_anexo)
        for row in rows_items:
            id_item_anexo = row[0]
            id_producto = row[1]
            id_anexo = row[2]
            cantidad_original = row[3]  # x - cantidad entrada en anexo
            precio_compra = row[4]
            precio_venta = row[5]
            id_moneda = row[6]
            nombre_anexo = row[7]

            # Obtener productos_en_liquidacion relacionados para ESTE anexo específico
            # Solo incluye: con id_anexo igual al del item_anexo
            pel_relacionados_stmt = select(ProductosEnLiquidacion).where(
                and_(
                    ProductosEnLiquidacion.id_producto == id_producto,
                    ProductosEnLiquidacion.id_anexo == id_anexo,
                )
            )
            result_pel_relacionados = await db.exec(pel_relacionados_stmt)
            pel_relacionados = result_pel_relacionados.all()

            # Si no hay pel con id_anexo, buscar los que vienen de factura/venta efectivo
            # asociados a este producto en este anexo
            if not pel_relacionados:
                pel_relacionados_stmt = select(ProductosEnLiquidacion).where(
                    and_(
                        ProductosEnLiquidacion.id_producto == id_producto,
                        ProductosEnLiquidacion.id_anexo == None,
                        or_(
                            ProductosEnLiquidacion.id_factura != None,
                            ProductosEnLiquidacion.id_venta_efectivo != None,
                        ),
                    )
                )
                result_pel_relacionados = await db.exec(pel_relacionados_stmt)
                pel_relacionados = result_pel_relacionados.all()

            # Calcular cantidad pendiente (no liquidada)
            pel_pendiente = [p for p in pel_relacionados if not p.liquidada]
            cantidad_pendiente = sum(p.cantidad for p in pel_pendiente)

            # Calcular cantidad ya liquidada (z)
            pel_liquidada_list = [p for p in pel_relacionados if p.liquidada]
            cantidad_liquidada = sum(p.cantidad for p in pel_liquidada_list)

            # Obtener IDs de productos_en_liquidacion para seleccionar
            # Usamos los IDs de los registros no liquidados para el checkbox
            pel_ids = [p.id_producto_en_liquidacion for p in pel_pendiente]

            # Por liquidar = x - z
            por_liquidar = max(0, cantidad_original - cantidad_liquidada)

            # Validar que cantidad pendiente <= cantidad original
            # (y no puede ser mayor que x)
            cantidad_a_mostrar = (
                min(cantidad_pendiente, cantidad_original)
                if cantidad_original > 0
                else cantidad_pendiente
            )

            # Determinar estado
            if cantidad_liquidada > 0 and cantidad_pendiente == 0:
                estado = "LIQUIDADO"
            elif cantidad_pendiente > 0:
                estado = "A LIQUIDAR"
            else:
                estado = "EN_CONSIGNACION"

            # Usar el primer ID de pel para el checkbox (o null si no hay ninguno)
            id_pel_principal = pel_ids[0] if pel_ids else None

            items.append(
                {
                    "id_item_anexo": id_item_anexo,
                    "id_producto": id_producto,
                    "id_anexo": id_anexo,
                    "cantidad": cantidad_a_mostrar,  # y (a liquidar)
                    "cantidad_original": cantidad_original,  # x
                    "cantidad_liquidada": cantidad_liquidada,  # z
                    "por_liquidar": por_liquidar,  # x - z
                    "precio_compra": float(precio_compra),
                    "precio_venta": float(precio_venta),
                    "id_moneda": id_moneda,
                    "nombre_anexo": nombre_anexo,
                    "producto_nombre": None,
                    "producto_codigo": None,
                    "id_producto_en_liquidacion": id_pel_principal,
                    "pel_ids": pel_ids,  # Todos los IDs para seleccionados múltiples
                    "estado": estado,
                    "origen": "CONSIGNACION",
                    "es_compra_venta": False,
                }
            )

        # Paso 5: Procesar productos de COMPRA VENTA (directo a productos_en_liquidacion)
        # Obtener anexos de COMPRA VENTA
        anexos_compra_venta_ids = [
            aid for aid, info in anexos_info.items() if info["es_compra_venta"]
        ]

        pel_compra_venta = [
            pel for pel in rows_pel if pel.id_anexo in anexos_compra_venta_ids
        ]

        for pel in pel_compra_venta:
            info_anexo = anexos_info.get(pel.id_anexo, {})

            # Calcular cantidad ya liquidada de este producto en este anexo
            pel_liquidada_stmt = select(
                func.coalesce(func.sum(ProductosEnLiquidacion.cantidad), 0)
            ).where(
                and_(
                    ProductosEnLiquidacion.id_producto == pel.id_producto,
                    ProductosEnLiquidacion.id_anexo == pel.id_anexo,
                    ProductosEnLiquidacion.liquidada == True,
                )
            )
            result_liquidada = await db.exec(pel_liquidada_stmt)
            valor_liquidada = result_liquidada.one()
            cantidad_liquidada = (
                int(valor_liquidada) if valor_liquidada is not None else 0
            )

            if pel.liquidada:
                estado = "LIQUIDADO"
            else:
                estado = "A LIQUIDAR"

            items.append(
                {
                    "id_item_anexo": None,
                    "id_producto": pel.id_producto,
                    "id_anexo": pel.id_anexo,
                    "cantidad": pel.cantidad,  # y (a liquidar)
                    "cantidad_original": 0,  # x = 0 para COMPRA VENTA
                    "cantidad_liquidada": cantidad_liquidada,
                    "por_liquidar": 0,  # siempre 0 para COMPRA VENTA
                    "precio_compra": float(pel.precio),
                    "precio_venta": float(pel.precio),
                    "id_moneda": pel.id_moneda,
                    "nombre_anexo": info_anexo.get("nombre", "Sin anexo"),
                    "producto_nombre": None,
                    "producto_codigo": None,
                    "id_producto_en_liquidacion": pel.id_producto_en_liquidacion,
                    "estado": estado,
                    "origen": "COMPRA_VENTA",
                    "es_compra_venta": True,
                }
            )

        # Paso 6: Obtener nombres de productos (una consulta para todos)
        if items:
            producto_ids = list(set([item["id_producto"] for item in items]))
            productos_stmt = select(Productos).where(
                Productos.id_producto.in_(producto_ids)
            )
            result_productos = await db.exec(productos_stmt)
            productos_dict = {p.id_producto: p for p in result_productos.all()}

            for item in items:
                prod = productos_dict.get(item["id_producto"])
                if prod:
                    item["producto_nombre"] = prod.nombre
                    item["producto_codigo"] = prod.codigo

        return items


productos_en_liquidacion_repo = ProductosEnLiquidacionRepository(ProductosEnLiquidacion)
