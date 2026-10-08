from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel


class ActividadEconomicaCreate(BaseModel):
    codigo: str
    nombre: str
    fecha_inicio: date
    fecha_fin: date
    ingresos: Decimal = Decimal("0")
    gastos: Decimal = Decimal("0")
    orden: int = 0


class ActividadEconomicaRead(ActividadEconomicaCreate):
    id_actividad: int


class TributoCreate(BaseModel):
    nombre: str
    importe: Decimal = Decimal("0")


class TributoRead(TributoCreate):
    id_tributo: int


class DJ08Input(BaseModel):
    """Entrada del formulario DJ-08.

    Los datos de dependencia y usuario NO vienen del cliente: el backend
    los toma de la sesión. Aquí solo van los campos que el usuario ingresa.
    """

    ano_fiscal: int
    opera_en_municipio: bool = True
    municipio_donde_opera: Optional[str] = None
    codigo_tributo: Optional[str] = None
    codigo_banco: Optional[str] = None

    # Sección B (descuentos). El mínimo exento viaja editable con default legal.
    minimo_exento: Decimal = Decimal("39120")
    contribucion_restauracion: Decimal = Decimal("0")
    pagos_arrendamiento: Decimal = Decimal("0")
    importe_exonerado_reparaciones: Decimal = Decimal("0")
    otros_descuentos: Decimal = Decimal("0")
    bonificacion_mfp: Decimal = Decimal("0")

    # Sección C (pagos anticipados)
    cuotas_mensuales: Decimal = Decimal("0")
    otros_pagos_anticipados: Decimal = Decimal("0")
    total_retenciones: Decimal = Decimal("0")
    bonificaciones_autorizadas: Decimal = Decimal("0")

    # Sección D (rectificada)
    impuesto_declaracion_rectificada: Decimal = Decimal("0")
    pago_declaracion_anterior: Decimal = Decimal("0")

    # Sección E
    bonificacion_pronto_pago: Decimal = Decimal("0")
    impuesto_pagado_dj_ano: Decimal = Decimal("0")
    recargo_mora: Decimal = Decimal("0")

    # Encabezado / hoja 4
    fecha_declaracion: Optional[date] = None
    observaciones: Optional[str] = None


class EscalaFila(BaseModel):
    desde: Decimal
    hasta: Optional[Decimal]  # None = infinito (última fila)
    base_imponible: Decimal
    tipo: int  # porcentaje entero
    importe: Decimal
    fila: int


class DJ08Calculado(BaseModel):
    """Salida completa para pintar el PDF: cabecera + secciones A-G + E."""

    # Cabecera (dependencia + usuario)
    nit: str = ""
    nombre: str = ""
    direccion: str = ""
    municipio: str = ""
    provincia: str = ""
    codigo_postal: str = ""
    telefono: str = ""
    email: str = ""

    entrada: DJ08Input

    # Sección A
    actividades: List[ActividadEconomicaRead]
    total_ingresos: Decimal  # fila 10
    total_gastos: Decimal    # fila 10

    # Sección B
    total_tributos: Decimal        # fila 14 = suma de tributos (Sección F)
    base_imponible: Decimal        # fila 20

    # Sección C
    impuesto_escala: Decimal  # fila 21 = total Sección G
    impuesto_pagar: Decimal   # fila 26
    total_devolver: Decimal   # fila 27

    # Sección D
    diferencia_pagar: Decimal     # fila 30
    diferencia_devolver: Decimal  # fila 31

    # Sección E
    total_pagar: Decimal  # fila 36

    # Sección F
    tributos: List[TributoRead]

    # Sección G
    escala: List[EscalaFila]
    escala_total_base: Decimal     # fila 55
    escala_total_importe: Decimal  # fila 55


class DeclaracionJuradaRead(BaseModel):
    """Lectura de una declaración guardada (lista y detalle)."""

    id_declaracion: int
    codigo: str
    id_usuario: Optional[int]
    id_dependencia: Optional[int]
    estado: str
    fecha_creacion: datetime
    ano_fiscal: int
    fecha_declaracion: Optional[date]
    observaciones: Optional[str]
    total_ingresos: Decimal
    total_gastos: Decimal
    total_tributos: Decimal
    base_imponible: Decimal
    impuesto_escala: Decimal
    impuesto_pagar: Decimal
    total_devolver: Decimal
    diferencia_pagar: Decimal
    diferencia_devolver: Decimal
    total_pagar: Decimal
