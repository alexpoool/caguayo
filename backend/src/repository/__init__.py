from .productos_repo import ProductosRepository, productos_repo
from .categorias_repo import CategoriasRepository, categorias_repo
from .movimientos_repo import MovimientoRepository, movimiento_repo
from .ventas_clientes_repo import (
    ClienteRepository,
)  # Re-exporting existing repo class if needed

__all__ = [
    "ProductosRepository",
    "productos_repo",
    "CategoriasRepository",
    "categorias_repo",
    "MovimientoRepository",
    "movimiento_repo",
    "ClienteRepository",
]
