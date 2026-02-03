from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional, List
from decimal import Decimal


# 1. Modelo: moneda
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
    ventas: List["Ventas"] = Relationship(back_populates="moneda_venta_rel")


# 2. Modelo: categorias
class Categorias(SQLModel, table=True):
    __tablename__ = "categorias"

    id_categoria: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=100, unique=True)
    descripcion: Optional[str] = None

    # Relaciones
    subcategorias: List["Subcategorias"] = Relationship(back_populates="categoria")


# 3. Modelo: subcategorias
class Subcategorias(SQLModel, table=True):
    __tablename__ = "subcategorias"

    id_subcategoria: Optional[int] = Field(default=None, primary_key=True)
    id_categoria: int = Field(foreign_key="categorias.id_categoria")
    nombre: str = Field(max_length=100)
    descripcion: Optional[str] = None

    # Relaciones
    categoria: Categorias = Relationship(back_populates="subcategorias")
    productos: List["Productos"] = Relationship(back_populates="subcategoria")


# 4. Modelo: tipo_movimiento
class TipoMovimiento(SQLModel, table=True):
    __tablename__ = "tipo_movimiento"

    id_tipo_movimiento: Optional[int] = Field(default=None, primary_key=True)
    tipo: str = Field(
        max_length=20, unique=True
    )  # 'AJUSTE', 'MERMA', 'DONACION', 'RECEPCION', 'DEVOLUCION'
    factor: int  # 1 o -1

    # Relaciones
    movimientos: List["Movimiento"] = Relationship(back_populates="tipo_movimiento")


# 5. Modelo: tipo_dependencia
class TipoDependencia(SQLModel, table=True):
    __tablename__ = "tipo_dependencia"

    id_tipo_dependencia: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=20, unique=True)
    descripcion: Optional[str] = None

    # Relaciones
    dependencias: List["Dependencia"] = Relationship(back_populates="tipo_dependencia")


# 6. Modelo: datos_generales_dependencia
class DatosGeneralesDependencia(SQLModel, table=True):
    __tablename__ = "datos_generales_dependencia"

    id_datos_generales: Optional[int] = Field(default=None, primary_key=True)
    direccion: str = Field(max_length=255)
    telefono: str = Field(max_length=20)
    email: str = Field(max_length=100)

    # Relaciones
    dependencias: List["Dependencia"] = Relationship(back_populates="datos_generales")


# 7. Modelo: dependencia
class Dependencia(SQLModel, table=True):
    __tablename__ = "dependencia"

    id_dependencia: Optional[int] = Field(default=None, primary_key=True)
    id_tipo_dependencia: int = Field(foreign_key="tipo_dependencia.id_tipo_dependencia")
    id_datos_generales: int = Field(
        foreign_key="datos_generales_dependencia.id_datos_generales"
    )
    nombre: str = Field(max_length=100)

    # Relaciones
    tipo_dependencia: TipoDependencia = Relationship(back_populates="dependencias")
    datos_generales: DatosGeneralesDependencia = Relationship(
        back_populates="dependencias"
    )
    movimientos: List["Movimiento"] = Relationship(back_populates="dependencia")


# 8. Modelo: anexo
class Anexo(SQLModel, table=True):
    __tablename__ = "anexo"

    id_anexo: Optional[int] = Field(default=None, primary_key=True)

    # Relaciones
    ventas: List["Ventas"] = Relationship(back_populates="anexo")
    movimientos: List["Movimiento"] = Relationship(back_populates="anexo")


# 9. Modelo: liquidacion
class Liquidacion(SQLModel, table=True):
    __tablename__ = "liquidacion"

    id_liquidacion: Optional[int] = Field(default=None, primary_key=True)

    # Relaciones
    ventas: List["Ventas"] = Relationship(back_populates="liquidacion")
    movimientos: List["Movimiento"] = Relationship(back_populates="liquidacion")


# 10. Modelo: transaccion
class Transaccion(SQLModel, table=True):
    __tablename__ = "transaccion"

    id_transaccion: Optional[int] = Field(default=None, primary_key=True)

    # Relaciones
    ventas: List["Ventas"] = Relationship(back_populates="transaccion")


