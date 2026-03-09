from sqlmodel import SQLModel
from typing import List, Optional
from decimal import Decimal
from datetime import date
from .productos_dto import ProductoSimpleRead
from .ventas_dto import VentaRead
from .clientes_dto import ClienteRead


class ProductoStats(SQLModel):
    """Estadísticas de productos más vendidos"""

    id_producto: int
    nombre: str
    cantidad_vendida: int
    monto_total: Decimal
    porcentaje: float


class DashboardStats(SQLModel):
    # Conteos principales
    total_productos: int
    total_ventas: int
    total_clientes: int
    total_categorias: int
    total_monedas: int

    # Ventas de hoy (prioridad según usuario)
    ventas_hoy: Decimal
    ventas_hoy_cantidad: int

    # Comparativas
    ventas_ayer: Decimal
    ventas_crecimiento_porcentaje: float

    # Estados de ventas
    ventas_pendientes: int
    ventas_completadas: int
    ventas_anuladas: int

    # Métricas
    ticket_promedio: Decimal

    # Inventario
    productos_stock_bajo: List[ProductoSimpleRead]
    productos_agotados: int
    valor_inventario_compra: Decimal
    valor_inventario_venta: Decimal

    # Listas para tablas
    ultimas_ventas: List[VentaRead]
    clientes_recientes: List[ClienteRead]
    top_productos: List[ProductoStats]


class VentasTrends(SQLModel):
    """Tendencia de ventas para gráficos"""

    fechas: List[str]  # Formato ISO: "2024-01-15"
    montos: List[Decimal]
    cantidades: List[int]
    periodo: str  # "hoy", "semana", "mes", "año"


class MovimientosTrends(SQLModel):
    """Tendencia de movimientos para gráficos"""

    fechas: List[str]  # Formato ISO: "2024-01-15"
    recepciones: List[int]
    mermas: List[int]
    donaciones: List[int]
    devoluciones: List[int]
    periodo: str  # "hoy", "semana", "mes", "año"
