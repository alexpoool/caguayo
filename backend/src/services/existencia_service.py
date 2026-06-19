from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional, Dict, Any
from src.repository.existencia_repo import ExistenciaRepository, existencia_repo


class ExistenciaService:
    """Servicio para gestionar existencias de productos.
    
    Sistema híbrido:
    - CONSIGNACION: desde ItemAnexo y ProductosEnLiquidacion
    - OTROS FLUJOS: desde Movimiento confirmado
    """
    
    @staticmethod
    async def get_existencias_consignacion(
        db: AsyncSession, 
        id_anexo: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Obtiene existencias por konsignación."""
        return await existencia_repo.get_existencias_consignacion(db, id_anexo)
    
    @staticmethod
    async def get_existencias_por_anexo(
        db: AsyncSession, 
        id_anexo: int
    ) -> List[Dict[str, Any]]:
        """Obtiene todas las existencias de un anexo específico."""
        return await existencia_repo.get_existencias_consignacion(db, id_anexo)
    
    @staticmethod
    async def get_existencias_movimientos(
        db: AsyncSession, 
        id_dependencia: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Obtiene existencias por movimientos."""
        return await existencia_repo.get_existencias_movimientos(db, id_dependencia)
    
    @staticmethod
    async def get_existencias_por_dependencia(
        db: AsyncSession, 
        id_dependencia: int
    ) -> List[Dict[str, Any]]:
        """Obtiene existencias por dependencia."""
        return await existencia_repo.get_existencias_movimientos(db, id_dependencia)
    
    @staticmethod
    async def get_existencias_hibridas(
        db: AsyncSession,
        id_dependencia: Optional[int] = None,
        id_anexo: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Obtiene existencias combinadas (sistema híbrido)."""
        return await existencia_repo.get_existencia_hibrida(
            db, id_dependencia, id_anexo
        )
    
    @staticmethod
    async def get_existencia_producto(
        db: AsyncSession,
        id_producto: int,
        id_dependencia: Optional[int] = None,
        id_anexo: Optional[int] = None
    ) -> Dict[str, Any]:
        """Obtiene existencia de un producto específico."""
        return await existencia_repo.get_existencia_producto(
            db, id_producto, id_dependencia, id_anexo
        )
    
    @staticmethod
    async def validar_disponibilidad(
        db: AsyncSession,
        id_producto: int,
        cantidad: int,
        id_dependencia: Optional[int] = None,
        id_anexo: Optional[int] = None
    ) -> Dict[str, Any]:
        """Valida si hay suficiente existencia.
        
        Returns:
            disponible: bool - True si hay suficiente stock
            mensaje: str - Descripción del resultado
        """
        return await existencia_repo.validar_disponibilidad(
            db, id_producto, cantidad, id_dependencia, id_anexo
        )
    
    @staticmethod
    async def validar_multiple(
        db: AsyncSession,
        productos: List[Dict[str, Any]],
        id_dependencia: Optional[int] = None,
        id_anexo: Optional[int] = None
    ) -> Dict[str, Any]:
        """Valida disponibilidad de múltiples productos.
        
        Args:
            productos: [{"id_producto": int, "cantidad": int}, ...]
        
        Returns:
            valido: bool - True si todos están disponibles
            errores: List[Dict] - Lista de productos con error
        """
        errores = []
        
        for prod in productos:
            resultado = await existencia_repo.validar_disponibilidad(
                db, 
                prod["id_producto"],
                prod["cantidad"],
                id_dependencia,
                id_anexo
            )
            
            if not resultado["disponible"]:
                errores.append({
                    "id_producto": prod["id_producto"],
                    "cantidad_solicitada": prod["cantidad"],
                    "stock": resultado["stock"],
                    "mensaje": resultado["mensaje"]
                })
        
        return {
            "valido": len(errores) == 0,
            "errores": errores,
            "mensaje": "Todos los productos disponibles" if len(errores) == 0 \
                     else f"{len(errores)} producto(s) sin stock suficiente"
        }
    
    @staticmethod
    async def get_resumen_existencias(
        db: AsyncSession,
        id_dependencia: Optional[int] = None
    ) -> Dict[str, Any]:
        """Obtiene resumen de existencias por tipo."""
        
        # Konsignación
        konsignacion = await existencia_repo.get_existencias_consignacion(db)
        total_kons = sum(e["stock"] for e in konsignacion)
        
        # Movimientos
        movimientos = await existencia_repo.get_existencias_movimientos(
            db, id_dependencia
        )
        total_mov = sum(e["stock"] for e in movimientos)
        
        # Híbrido
        hibrido = await existencia_repo.get_existencia_hibrida(
            db, id_dependencia
        )
        total_hibrido = sum(e["stock"] for e in hibrido)
        
        return {
            "total_konsignacion": total_kons,
            "total_movimientos": total_mov,
            "total_hibrido": total_hibrido,
            "productos_konsignacion": len(konsignacion),
            "productos_movimientos": len(movimientos),
            "productos_hibridos": len(hibrido)
        }
    
    @staticmethod
    async def recalcular_existencia(
        db: AsyncSession,
        id_producto: int
    ) -> int:
        """Recalcula la existencia de un producto desde las tablas fuente.
        
        Usa la misma lógica de exclusión que get_existencia_producto:
        - Si tiene ItemAnexo: usa stock de konsignación
        - Si no tiene ItemAnexo: usa stock de movimientos
        
        Returns:
            Nueva existencia calculada
        """
        from sqlalchemy import text

        kons_query = text("""
            SELECT COALESCE(SUM(ia.cantidad), 0) - COALESCE(SUM(ia.cantidad_vendida), 0)
            FROM item_anexo ia
            WHERE ia.id_producto = :id_producto
        """)
        kons_result = await db.exec(kons_query, params={"id_producto": id_producto})
        stock_kons = kons_result.scalar() or 0

        tiene_konsignacion = await ExistenciaService._producto_tiene_item_anexo(db, id_producto)

        if tiene_konsignacion:
            stock = stock_kons
        else:
            mov_query = text("""
                SELECT COALESCE(SUM(
                    CASE WHEN tm.factor > 0 THEN m.cantidad ELSE -m.cantidad END
                ), 0)
                FROM movimiento m
                JOIN tipo_movimiento tm ON m.id_tipo_movimiento = tm.id_tipo_movimiento
                WHERE m.id_producto = :id_producto AND m.estado = 'confirmado'
            """)
            mov_result = await db.exec(mov_query, params={"id_producto": id_producto})
            stock = mov_result.scalar() or 0

        await db.exec(
            text("UPDATE productos SET stock = :stock WHERE id_producto = :id_producto"),
            params={"id_producto": id_producto, "stock": stock}
        )
        await db.commit()

        return stock

    @staticmethod
    async def _producto_tiene_item_anexo(db: AsyncSession, id_producto: int) -> bool:
        from src.models.item_anexo import ItemAnexo
        from sqlmodel import select, func
        stmt = select(func.count(ItemAnexo.id_item_anexo)).where(ItemAnexo.id_producto == id_producto)
        result = await db.exec(stmt)
        return (result.first() or 0) > 0
    
    @staticmethod
    async def actualizar_stock_producto(
        db: AsyncSession,
        id_producto: int,
        cambio: int,
        commit: bool = True
    ) -> int:
        """Actualiza la existencia de un producto sumando el cambio.
        
        Args:
            db: Sesión de DB
            id_producto: ID del producto
            cambio: Cantidad a sumar (puede ser negativa para restar)
        
        Returns:
            Nueva existencia
        """
        from sqlalchemy import text
        
        result = await db.exec(
            text("SELECT stock FROM productos WHERE id_producto = :id_producto"),
            params={"id_producto": id_producto}
        )
        stock_actual = result.scalar() or 0
        
        nuevo_stock = stock_actual + cambio
        if nuevo_stock < 0:
            raise ValueError(f"Stock insuficiente: stock actual {stock_actual}, cambio {cambio}")
        
        await db.exec(
            text("UPDATE productos SET stock = :stock WHERE id_producto = :id_producto"),
            params={"id_producto": id_producto, "stock": nuevo_stock}
        )
        if commit:
            await db.commit()
        else:
            await db.flush()
        
        return nuevo_stock
    
    @staticmethod
    async def inicializar_existencias(db: AsyncSession) -> int:
        """Inicializa el campo existencia para todos los productos.
        
        Returns:
            Número de productos actualizados
        """
        from sqlalchemy import text
        
        query = text("""
            WITH konsignacion AS (
                SELECT 
                    ia.id_producto,
                    COALESCE(SUM(ia.cantidad), 0) - COALESCE((
                        SELECT SUM(pel.cantidad) 
                        FROM productos_en_liquidacion pel 
                        WHERE pel.id_producto = ia.id_producto 
                        AND pel.liquidada = true
                    ), 0) as stock_konsignacion
                FROM item_anexo ia
                GROUP BY ia.id_producto
            ),
            movimientos AS (
                SELECT 
                    id_producto,
                    COALESCE(SUM(cantidad), 0) as stock_mov
                FROM movimiento 
                WHERE estado = 'confirmado'
                GROUP BY id_producto
            )
            UPDATE productos p SET stock = COALESCE(k.stock_konsignacion, 0) + COALESCE(m.stock_mov, 0)
            FROM konsignacion k
            LEFT JOIN movimientos m ON k.id_producto = m.id_producto
            WHERE p.id_producto = k.id_producto
            RETURNING p.id_producto
        """)
        
        result = await db.exec(query)
        await db.commit()
        
        return len(result.fetchall())
    
    @staticmethod
    async def obtener_item_anexo_para_venta(
        db: AsyncSession,
        id_producto: int,
        cantidad: int
    ) -> Optional[Dict[str, Any]]:
        """Obtiene el item_anexo más antiguo con stock disponible para vender (FIFO).
        
        Returns:
            Dict con id_item_anexo, id_anexo, cantidad, cantidad_vendida, disponible
        """
        from src.models.item_anexo import ItemAnexo
        from sqlalchemy import select
        
        stmt = (
            select(ItemAnexo)
            .where(
                ItemAnexo.id_producto == id_producto,
                ItemAnexo.cantidad > ItemAnexo.cantidad_vendida
            )
            .order_by(ItemAnexo.id_anexo.asc(), ItemAnexo.id_item_anexo.asc())
            .limit(1)
        )
        result = await db.exec(stmt)
        item = result.first()
        
        if not item:
            return None
        
        return {
            "id_item_anexo": item.id_item_anexo,
            "id_anexo": item.id_anexo,
            "id_producto": item.id_producto,
            "cantidad": item.cantidad,
            "cantidad_vendida": item.cantidad_vendida,
            "disponible": item.cantidad - item.cantidad_vendida
        }
    
    @staticmethod
    async def registrar_venta_en_anexo(
        db: AsyncSession,
        id_producto: int,
        cantidad: int,
        commit: bool = True
    ) -> List[Dict[str, Any]]:
        """Registra una venta en el item_anexo usando FIFO.
        
        Distribuye la cantidad venta entre los item_anexo disponibles.
        
        Returns:
            Lista de items actualizados
        """
        from src.models.item_anexo import ItemAnexo
        from sqlalchemy import select, update
        
        actualizada = []
        cantidad_restante = cantidad
        
        while cantidad_restante > 0:
            stmt = (
                select(ItemAnexo)
                .where(
                    ItemAnexo.id_producto == id_producto,
                    ItemAnexo.cantidad > ItemAnexo.cantidad_vendida
                )
                .order_by(ItemAnexo.id_anexo.asc(), ItemAnexo.id_item_anexo.asc())
                .limit(1)
            )
            result = await db.exec(stmt)
            item = result.scalars().first()
            
            if not item:
                break
            
            disponible = item.cantidad - item.cantidad_vendida
            a_vender = min(cantidad_restante, disponible)
            
            item.cantidad_vendida += a_vender
            item.existencia -= a_vender
            cantidad_restante -= a_vender
            
            actualizada.append({
                "id_item_anexo": item.id_item_anexo,
                "id_anexo": item.id_anexo,
                "cantidad_vendida": item.cantidad_vendida,
                "vendido_en_esta": a_vender
            })
        
        if commit:
            await db.commit()
        else:
            await db.flush()
        
        if cantidad_restante > 0:
            raise ValueError(
                f"Stock insuficiente: quedan {cantidad_restante} uds sin asignar"
            )
        
        return actualizada
    
    @staticmethod
    async def ajustar_existencia_item_anexo(
        db: AsyncSession,
        id_anexo: int,
        id_producto: int,
        cantidad: int,
        signo: int,
        commit: bool = True
    ) -> Optional[Dict[str, Any]]:
        """Ajusta existencia en item_anexo para movimientos de ajuste (sin tocar cantidad_vendida).
        
        Args:
            db: Sesión de base de datos
            id_anexo: ID del anexo
            id_producto: ID del producto
            cantidad: Cantidad a ajustar
            signo: -1 para quitar, +1 para agregar
            commit: Si hacer commit o solo flush
        
        Returns:
            Dict con resultado
        """
        from src.models.item_anexo import ItemAnexo
        from sqlmodel import select

        if signo == -1:
            stmt = (
                select(ItemAnexo)
                .where(
                    ItemAnexo.id_anexo == id_anexo,
                    ItemAnexo.id_producto == id_producto
                )
                .order_by(ItemAnexo.id_item_anexo.asc())
                .limit(1)
            )
            result = await db.exec(stmt)
            item = result.scalars().first()

            if not item:
                raise ValueError(
                    f"No se encontró item_anexo para el producto {id_producto} en el anexo {id_anexo}"
                )

            if item.existencia < cantidad:
                raise ValueError(
                    f"Stock insuficiente en item_anexo: disponible {item.existencia}, solicitado {cantidad}"
                )

            item.existencia -= cantidad

            result_dict = {
                "id_item_anexo": item.id_item_anexo,
                "id_anexo": item.id_anexo,
                "id_producto": item.id_producto,
                "existencia_anterior": item.existencia + cantidad,
                "existencia_nueva": item.existencia,
                "ajuste": -cantidad,
            }

        elif signo == 1:
            stmt = (
                select(ItemAnexo)
                .where(
                    ItemAnexo.id_anexo == id_anexo,
                    ItemAnexo.id_producto == id_producto
                )
                .order_by(ItemAnexo.id_item_anexo.asc())
                .limit(1)
            )
            result = await db.exec(stmt)
            item = result.scalars().first()

            if item:
                item.existencia += cantidad
                result_dict = {
                    "id_item_anexo": item.id_item_anexo,
                    "id_anexo": item.id_anexo,
                    "id_producto": item.id_producto,
                    "existencia_anterior": item.existencia - cantidad,
                    "existencia_nueva": item.existencia,
                    "ajuste": +cantidad,
                }
            else:
                from src.models.productos import Productos

                prod_stmt = select(Productos).where(Productos.id_producto == id_producto)
                prod_result = await db.exec(prod_stmt)
                producto = prod_result.scalars().first()

                if not producto:
                    raise ValueError(f"Producto {id_producto} no encontrado")

                item = ItemAnexo(
                    id_anexo=id_anexo,
                    id_producto=id_producto,
                    cantidad=cantidad,
                    existencia=cantidad,
                    cantidad_vendida=0,
                    precio_compra=producto.precio_compra,
                    precio_venta=producto.precio_venta,
                    id_moneda=producto.moneda_venta,
                )
                db.add(item)

                result_dict = {
                    "id_item_anexo": item.id_item_anexo,
                    "id_anexo": item.id_anexo,
                    "id_producto": item.id_producto,
                    "existencia_anterior": 0,
                    "existencia_nueva": cantidad,
                    "ajuste": +cantidad,
                    "creado": True,
                }
        else:
            raise ValueError(f"Signo inválido: {signo}. Debe ser -1 o 1")

        if commit:
            await db.commit()
        else:
            await db.flush()

        return result_dict

    @staticmethod
    async def get_disponible_por_anexo(
        db: AsyncSession,
        id_producto: int,
        id_anexo: int
    ) -> int:
        """Obtiene la cantidad disponible para liquidar de un anexo específico.
        
        Returns:
            Cantidad liquidable (cantidad - cantidad_vendida)
        """
        from src.models.item_anexo import ItemAnexo
        from sqlalchemy import select, func
        
        stmt = (
            select(func.sum(
                ItemAnexo.cantidad - ItemAnexo.cantidad_vendida
            ).label("disponible"))
            .where(
                ItemAnexo.id_producto == id_producto,
                ItemAnexo.id_anexo == id_anexo
            )
        )
        result = await db.exec(stmt)
        return result.scalar() or 0


existencia_service = ExistenciaService()