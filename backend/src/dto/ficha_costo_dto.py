from sqlmodel import SQLModel
from typing import List, Optional
from datetime import date
from decimal import Decimal


class FichaInsumoCreate(SQLModel):
    id_producto: Optional[int] = None
    codigo: str = ""
    nombre: str
    um: Optional[str] = None
    norma_consumo: Decimal = Decimal("0")
    precio_unitario: Decimal = Decimal("0")
    # `costo` se recalcula en el backend (norma_consumo × precio_unitario)


class FichaManoObraCreate(SQLModel):
    id_tarifa: Optional[int] = None
    categoria: str
    tarifa_horaria: Decimal = Decimal("0")
    norma_tiempo: Decimal = Decimal("0")
    # `gasto_salario` se recalcula en el backend (tarifa × norma)


class FichaCostoBase(SQLModel):
    id_producto: int
    # El No. de ficha lo asigna el backend (= id_ficha); se acepta por compatibilidad
    numero_ficha: str = ""
    nivel_produccion: Decimal = Decimal("1")
    # Coeficientes (editables, precargados con los valores de la entidad)
    pct_energia: Decimal = Decimal("3")
    pct_agua: Decimal = Decimal("0.5")
    pct_otros_gastos_directos: Decimal = Decimal("17")
    pct_vacaciones: Decimal = Decimal("9.09")
    coef_gastos_asociados: Decimal = Decimal("0.2587298394047821")
    coef_gastos_generales: Decimal = Decimal("0.4195769613893774")
    coef_gastos_distribucion: Decimal = Decimal("0.3216931992058406")
    coef_gastos_financieros: Decimal = Decimal("1.4939751466265447")
    pct_seguridad_social: Decimal = Decimal("12.5")
    pct_fuerza_trabajo: Decimal = Decimal("5")
    pct_utilidad: Decimal = Decimal("25")
    pct_impuesto_ventas: Decimal = Decimal("18")
    # Entradas manuales
    gasto_combustible: Decimal = Decimal("0")
    gasto_osde: Decimal = Decimal("0")
    # Metadatos
    elaborado_por: Optional[str] = None
    aprobado_por: Optional[str] = None
    fecha_elaboracion: date
    fecha_aprobacion: Optional[date] = None


class FichaCostoCreate(FichaCostoBase):
    insumos: List[FichaInsumoCreate] = []
    mano_obra: List[FichaManoObraCreate] = []


class FichaCostoUpdate(SQLModel):
    numero_ficha: Optional[str] = None
    nivel_produccion: Optional[Decimal] = None
    pct_energia: Optional[Decimal] = None
    pct_agua: Optional[Decimal] = None
    pct_otros_gastos_directos: Optional[Decimal] = None
    pct_vacaciones: Optional[Decimal] = None
    coef_gastos_asociados: Optional[Decimal] = None
    coef_gastos_generales: Optional[Decimal] = None
    coef_gastos_distribucion: Optional[Decimal] = None
    coef_gastos_financieros: Optional[Decimal] = None
    pct_seguridad_social: Optional[Decimal] = None
    pct_fuerza_trabajo: Optional[Decimal] = None
    pct_utilidad: Optional[Decimal] = None
    pct_impuesto_ventas: Optional[Decimal] = None
    gasto_combustible: Optional[Decimal] = None
    gasto_osde: Optional[Decimal] = None
    elaborado_por: Optional[str] = None
    aprobado_por: Optional[str] = None
    fecha_elaboracion: Optional[date] = None
    fecha_aprobacion: Optional[date] = None
    insumos: Optional[List[FichaInsumoCreate]] = None
    mano_obra: Optional[List[FichaManoObraCreate]] = None


class FichaInsumoRead(SQLModel):
    id_ficha_insumo: int
    id_ficha: int
    id_producto: Optional[int] = None
    codigo: str
    nombre: str
    um: Optional[str] = None
    norma_consumo: Decimal
    precio_unitario: Decimal
    costo: Decimal


class FichaManoObraRead(SQLModel):
    id_ficha_mano_obra: int
    id_ficha: int
    id_tarifa: Optional[int] = None
    categoria: str
    tarifa_horaria: Decimal
    norma_tiempo: Decimal
    gasto_salario: Decimal


class FichaCostoRead(FichaCostoBase):
    id_ficha: int
    producto_nombre: Optional[str] = None
    # Importes calculados (snapshot persistido al guardar)
    total_insumos: Decimal = Decimal("0")
    gasto_energia: Decimal = Decimal("0")
    gasto_agua: Decimal = Decimal("0")
    gasto_material: Decimal = Decimal("0")
    salario_directo: Decimal = Decimal("0")
    vacaciones: Decimal = Decimal("0")
    salario_total: Decimal = Decimal("0")
    otros_gastos_directos: Decimal = Decimal("0")
    gastos_asociados: Decimal = Decimal("0")
    costo_total: Decimal = Decimal("0")
    gastos_generales: Decimal = Decimal("0")
    gastos_distribucion: Decimal = Decimal("0")
    gastos_financieros: Decimal = Decimal("0")
    gastos_tributarios: Decimal = Decimal("0")
    impuesto_ventas: Decimal = Decimal("0")
    total_gastos: Decimal = Decimal("0")
    total_costos_gastos: Decimal = Decimal("0")
    utilidad: Decimal = Decimal("0")
    precio_tarifa: Decimal = Decimal("0")
    precio_unitario_ajustado: Decimal = Decimal("0")
    insumos: List[FichaInsumoRead] = []
    mano_obra: List[FichaManoObraRead] = []
