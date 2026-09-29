from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import date
from decimal import Decimal
from sqlalchemy import Index

if TYPE_CHECKING:
    from .producto import Productos

# Precisión de coeficientes (el Excel usa hasta 16 decimales)
_COEF = dict(max_digits=22, decimal_places=16)
# Importes monetarios y cantidades
_AMT = dict(max_digits=20, decimal_places=6)


class FichaCosto(SQLModel, table=True):
    __tablename__ = "ficha_costo"
    __table_args__ = (Index("idx_ficha_costo_producto", "id_producto"),)

    id_ficha: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    id_producto: int = Field(foreign_key="productos.id_producto")
    # El No. de ficha se asigna tras el flush (= str(id_ficha))
    numero_ficha: str = Field(default="", max_length=50)
    nivel_produccion: Decimal = Field(default=Decimal("1"), **_AMT)

    # ── Coeficientes (editables, precargados con valores de la entidad) ──
    pct_energia: Decimal = Field(default=Decimal("3"), **_COEF)
    pct_agua: Decimal = Field(default=Decimal("0.5"), **_COEF)
    pct_otros_gastos_directos: Decimal = Field(default=Decimal("17"), **_COEF)
    pct_vacaciones: Decimal = Field(default=Decimal("9.09"), **_COEF)
    coef_gastos_asociados: Decimal = Field(
        default=Decimal("0.2587298394047821"), **_COEF
    )
    coef_gastos_generales: Decimal = Field(
        default=Decimal("0.4195769613893774"), **_COEF
    )
    coef_gastos_distribucion: Decimal = Field(
        default=Decimal("0.3216931992058406"), **_COEF
    )
    coef_gastos_financieros: Decimal = Field(
        default=Decimal("1.4939751466265447"), **_COEF
    )
    pct_seguridad_social: Decimal = Field(default=Decimal("12.5"), **_COEF)
    pct_fuerza_trabajo: Decimal = Field(default=Decimal("5"), **_COEF)
    pct_utilidad: Decimal = Field(default=Decimal("25"), **_COEF)
    pct_impuesto_ventas: Decimal = Field(default=Decimal("18"), **_COEF)

    # ── Entradas manuales ──
    gasto_combustible: Decimal = Field(default=Decimal("0"), **_AMT)
    gasto_osde: Decimal = Field(default=Decimal("0"), **_AMT)

    # ── Importes calculados (snapshot al guardar) ──
    total_insumos: Decimal = Field(default=Decimal("0"), **_AMT)
    gasto_energia: Decimal = Field(default=Decimal("0"), **_AMT)
    gasto_agua: Decimal = Field(default=Decimal("0"), **_AMT)
    gasto_material: Decimal = Field(default=Decimal("0"), **_AMT)
    salario_directo: Decimal = Field(default=Decimal("0"), **_AMT)
    vacaciones: Decimal = Field(default=Decimal("0"), **_AMT)
    salario_total: Decimal = Field(default=Decimal("0"), **_AMT)
    otros_gastos_directos: Decimal = Field(default=Decimal("0"), **_AMT)
    gastos_asociados: Decimal = Field(default=Decimal("0"), **_AMT)
    costo_total: Decimal = Field(default=Decimal("0"), **_AMT)
    gastos_generales: Decimal = Field(default=Decimal("0"), **_AMT)
    gastos_distribucion: Decimal = Field(default=Decimal("0"), **_AMT)
    gastos_financieros: Decimal = Field(default=Decimal("0"), **_AMT)
    gastos_tributarios: Decimal = Field(default=Decimal("0"), **_AMT)
    impuesto_ventas: Decimal = Field(default=Decimal("0"), **_AMT)
    total_gastos: Decimal = Field(default=Decimal("0"), **_AMT)
    total_costos_gastos: Decimal = Field(default=Decimal("0"), **_AMT)
    utilidad: Decimal = Field(default=Decimal("0"), **_AMT)
    precio_tarifa: Decimal = Field(default=Decimal("0"), **_AMT)
    precio_unitario_ajustado: Decimal = Field(default=Decimal("0"), **_AMT)

    # ── Metadatos del documento ──
    elaborado_por: Optional[str] = Field(default=None, max_length=200)
    aprobado_por: Optional[str] = Field(default=None, max_length=200)
    fecha_elaboracion: date
    fecha_aprobacion: Optional[date] = None

    producto: Optional["Productos"] = Relationship()
    insumos: List["FichaInsumo"] = Relationship(
        back_populates="ficha",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    mano_obra: List["FichaManoObra"] = Relationship(
        back_populates="ficha",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class FichaInsumo(SQLModel, table=True):
    __tablename__ = "ficha_insumo"
    __table_args__ = (Index("idx_ficha_insumo_ficha", "id_ficha"),)

    id_ficha_insumo: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    id_ficha: int = Field(foreign_key="ficha_costo.id_ficha")
    id_producto: Optional[int] = Field(default=None, foreign_key="productos.id_producto")
    codigo: str = Field(default="", max_length=50)
    nombre: str = Field(max_length=150)
    um: Optional[str] = Field(default=None, max_length=20)
    norma_consumo: Decimal = Field(default=Decimal("0"), **_AMT)
    precio_unitario: Decimal = Field(default=Decimal("0"), **_AMT)
    costo: Decimal = Field(default=Decimal("0"), **_AMT)

    ficha: FichaCosto = Relationship(back_populates="insumos")


class FichaManoObra(SQLModel, table=True):
    __tablename__ = "ficha_mano_obra"
    __table_args__ = (Index("idx_ficha_mano_obra_ficha", "id_ficha"),)

    id_ficha_mano_obra: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    id_ficha: int = Field(foreign_key="ficha_costo.id_ficha")
    # Referencia al catálogo de tarifas (ficha_tarifa); snapshot de la tarifa aplicada
    id_tarifa: Optional[int] = Field(default=None, foreign_key="ficha_tarifa.id_tarifa")
    categoria: str = Field(max_length=150)
    tarifa_horaria: Decimal = Field(default=Decimal("0"), **_AMT)
    norma_tiempo: Decimal = Field(default=Decimal("0"), **_AMT)
    gasto_salario: Decimal = Field(default=Decimal("0"), **_AMT)

    ficha: FichaCosto = Relationship(back_populates="mano_obra")