# 11. Modelo: productos
class Productos(SQLModel, table=True):
    __tablename__ = "productos"

    id_producto: Optional[int] = Field(default=None, primary_key=True)
    id_subcategoria: int = Field(foreign_key="subcategorias.id_subcategoria")
    nombre: str = Field(max_length=150)
    descripcion: Optional[str] = None
    moneda_compra: int = Field(foreign_key="moneda.id_moneda")
    precio_compra: Decimal
    moneda_venta: int = Field(foreign_key="moneda.id_moneda")
    precio_venta: Decimal
    precio_minimo: Decimal

    # Relaciones
    subcategoria: Subcategorias = Relationship(back_populates="productos")
    moneda_compra_rel: Moneda = Relationship(
        back_populates="productos_compra",
        sa_relationship_kwargs={"foreign_keys": "Productos.moneda_compra"},
    )
    moneda_venta_rel: Moneda = Relationship(
        back_populates="productos_venta",
        sa_relationship_kwargs={"foreign_keys": "Productos.moneda_venta"},
    )
    ventas: List["Ventas"] = Relationship(back_populates="producto")
    movimientos: List["Movimiento"] = Relationship(back_populates="producto")


# 12. Modelo: ventas
class Ventas(SQLModel, table=True):
    __tablename__ = "ventas"

    id_venta: Optional[int] = Field(default=None, primary_key=True)
    id_anexo: int = Field(foreign_key="anexo.id_anexo")
    id_producto: int = Field(foreign_key="productos.id_producto")
    codigo: str = Field(max_length=50)
    cantidad: int
    moneda_venta: int = Field(foreign_key="moneda.id_moneda")
    monto: Decimal
    id_transaccion: int = Field(foreign_key="transaccion.id_transaccion")
    id_liquidacion: Optional[int] = Field(
        default=None, foreign_key="liquidacion.id_liquidacion"
    )
    observacion: Optional[str] = None
    confirmacion: bool = False
    fecha_registro: datetime = Field(default_factory=datetime.utcnow)

    # Relaciones
    anexo: Anexo = Relationship(back_populates="ventas")
    producto: Productos = Relationship(back_populates="ventas")
    moneda_venta_rel: Moneda = Relationship(back_populates="ventas")
    transaccion: Transaccion = Relationship(back_populates="ventas")
    liquidacion: Optional[Liquidacion] = Relationship(back_populates="ventas")


# 13. Modelo: movimiento
class Movimiento(SQLModel, table=True):
    __tablename__ = "movimiento"

    id_movimiento: Optional[int] = Field(default=None, primary_key=True)
    id_tipo_movimiento: int = Field(foreign_key="tipo_movimiento.id_tipo_movimiento")
    id_dependencia: int = Field(foreign_key="dependencia.id_dependencia")
    id_anexo: int = Field(foreign_key="anexo.id_anexo")
    id_producto: int = Field(foreign_key="productos.id_producto")
    cantidad: int
    fecha: datetime = Field(default_factory=datetime.utcnow)
    observacion: Optional[str] = None
    id_liquidacion: Optional[int] = Field(
        default=None, foreign_key="liquidacion.id_liquidacion"
    )
    confirmacion: bool = False

    # Relaciones
    tipo_movimiento: TipoMovimiento = Relationship(back_populates="movimientos")
    dependencia: Dependencia = Relationship(back_populates="movimientos")
    anexo: Anexo = Relationship(back_populates="movimientos")
    producto: Productos = Relationship(back_populates="movimientos")
    liquidacion: Optional[Liquidacion] = Relationship(back_populates="movimientos")


# Export all models for imports
__all__ = [
    "Moneda",
    "Categorias",
    "Subcategorias",
    "TipoMovimiento",
    "TipoDependencia",
    "DatosGeneralesDependencia",
    "Dependencia",
    "Anexo",
    "Liquidacion",
    "Transaccion",
    "Productos",
    "Ventas",
    "Movimiento",
]
