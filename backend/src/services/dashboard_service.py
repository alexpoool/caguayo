from datetime import datetime
from sqlmodel import Session
from src.repository import productos_repo, categorias_repo, ventas_repo, movimiento_repo
from src.dto import (
    ProductosRead,
    DashboardStats,
)

class DashboardService:
    @staticmethod
    def get_stats(db: Session) -> DashboardStats:
        # Obtener estadísticas básicas
        total_productos = len(productos_repo.get_all(db))
        total_ventas = len(ventas_repo.get_all(db))
        total_movimientos = len(movimiento_repo.get_all(db))
        total_categorias = len(categorias_repo.get_all(db))

        # Ventas del mes actual
        ventas_mes = ventas_repo.get_by_mes(
            db, datetime.now().year, datetime.now().month
        )
        ventas_mes_actual = sum(v.monto for v in ventas_mes)

        # Productos con stock bajo (simulado)
        productos_stock = productos_repo.get_stock_bajo(db, limite=5)
        productos_stock_bajo = [ProductosRead.from_orm(p) for p in productos_stock]

        return DashboardStats(
            total_productos=total_productos,
            total_ventas=total_ventas,
            total_movimientos=total_movimientos,
            total_categorias=total_categorias,
            ventas_mes_actual=ventas_mes_actual,
            productos_stock_bajo=productos_stock_bajo,
        )
