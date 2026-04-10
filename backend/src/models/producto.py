from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from decimal import Decimal

if TYPE_CHECKING:
    from .categoria import Subcategorias
    from .moneda import Moneda
    from .venta import Ventas
    from .movimiento import Movimiento
    from .detalle_venta import DetalleVenta
    from .anexo import Anexo
    from .item_anexo import ItemAnexo
    from .item_factura import ItemFactura
    from .item_venta_efectivo import ItemVentaEfectivo


class Productos(SQLModel, table=True):
    __tablename__ = "productos"

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

    # Reposición de Stock
    stock_minimo: Optional[int] = Field(
        default=0, description="Stock de seguridad mínimo permitido"
    )
    punto_pedido: Optional[int] = Field(
        default=0,
        description="Nivel de stock en el que se debe realizar un nuevo pedido (ROP)",
    )
    lead_time_dias: Optional[int] = Field(
        default=0, description="Tiempo de entrega del proveedor en días"
    )
    clasificacion_abc: Optional[str] = Field(
        default=None,
        max_length=1,
        description="Clasificación ABC del producto (A, B o C)",
    )

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
    items_anexo: List["ItemAnexo"] = Relationship(back_populates="producto")
    items_factura: List["ItemFactura"] = Relationship(back_populates="producto")
    items_venta_efectivo: List["ItemVentaEfectivo"] = Relationship(
        back_populates="producto"
    )
