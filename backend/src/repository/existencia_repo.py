from sqlmodel import select, func, or_, and_
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional, Dict, Any
from sqlalchemy import text


class ExistenciaRepository:
    """Repository para calcular existencias de productos.

    Sistema híbrido que combina:
    - CONSIGNACION: desde ItemAnexo y ProductosEnLiquidacion
    - OTROS FLUJOS: desde Movimiento confirmado
    """

    async def get_existencias_consignacion(
        self, db: AsyncSession, id_anexo: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Obtiene existencias por konsignación (ItemAnexo -> ProductosEnLiquidacion)."""
        from src.models.item_anexo import ItemAnexo
        from src.models.productos_en_liquidacion import ProductosEnLiquidacion
        from src.models.anexo import Anexo

        query = text("""
            SELECT 
                ia.id_producto,
                ia.id_anexo,
                a.nombre_anexo,
                ia.cantidad as cantidad_entrada,
                COALESCE(ia.cantidad_vendida, 0) as cantidad_liquidada,
                ia.cantidad - COALESCE(ia.cantidad_vendida, 0) as stock
            FROM item_anexo ia
            JOIN anexo a ON ia.id_anexo = a.id_anexo
        """)

        params = {}
        if id_anexo:
            query = text(f"{query.text} AND ia.id_anexo = :id_anexo")
            params = {"id_anexo": id_anexo}

        query = text(f"{query.text} ORDER BY ia.id_producto")

        result = await db.exec(query, params=params)
        rows = result.all()

        existencias = []
        for row in rows:
            existencias.append(
                {
                    "id_producto": row[0],
                    "id_anexo": row[1],
                    "nombre_anexo": row[2],
                    "cantidad_entrada": row[3] or 0,
                    "cantidad_liquidada": row[4] or 0,
                    "stock": row[5] or 0,
                    "tipo": "CONSIGNACION",
                }
            )

        return existencias

    async def get_existencias_movimientos(
        self, db: AsyncSession, id_dependencia: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Obtiene existencias por movimientos (entradas - salidas confirmadas)."""
        from src.models.movimiento import Movimiento, TipoMovimiento

        base_query = """
            SELECT 
                m.id_producto,
                m.id_dependencia,
                SUM(CASE WHEN tm.factor > 0 THEN m.cantidad ELSE 0 END) as cantidad_entrada,
                SUM(CASE WHEN tm.factor < 0 THEN m.cantidad ELSE 0 END) as cantidad_salida,
                SUM(CASE WHEN tm.factor > 0 THEN m.cantidad ELSE -m.cantidad END) as stock
            FROM movimiento m
            JOIN tipo_movimiento tm ON m.id_tipo_movimiento = tm.id_tipo_movimiento
            WHERE m.estado = 'confirmado'
        """

        if id_dependencia:
            base_query += " AND m.id_dependencia = :id_dependencia"

        base_query += " GROUP BY m.id_producto, m.id_dependencia"

        params = {}
        if id_dependencia:
            params = {"id_dependencia": id_dependencia}

        result = await db.exec(text(base_query), params=params)
        rows = result.all()

        existencias = []
        for row in rows:
            existencias.append(
                {
                    "id_producto": row[0],
                    "id_dependencia": row[1],
                    "cantidad_entrada": row[2] or 0,
                    "cantidad_salida": row[3] or 0,
                    "stock": row[4] or 0,
                    "tipo": "MOVIMIENTO",
                }
            )

        return existencias

    async def get_existencia_hibrida(
        self,
        db: AsyncSession,
        id_dependencia: Optional[int] = None,
        id_anexo: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Obtiene existencias combinadas (consignación + movimientos)."""
        from src.models.producto import Productos

        # Obtener konsignación
        konsignacion = await self.get_existencias_consignacion(db, id_anexo)

        # Obtener movimientos
        movimientos = await self.get_existencias_movimientos(db, id_dependencia)

        # Combinar por producto
        productos_stmt = select(Productos)
        result = await db.exec(productos_stmt)
        productos = result.all()

        existencias_hibridas = []

        for prod in productos:
            prod_id = prod.id_producto

            kons_rows = [k for k in konsignacion if k["id_producto"] == prod_id]
            mov = next((m for m in movimientos if m["id_producto"] == prod_id), None)

            stock_kons = sum(k["stock"] for k in kons_rows) if kons_rows else 0

            stock_mov = (mov["cantidad_entrada"] if mov else 0) - (
                mov["cantidad_salida"] if mov else 0
            )

            tiene_konsignacion = len(kons_rows) > 0
            if tiene_konsignacion:
                stock_total = stock_kons
            else:
                stock_total = stock_mov

            if stock_total > 0:
                existencias_hibridas.append(
                    {
                        "id_producto": prod_id,
                        "nombre_producto": prod.nombre,
                        "codigo": prod.codigo,
                        "cantidad_entrada": stock_kons
                        + (mov["cantidad_entrada"] if mov else 0),
                        "cantidad_salida": (mov["cantidad_salida"] if mov else 0),
                        "stock": stock_total,
                        "tipo": "HIBRIDO",
                    }
                )

        return existencias_hibridas

    async def get_existencia_producto(
        self,
        db: AsyncSession,
        id_producto: int,
        id_dependencia: Optional[int] = None,
        id_anexo: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Obtiene existencia de un producto específico.

        Usa la misma lógica que get_existencia_hibrida para mantener consistencia:
        - Konsignación: cantidad - cantidad_vendida (directo de item_anexo)
        - Movimientos: entradas - salidas confirmadas
        """

        # Konsignación - misma lógica que get_existencia_hibrida
        # Usar cantidad_vendida directamente del item_anexo
        konsignacion_query = text("""
            SELECT 
                COALESCE(SUM(ia.cantidad), 0) - COALESCE(SUM(ia.cantidad_vendida), 0) as stock
            FROM item_anexo ia
            WHERE ia.id_producto = :id_producto
        """)

        params = {"id_producto": id_producto}
        if id_anexo:
            konsignacion_query = text(f"""
                {konsignacion_query.text} AND ia.id_anexo = :id_anexo
            """)
            params["id_anexo"] = id_anexo

        kons_result = await db.exec(konsignacion_query, params=params)
        stock_kons = kons_result.scalar() or 0

        # Movimientos - misma lógica que get_existencia_hibrida
        mov_params = {"id_producto": id_producto}
        mov_query = """
            SELECT COALESCE(SUM(
                CASE WHEN tm.factor > 0 THEN m.cantidad ELSE -m.cantidad END
            ), 0) as stock
            FROM movimiento m
            JOIN tipo_movimiento tm ON m.id_tipo_movimiento = tm.id_tipo_movimiento
            WHERE m.id_producto = :id_producto AND m.estado = 'confirmado'
        """

        if id_dependencia:
            mov_query += " AND m.id_dependencia = :id_dependencia"
            mov_params["id_dependencia"] = id_dependencia

        mov_result = await db.exec(text(mov_query), params=mov_params)
        stock_mov = mov_result.scalar() or 0

        tiene_konsignacion = await self._producto_tiene_item_anexo(db, id_producto)

        if tiene_konsignacion:
            stock_total = stock_kons
        else:
            stock_total = stock_mov

        return {
            "id_producto": id_producto,
            "stock_konsignacion": stock_kons,
            "stock_movimientos": stock_mov,
            "stock_total": stock_total,
            "usa_konsignacion": tiene_konsignacion,
        }

    async def _producto_tiene_item_anexo(
        self, db: AsyncSession, id_producto: int
    ) -> bool:
        from src.models.item_anexo import ItemAnexo

        stmt = select(func.count(ItemAnexo.id_item_anexo)).where(
            ItemAnexo.id_producto == id_producto
        )
        result = await db.exec(stmt)
        return (result.first() or 0) > 0

    async def validar_disponibilidad(
        self,
        db: AsyncSession,
        id_producto: int,
        cantidad: int,
        id_dependencia: Optional[int] = None,
        id_anexo: Optional[int] = None,
        movimiento_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Valida si hay suficiente existencia para una transacción.

        Considera:
        - Stock físico (consignación o movimientos confirmados)
        - Stock comprometido (movimientos pendientes de tipo salida excepto el propio)
        """

        data = await self.get_existencia_producto(
            db, id_producto, id_dependencia, id_anexo
        )

        stock_total = data["stock_total"]

        # Stock comprometido: movimientos pendientes con factor negativo (salidas)
        # Excluye el movimiento que se está confirmando (movimiento_id) para no auto-descontarse
        comprometido_query = text("""
            SELECT COALESCE(SUM(m.cantidad), 0)
            FROM movimiento m
            JOIN tipo_movimiento tm ON m.id_tipo_movimiento = tm.id_tipo_movimiento
            WHERE m.id_producto = :id_producto
              AND m.estado = 'pendiente'
              AND tm.factor < 0
        """)
        comprometido_params = {"id_producto": id_producto}
        if id_dependencia:
            comprometido_query = text(
                f"{comprometido_query.text} AND m.id_dependencia = :id_dependencia"
            )
            comprometido_params["id_dependencia"] = id_dependencia
        if movimiento_id is not None:
            comprometido_query = text(
                f"{comprometido_query.text} AND m.id_movimiento != :movimiento_id"
            )
            comprometido_params["movimiento_id"] = movimiento_id

        comp_result = await db.exec(comprometido_query, params=comprometido_params)
        stock_comprometido = comp_result.scalar() or 0

        disponible = stock_total - stock_comprometido

        return {
            "id_producto": id_producto,
            "cantidad_solicitada": cantidad,
            "stock": stock_total,
            "stock_comprometido": stock_comprometido,
            "disponible": disponible >= cantidad,
            "mensaje": "Disponibilidad OK"
            if disponible >= cantidad
            else f"Insuficiente. Disponible: {disponible} (físico: {stock_total}, comprometido: {stock_comprometido})",
        }


existencia_repo = ExistenciaRepository()
