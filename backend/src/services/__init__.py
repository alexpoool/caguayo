from .producto_service import ProductosService
from .categoria_service import categoria_service
from .movimiento_service import MovimientoService
from .dashboard_service import DashboardService
from .cliente_service import ClienteService
from .auth_service import auth_service

__all__ = [
    "ProductosService",
    "categoria_service",
    "ClienteService",
    "MovimientoService",
    "DashboardService",
    "auth_service",
]
