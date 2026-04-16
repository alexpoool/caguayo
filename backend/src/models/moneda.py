from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .producto import Productos
    from .venta import Ventas
    from .movimiento import Movimiento
    from .cuenta import Cuenta
    from .item_anexo import ItemAnexo
    from .item_factura import ItemFactura
    from .item_venta_efectivo import ItemVentaEfectivo


class Moneda(SQLModel, table=True):
    __tablename__ = "moneda"

    id_moneda: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=50, unique=True)
    denominacion: str = Field(max_length=100)
    simbolo: str = Field(max_length=5, unique=True)

    # Relaciones
    productos_compra: List["Productos"] = Relationship(
        back_populates="moneda_compra_rel",
        sa_relationship_kwargs={"foreign_keys": "Productos.moneda_compra"},
    )
    productos_venta: List["Productos"] = Relationship(
        back_populates="moneda_venta_rel",
        sa_relationship_kwargs={"foreign_keys": "Productos.moneda_venta"},
    )
    # Nuevas relaciones con movimientos
    movimientos_compra: List["Movimiento"] = Relationship(
        back_populates="moneda_compra_rel",
        sa_relationship_kwargs={"foreign_keys": "Movimiento.moneda_compra"},
    )
    movimientos_venta: List["Movimiento"] = Relationship(
        back_populates="moneda_venta_rel",
        sa_relationship_kwargs={"foreign_keys": "Movimiento.moneda_venta"},
    )
    cuentas: List["Cuenta"] = Relationship(back_populates="moneda")
    items_anexo: List["ItemAnexo"] = Relationship(back_populates="moneda")
    items_factura: List["ItemFactura"] = Relationship(back_populates="moneda")
    items_venta_efectivo: List["ItemVentaEfectivo"] = Relationship(
        back_populates="moneda"
    )
