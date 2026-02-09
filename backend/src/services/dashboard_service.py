from datetime import datetime
from decimal import Decimal
from sqlmodel.ext.asyncio.session import AsyncSession
from src.repository import productos_repo, categorias_repo, movimiento_repo
from src.repository.ventas_clientes_repo import ventas_repo
from src.dto import (
    ProductosRead,
    DashboardStats,
)


class DashboardService:
    @staticmethod
    async def get_stats(db: AsyncSession) -> DashboardStats:
        # Obtener estadísticas básicas
        productos = await productos_repo.get_all(db)
        total_productos = len(productos)

        ventas = await ventas_repo.get_all(db)
        total_ventas = len(ventas)

        movimientos = await movimiento_repo.get_all(db)
        total_movimientos = len(movimientos)

        categorias = await categorias_repo.get_all(db)
        total_categorias = len(categorias)

        # Ventas del mes actual
        ventas_mes = await ventas_repo.get_by_mes(
            db, datetime.now().year, datetime.now().month
        )
        ventas_mes_actual = Decimal(str(sum(v.total for v in ventas_mes)))

        # Productos con stock bajo (simulado)
        productos_stock = await productos_repo.get_stock_bajo(db, limite=5)
        productos_stock_bajo = [ProductosRead.from_orm(p) for p in productos_stock]

        return DashboardStats(
            total_productos=total_productos,
            total_ventas=total_ventas,
            total_movimientos=total_movimientos,
            total_categorias=total_categorias,
            ventas_mes_actual=ventas_mes_actual,
            productos_stock_bajo=productos_stock_bajo,
        )
