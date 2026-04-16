from sqlmodel import SQLModel
from typing import List, Any
from decimal import Decimal


class ProductoStats(SQLModel):
    """Estadísticas de productos más vendidos"""

    id_producto: int
    nombre: str
    cantidad_vendida: int
    monto_total: Decimal
    porcentaje: float


class DashboardStats(SQLModel):
    total_productos: int = 0
    total_ventas: int = 0
    total_clientes: int = 0
    total_categorias: int = 0
    total_monedas: int = 0
    ventas_hoy: Decimal = Decimal("0")
    ventas_hoy_cantidad: int = 0
    ventas_ayer: Decimal = Decimal("0")
    ventas_crecimiento_porcentaje: float = 0.0
    ventas_pendientes: int = 0
    ventas_completadas: int = 0
    ventas_anuladas: int = 0
    ticket_promedio: Decimal = Decimal("0")
    productos_stock_bajo: List[Any] = []
    productos_agotados: int = 0
    valor_inventario_compra: Decimal = Decimal("0")
    valor_inventario_venta: Decimal = Decimal("0")
    ultimas_ventas: List[Any] = []
    clientes_recientes: List[Any] = []
    top_productos: List[Any] = []


class VentasTrends(SQLModel):
    fechas: List[str] = []
    montos: List[Decimal] = []
    cantidades: List[int] = []
    periodo: str = ""


class MovimientosTrends(SQLModel):
    fechas: List[str] = []
    recepciones: List[int] = []
    mermas: List[int] = []
    donaciones: List[int] = []
    devoluciones: List[int] = []
    periodo: str = ""
