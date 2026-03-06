from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from decimal import Decimal

if TYPE_CHECKING:
    from .categoria import Subcategorias
    from .moneda import Moneda
    from .movimiento import Movimiento
    from .detalle_venta import DetalleVenta
    from .anexo_producto import AnexoProducto
    from .nuevas_tablas import ContratoProducto, SuplementoProducto, FacturaProducto, VentaEfectivo, VentaEfectivoProducto


class Productos(SQLModel, table=True):

    id_producto: Optional[int] = Field(default=None, primary_key=True)
    codigo: Optional[str] = Field(default=None, max_length=50, unique=True)
    id_subcategoria: int = Field(foreign_key="subcategorias.id_subcategoria")
    nombre: str = Field(max_length=150)
    descripcion: Optional[str] = None
    moneda_compra: int = Field(foreign_key="moneda.id_moneda")
    precio_compra: Decimal
    moneda_venta: int = Field(foreign_key="moneda.id_moneda")
    precio_venta: Decimal
    precio_minimo: Decimal

    # Relaciones
    subcategoria: "Subcategorias" = Relationship(back_populates="productos")
    moneda_compra_rel: "Moneda" = Relationship(
        back_populates="productos_compra",
        sa_relationship_kwargs={"foreign_keys": "Productos.moneda_compra"},
    )
    moneda_venta_rel: "Moneda" = Relationship(
        back_populates="productos_venta",
        sa_relationship_kwargs={"foreign_keys": "Productos.moneda_venta"},
    )
    movimientos: List["Movimiento"] = Relationship(back_populates="producto")
    detalles_venta: List["DetalleVenta"] = Relationship(back_populates="producto")
    anexos_productos: List["AnexoProducto"] = Relationship(back_populates="producto")
    contrato_productos: List["ContratoProducto"] = Relationship(back_populates="producto")
    suplemento_productos: List["SuplementoProducto"] = Relationship(back_populates="producto")
    factura_productos: List["FacturaProducto"] = Relationship(back_populates="producto")
    ventas_efectivo: List["VentaEfectivo"] = Relationship(back_populates="producto")
    venta_efectivo_productos: List["VentaEfectivoProducto"] = Relationship(back_populates="producto")
