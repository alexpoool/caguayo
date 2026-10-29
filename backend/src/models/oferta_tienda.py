from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from decimal import Decimal
from datetime import date
from sqlalchemy import Index

if TYPE_CHECKING:
    from .contrato import Contrato
    from .producto import Productos
    from .moneda import Moneda
    from .anexo import Anexo


class OfertaTienda(SQLModel, table=True):
    """Oferta previa a la factura en el módulo Tienda.

    Espejo de Factura (mismos datos de venta) con dos diferencias:
    - No toca stock ni genera movimientos: solo al convertir a factura.
    - Al convertirse queda en estado CONVERTIDA con id_factura como rastro.

    Estados: ACTIVA / CONVERTIDA / ANULADA (borrado lógico).
    """

    __tablename__ = "oferta_tienda"
    __table_args__ = (
        Index("idx_oferta_tienda_codigo", "codigo_oferta"),
        Index("idx_oferta_tienda_contrato", "id_contrato"),
        Index("idx_oferta_tienda_estado", "estado"),
    )

    id_oferta_tienda: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    id_contrato: int = Field(foreign_key="contrato.id_contrato")
    codigo_oferta: str = Field(max_length=50, unique=True)
    descripcion: Optional[str] = None
    observaciones: Optional[str] = None
    fecha: date = Field(default=date.today())
    monto: Decimal = Field(default=Decimal("0.00"))
    estado: str = Field(default="ACTIVA", max_length=20)
    # Rastro del resultado de la conversión (solo cuando estado = CONVERTIDA)
    id_factura: Optional[int] = Field(
        default=None, foreign_key="factura.id_factura", nullable=True
    )

    contrato: Optional["Contrato"] = Relationship(back_populates="ofertas_tienda")
    items_oferta_tienda: List["ItemOfertaTienda"] = Relationship(
        back_populates="oferta"
    )


class ItemOfertaTienda(SQLModel, table=True):
    """Ítem de una oferta de tienda. Espejo de ItemFactura."""

    __tablename__ = "item_oferta_tienda"
    __table_args__ = (
        Index("idx_item_oferta_tienda_oferta", "id_oferta_tienda"),
        Index("idx_item_oferta_tienda_producto", "id_producto"),
    )

    id_item_oferta_tienda: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    id_oferta_tienda: int = Field(foreign_key="oferta_tienda.id_oferta_tienda")
    id_producto: int = Field(foreign_key="productos.id_producto")
    cantidad: int = Field(default=1)
    precio_compra: Decimal = Field(decimal_places=4, max_digits=15)
    precio_venta: Decimal = Field(decimal_places=4, max_digits=15)
    id_moneda: int = Field(foreign_key="moneda.id_moneda")
    codigo: Optional[str] = Field(default=None, max_length=100)
    id_anexo: Optional[int] = Field(
        default=None, foreign_key="anexo.id_anexo", nullable=True
    )

    oferta: "OfertaTienda" = Relationship(back_populates="items_oferta_tienda")
    producto: Optional["Productos"] = Relationship()
    moneda: Optional["Moneda"] = Relationship()
