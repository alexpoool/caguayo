from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date, datetime, timezone
from decimal import Decimal
from sqlalchemy import Index

# Precisión monetaria (igual que el resto de los modelos)
_AMT = dict(max_digits=20, decimal_places=6)


class ActividadEconomica(SQLModel, table=True):
    """Actividad económica del contribuyente (Sección A de la DJ-08).

    Cada fila aporta: código - nombre de la actividad, período
    (desde/hasta), ingresos obtenidos y gastos deducibles.
    """

    __tablename__ = "actividad_economica"
    __table_args__ = (Index("idx_actividad_economica_codigo", "codigo"),)

    id_actividad: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    # Código de la actividad (p.ej. 0002 - Actividad principal)
    codigo: str = Field(max_length=50)
    nombre: str = Field(max_length=200)
    fecha_inicio: date
    fecha_fin: date
    ingresos: Decimal = Field(default=Decimal("0"), **_AMT)
    gastos: Decimal = Field(default=Decimal("0"), **_AMT)
    # Orden de presentación en la Sección A (filas 1-9)
    orden: int = Field(default=0)


class Tributo(SQLModel, table=True):
    """Tributo pagado asociado a la actividad (Sección F de la DJ-08).

    P.ej.: Impuesto sobre las Ventas y/o Servicios, Impuesto por la
    Utilización de la Fuerza de Trabajo, etc.
    """

    __tablename__ = "tributo"
    __table_args__ = (Index("idx_tributo_nombre", "nombre"),)

    id_tributo: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    nombre: str = Field(max_length=200)
    importe: Decimal = Field(default=Decimal("0"), **_AMT)


class DeclaracionJurada(SQLModel, table=True):
    """Declaración Jurada DJ-08 guardada.

    Guarda los datos del formulario y los resultados calculados como
    snapshot: aunque luego se editen actividades/tributos o cambien los
    datos de la dependencia, la declaración conserva los valores con
    los que se creó. El detalle va en declaracion_actividad /
    declaracion_tributo (copias, no referencias).
    """

    __tablename__ = "declaracion_jurada"
    __table_args__ = (
        Index("idx_dj_ano_fiscal", "ano_fiscal"),
        Index("idx_dj_estado", "estado"),
    )

    id_declaracion: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    # Código correlativo por año: DJ08-2025-0001
    codigo: str = Field(max_length=50, unique=True)
    id_usuario: Optional[int] = Field(default=None, foreign_key="usuarios.id_usuario")
    id_dependencia: Optional[int] = Field(
        default=None, foreign_key="dependencia.id_dependencia"
    )
    estado: str = Field(default="BORRADOR", max_length=20)  # BORRADOR | PRESENTADA
    fecha_creacion: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )

    # ── Cabecera (snapshot de dependencia/usuario al declarar) ──
    nit: Optional[str] = Field(default=None, max_length=20)
    nombre: Optional[str] = Field(default=None, max_length=300)
    direccion: Optional[str] = Field(default=None, max_length=255)
    municipio: Optional[str] = Field(default=None, max_length=100)
    provincia: Optional[str] = Field(default=None, max_length=100)
    codigo_postal: Optional[str] = Field(default=None, max_length=10)
    telefono: Optional[str] = Field(default=None, max_length=20)
    email: Optional[str] = Field(default=None, max_length=100)

    # ── Datos del formulario (los que ingresa el usuario) ──
    ano_fiscal: int
    opera_en_municipio: bool = Field(default=True)
    municipio_donde_opera: Optional[str] = Field(default=None, max_length=100)
    codigo_tributo: Optional[str] = Field(default=None, max_length=50)
    codigo_banco: Optional[str] = Field(default=None, max_length=50)
    minimo_exento: Decimal = Field(default=Decimal("39120"), **_AMT)
    contribucion_restauracion: Decimal = Field(default=Decimal("0"), **_AMT)
    pagos_arrendamiento: Decimal = Field(default=Decimal("0"), **_AMT)
    importe_exonerado_reparaciones: Decimal = Field(default=Decimal("0"), **_AMT)
    otros_descuentos: Decimal = Field(default=Decimal("0"), **_AMT)
    bonificacion_mfp: Decimal = Field(default=Decimal("0"), **_AMT)
    cuotas_mensuales: Decimal = Field(default=Decimal("0"), **_AMT)
    otros_pagos_anticipados: Decimal = Field(default=Decimal("0"), **_AMT)
    total_retenciones: Decimal = Field(default=Decimal("0"), **_AMT)
    bonificaciones_autorizadas: Decimal = Field(default=Decimal("0"), **_AMT)
    impuesto_declaracion_rectificada: Decimal = Field(default=Decimal("0"), **_AMT)
    pago_declaracion_anterior: Decimal = Field(default=Decimal("0"), **_AMT)
    bonificacion_pronto_pago: Decimal = Field(default=Decimal("0"), **_AMT)
    impuesto_pagado_dj_ano: Decimal = Field(default=Decimal("0"), **_AMT)
    recargo_mora: Decimal = Field(default=Decimal("0"), **_AMT)
    fecha_declaracion: Optional[date] = None
    observaciones: Optional[str] = None

    # ── Resultados calculados (snapshot al guardar) ──
    total_ingresos: Decimal = Field(default=Decimal("0"), **_AMT)
    total_gastos: Decimal = Field(default=Decimal("0"), **_AMT)
    total_tributos: Decimal = Field(default=Decimal("0"), **_AMT)
    base_imponible: Decimal = Field(default=Decimal("0"), **_AMT)
    impuesto_escala: Decimal = Field(default=Decimal("0"), **_AMT)
    impuesto_pagar: Decimal = Field(default=Decimal("0"), **_AMT)
    total_devolver: Decimal = Field(default=Decimal("0"), **_AMT)
    diferencia_pagar: Decimal = Field(default=Decimal("0"), **_AMT)
    diferencia_devolver: Decimal = Field(default=Decimal("0"), **_AMT)
    total_pagar: Decimal = Field(default=Decimal("0"), **_AMT)


class DeclaracionActividad(SQLModel, table=True):
    """Copia de una actividad económica al momento de declarar."""

    __tablename__ = "declaracion_actividad"
    __table_args__ = (Index("idx_dj_act_declaracion", "id_declaracion"),)

    id_declaracion_actividad: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    id_declaracion: int = Field(foreign_key="declaracion_jurada.id_declaracion")
    codigo: str = Field(max_length=50)
    nombre: str = Field(max_length=200)
    fecha_inicio: date
    fecha_fin: date
    ingresos: Decimal = Field(default=Decimal("0"), **_AMT)
    gastos: Decimal = Field(default=Decimal("0"), **_AMT)
    orden: int = Field(default=0)


class DeclaracionTributo(SQLModel, table=True):
    """Copia de un tributo al momento de declarar."""

    __tablename__ = "declaracion_tributo"
    __table_args__ = (Index("idx_dj_trib_declaracion", "id_declaracion"),)

    id_declaracion_tributo: Optional[int] = Field(
        default=None, primary_key=True, sa_column_kwargs={"autoincrement": True}
    )
    id_declaracion: int = Field(foreign_key="declaracion_jurada.id_declaracion")
    nombre: str = Field(max_length=200)
    importe: Decimal = Field(default=Decimal("0"), **_AMT)
