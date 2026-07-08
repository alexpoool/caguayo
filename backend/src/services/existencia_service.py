from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional, Dict, Any
from src.repository.existencia_repo import existencia_repo


class ExistenciaService:
    """Servicio para gestionar existencias de productos.

    Sistema híbrido:
    - CONSIGNACION: desde ItemAnexo y ProductosEnLiquidacion
    - OTROS FLUJOS: desde Movimiento confirmado
    """

    @staticmethod
    async def get_existencias_por_anexo(
        db: AsyncSession, id_anexo: int
    ) -> List[Dict[str, Any]]:
        """Obtiene todas las existencias de un anexo específico."""
        return await existencia_repo.get_existencias_consignacion(db, id_anexo)

    @staticmethod
    async def get_existencias_por_dependencia(
        db: AsyncSession, id_dependencia: int
    ) -> List[Dict[str, Any]]:
        """Obtiene existencias por dependencia."""
        return await existencia_repo.get_existencias_movimientos(db, id_dependencia)

    @staticmethod
    async def get_existencias_hibridas(
        db: AsyncSession,
        id_dependencia: Optional[int] = None,
        id_anexo: Optional[int] = None,
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
        id_anexo: Optional[int] = None,
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
        id_anexo: Optional[int] = None,
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
        id_anexo: Optional[int] = None,
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
                db, prod["id_producto"], prod["cantidad"], id_dependencia, id_anexo
            )

            if not resultado["disponible"]:
                errores.append(
                    {
                        "id_producto": prod["id_producto"],
                        "cantidad_solicitada": prod["cantidad"],
                        "stock": resultado["stock"],
                        "mensaje": resultado["mensaje"],
                    }
                )

        return {
            "valido": len(errores) == 0,
            "errores": errores,
            "mensaje": "Todos los productos disponibles"
            if len(errores) == 0
            else f"{len(errores)} producto(s) sin stock suficiente",
        }

    @staticmethod
    async def get_resumen_existencias(
        db: AsyncSession, id_dependencia: Optional[int] = None
    ) -> Dict[str, Any]:
        """Obtiene resumen de existencias por tipo."""

        konsignacion = await existencia_repo.get_existencias_consignacion(db)
        total_kons = sum(e["stock"] for e in konsignacion)

        movimientos = await existencia_repo.get_existencias_movimientos(
            db, id_dependencia
        )
        total_mov = sum(e["stock"] for e in movimientos)

        hibrido = await existencia_repo.get_existencia_hibrida(db, id_dependencia)
        total_hibrido = sum(e["stock"] for e in hibrido)

        return {
            "total_konsignacion": total_kons,
            "total_movimientos": total_mov,
            "total_hibrido": total_hibrido,
            "productos_konsignacion": len(konsignacion),
            "productos_movimientos": len(movimientos),
            "productos_hibridos": len(hibrido),
        }

    @staticmethod
    async def calcular_stock_producto(db: AsyncSession, id_producto: int) -> int:
        """Calcula el stock actual de un producto desde tablas fuente.

        Solo lectura, no escribe en productos.
        Usa la misma lógica de exclusión que get_existencia_producto:
        - Si tiene ItemAnexo: stock = SUM(entrada - vendido) de item_anexo
        - Si no: stock = SUM(cantidad * factor) de movimientos confirmados

        Returns:
            Stock calculado
        """
        from sqlalchemy import text

        tiene_konsignacion = await existencia_repo._producto_tiene_item_anexo(
            db, id_producto
        )

        if tiene_konsignacion:
            r = await db.exec(
                text("""
                SELECT COALESCE(SUM(ia.entrada - ia.vendido), 0)
                FROM item_anexo ia
                WHERE ia.id_producto = :id_producto
            """),
                params={"id_producto": id_producto},
            )
        else:
            r = await db.exec(
                text("""
                SELECT COALESCE(SUM(m.cantidad * tm.factor), 0)
                FROM movimiento m
                JOIN tipo_movimiento tm ON m.id_tipo_movimiento = tm.id_tipo_movimiento
                WHERE m.id_producto = :id_producto AND m.estado = 'confirmado'
            """),
                params={"id_producto": id_producto},
            )

        return r.scalar() or 0

    @staticmethod
    async def recalcular_existencia(db: AsyncSession, id_producto: int) -> int:
        """Recalcula la existencia de un producto (solo lectura, ya no persiste).

        Returns:
            Stock calculado
        """
        return await ExistenciaService.calcular_stock_producto(db, id_producto)

    @staticmethod
    async def obtener_item_anexo_para_venta(
        db: AsyncSession, id_producto: int, cantidad: int
    ) -> Optional[Dict[str, Any]]:
        from src.models.item_anexo import ItemAnexo
        from sqlalchemy import select

        stmt = (
            select(ItemAnexo)
            .where(
                ItemAnexo.id_producto == id_producto,
                ItemAnexo.entrada > ItemAnexo.vendido,
            )
            .order_by(ItemAnexo.id_anexo.asc(), ItemAnexo.id_item_anexo.asc())
            .limit(1)
        )
        result = await db.exec(stmt)
        item = result.first()

        if not item:
            return None

        disponible = item.entrada - item.vendido
        return {
            "id_item_anexo": item.id_item_anexo,
            "id_anexo": item.id_anexo,
            "id_producto": item.id_producto,
            "entrada": item.entrada,
            "vendido": item.vendido,
            "disponible": disponible,
        }

    @staticmethod
    async def registrar_venta_en_anexo(
        db: AsyncSession, id_producto: int, cantidad: int, commit: bool = True
    ) -> List[Dict[str, Any]]:
        """Registra una venta en el item_anexo usando FIFO.

        Distribuye la cantidad venta entre los item_anexo disponibles.

        Returns:
            Lista de items actualizados
        """
        from src.models.item_anexo import ItemAnexo
        from sqlalchemy import select

        actualizada = []
        cantidad_restante = cantidad

        while cantidad_restante > 0:
            stmt = (
                select(ItemAnexo)
                .where(
                    ItemAnexo.id_producto == id_producto,
                    ItemAnexo.entrada > ItemAnexo.vendido,
                )
                .order_by(ItemAnexo.id_anexo.asc(), ItemAnexo.id_item_anexo.asc())
                .limit(1)
            )
            result = await db.exec(stmt)
            item = result.scalars().first()

            if not item:
                break

            disponible = item.entrada - item.vendido
            a_vender = min(cantidad_restante, disponible)

            item.vendido += a_vender
            cantidad_restante -= a_vender

            actualizada.append(
                {
                    "id_item_anexo": item.id_item_anexo,
                    "id_anexo": item.id_anexo,
                    "vendido": item.vendido,
                    "vendido_en_esta": a_vender,
                }
            )

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
        commit: bool = True,
    ) -> Optional[Dict[str, Any]]:
        """Ajusta stock en item_anexo para movimientos de ajuste.

        - signo=-1 (quitar): incrementa vendido (reduce stock disponible)
        - signo=+1 (agregar): incrementa entrada (aumenta stock disponible)

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

        stmt = (
            select(ItemAnexo)
            .where(ItemAnexo.id_anexo == id_anexo, ItemAnexo.id_producto == id_producto)
            .order_by(ItemAnexo.id_item_anexo.asc())
            .limit(1)
        )
        result = await db.exec(stmt)
        item = result.scalars().first()

        if not item:
            raise ValueError(
                f"No se encontró item_anexo para el producto {id_producto} en el anexo {id_anexo}"
            )

        if signo == -1:
            disponible = item.entrada - item.vendido
            if disponible < cantidad:
                raise ValueError(
                    f"Stock insuficiente en item_anexo: disponible {disponible}, solicitado {cantidad}"
                )
            item.vendido += cantidad
            result_dict = {
                "id_item_anexo": item.id_item_anexo,
                "id_anexo": item.id_anexo,
                "id_producto": item.id_producto,
                "entrada_anterior": item.entrada,
                "vendido_anterior": item.vendido - cantidad,
                "vendido_nuevo": item.vendido,
                "ajuste": -cantidad,
            }
        elif signo == 1:
            item.entrada += cantidad
            result_dict = {
                "id_item_anexo": item.id_item_anexo,
                "id_anexo": item.id_anexo,
                "id_producto": item.id_producto,
                "entrada_anterior": item.entrada - cantidad,
                "entrada_nueva": item.entrada,
                "ajuste": +cantidad,
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
        db: AsyncSession, id_producto: int, id_anexo: int
    ) -> int:
        """Obtiene la cantidad disponible de un anexo específico.

        Returns:
            Cantidad disponible (entrada - vendido)
        """
        from src.models.item_anexo import ItemAnexo
        from sqlalchemy import select, func

        stmt = select(
            func.sum(ItemAnexo.entrada - ItemAnexo.vendido).label("disponible")
        ).where(ItemAnexo.id_producto == id_producto, ItemAnexo.id_anexo == id_anexo)
        result = await db.exec(stmt)
        return result.scalar() or 0


existencia_service = ExistenciaService()
