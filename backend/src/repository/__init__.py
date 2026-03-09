from .productos_repo import ProductosRepository, productos_repo
from .categorias_repo import CategoriasRepository, categorias_repo
from .movimientos_repo import MovimientoRepository, movimiento_repo
from .moneda_repo import MonedaRepository, moneda_repo
from .ventas_clientes_repo import ClienteRepository, cliente_repo, ventas_repo
from .contratos_repo import (
    ContratoRepository,
    contrato_repo,
    ContratoProductoRepository,
    SuplementoRepository,
    suplemento_repo,
    SuplementoProductoRepository,
    FacturaRepository,
    factura_repo,
    FacturaProductoRepository,
    VentaEfectivoRepository,
    venta_efectivo_repo,
    VentaEfectivoProductoRepository,
)

__all__ = [
    "ProductosRepository",
    "productos_repo",
    "CategoriasRepository",
    "categorias_repo",
    "MovimientoRepository",
    "movimiento_repo",
    "MonedaRepository",
    "moneda_repo",
    "ClienteRepository",
    "cliente_repo",
    "ventas_repo",
    "ContratoRepository",
    "contrato_repo",
    "ContratoProductoRepository",
    "SuplementoRepository",
    "suplemento_repo",
    "SuplementoProductoRepository",
    "FacturaRepository",
    "factura_repo",
    "FacturaProductoRepository",
    "VentaEfectivoRepository",
    "venta_efectivo_repo",
    "VentaEfectivoProductoRepository",
]
