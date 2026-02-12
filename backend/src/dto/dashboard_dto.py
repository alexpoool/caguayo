from sqlmodel import SQLModel
from typing import List
from decimal import Decimal
from .productos_dto import ProductosRead


class DashboardStats(SQLModel):
    total_productos: int
    total_ventas: int
    total_movimientos: int
    total_categorias: int
    ventas_mes_actual: Decimal
    productos_stock_bajo: List[ProductosRead]
