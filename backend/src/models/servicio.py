from typing import Optional, List
from datetime import date
from decimal import Decimal
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Column, ForeignKey


class Servicio(SQLModel, table=True):
    __tablename__ = "servicios"

    id_servicio: Optional[int] = Field(default=None, primary_key=True)
    codigo_servicio: Optional[str] = Field(default=None, max_length=50, unique=True)
    concepto: Optional[str] = None
    unidad_medida: Optional[str] = Field(default=None, max_length=20)
    precio: Decimal = Field(default=Decimal("0.00"))
    id_moneda: Optional[int] = Field(default=None, foreign_key="moneda.id_moneda")
    observaciones: Optional[str] = None


class SolicitudServicio(SQLModel, table=True):
    __tablename__ = "solicitud_servicio"

    id_solicitud_servicio: Optional[int] = Field(default=None, primary_key=True)
    id_cliente: Optional[int] = Field(default=None, foreign_key="clientes.id_cliente")
    id_contrato: Optional[int] = Field(default=None, foreign_key="contrato.id_contrato")
    id_suplemento: Optional[int] = Field(
        default=None, foreign_key="suplemento.id_suplemento"
    )
    codigo_solicitud: Optional[str] = Field(default=None, max_length=50)
    nombres_rep: Optional[str] = Field(default=None, max_length=100)
    apellido1_rep: Optional[str] = Field(default=None, max_length=100)
    apellido2_rep: Optional[str] = Field(default=None, max_length=100)
    ci_rep: Optional[str] = Field(default=None, max_length=20)
    telefono_rep: Optional[str] = Field(default=None, max_length=20)
    cargo: Optional[str] = Field(default=None, max_length=100)
    descripcion: Optional[str] = None
    fecha_solicitud: date = Field(default=date.today())
    fecha_entrega: Optional[date] = None
    estado: Optional[str] = Field(default=None, max_length=50)
    observaciones: Optional[str] = None
    material_asumido_x: bool = Field(default=False)
    id_usuario: Optional[int] = None
    aprobado: bool = Field(default=False)

    etapas: List["Etapa"] = Relationship(
        back_populates="solicitud", sa_relationship_kwargs={"lazy": "selectin"}
    )


class Etapa(SQLModel, table=True):
    __tablename__ = "etapas"

    id_etapa: Optional[int] = Field(default=None, primary_key=True)
    id_solicitud_servicio: int = Field(
        sa_column=Column(
            ForeignKey("solicitud_servicio.id_solicitud_servicio", ondelete="CASCADE"),
            nullable=False,
        )
    )
    numero_etapa: Optional[int] = None
    nombre_etapa: Optional[str] = Field(default=None, max_length=150)
    fecha_entrega: Optional[date] = None
    fecha_pago: Optional[date] = None
    descripcion: Optional[str] = None
    valor: Decimal = Field(default=Decimal("0.00"))
    id_moneda: Optional[int] = Field(default=None, foreign_key="moneda.id_moneda")
    pagada: bool = Field(default=False)

    solicitud: "SolicitudServicio" = Relationship(back_populates="etapas")
    tareas: List["TareaEtapa"] = Relationship(
        back_populates="etapa", sa_relationship_kwargs={"lazy": "selectin"}
    )
    personas: List["PersonaEtapa"] = Relationship(
        back_populates="etapa", sa_relationship_kwargs={"lazy": "selectin"}
    )
    facturas: List["FacturaServicio"] = Relationship(
        back_populates="etapa", sa_relationship_kwargs={"lazy": "selectin"}
    )


class TareaEtapa(SQLModel, table=True):
    __tablename__ = "tareas_etapa"

    id_tarea_etapa: Optional[int] = Field(default=None, primary_key=True)
    id_etapa: int = Field(
        sa_column=Column(
            ForeignKey("etapas.id_etapa", ondelete="CASCADE"), nullable=False
        )
    )
    id_servicio: Optional[int] = Field(
        default=None, foreign_key="servicios.id_servicio"
    )
    codigo_extendido: Optional[str] = Field(default=None, max_length=100)
    concepto_modificado: Optional[str] = None
    unidad_medida: Optional[str] = Field(default=None, max_length=20)
    cantidad: Decimal = Field(default=Decimal("0.00"))
    precio_ajustado: Decimal = Field(default=Decimal("0.00"))
    id_moneda: Optional[int] = Field(default=None, foreign_key="moneda.id_moneda")
    observaciones_ajustadas: Optional[str] = None

    etapa: "Etapa" = Relationship(back_populates="tareas")


class PersonaEtapa(SQLModel, table=True):
    __tablename__ = "persona_etapa"

    id_etapa: int = Field(
        sa_column=Column(
            ForeignKey("etapas.id_etapa", ondelete="CASCADE"),
            nullable=False,
            primary_key=True,
        )
    )
    id_persona: int = Field(
        sa_column=Column(
            ForeignKey("clientes_persona_natural.id_cliente"),
            nullable=False,
            primary_key=True,
        )
    )
    cobro: Decimal = Field(default=Decimal("0.00"))
    id_moneda: Optional[int] = Field(default=None, foreign_key="moneda.id_moneda")
    liquidada: bool = Field(default=False)
    pago_completado: bool = Field(default=False)

    etapa: "Etapa" = Relationship(back_populates="personas")


class FacturaServicio(SQLModel, table=True):
    __tablename__ = "factura_servicio"

    id_factura_servicio: Optional[int] = Field(default=None, primary_key=True)
    id_etapa: Optional[int] = Field(default=None, foreign_key="etapas.id_etapa")
    alcance: Optional[str] = Field(default=None, max_length=20)
    codigo_factura: Optional[str] = Field(default=None, max_length=50)
    id_moneda: Optional[int] = Field(default=None, foreign_key="moneda.id_moneda")
    fecha: Optional[date] = None
    descripcion: Optional[str] = None
    cantidad: Decimal = Field(default=Decimal("0.00"))
    precio: Decimal = Field(default=Decimal("0.00"))
    observaciones: Optional[str] = None
    id_usuario: Optional[int] = None

    etapa: "Etapa" = Relationship(back_populates="facturas")
    pagos: List["PagoFacturaServicio"] = Relationship(
        back_populates="factura", sa_relationship_kwargs={"lazy": "selectin"}
    )


class PagoFacturaServicio(SQLModel, table=True):
    __tablename__ = "pago_factura_servicio"

    id_pago_factura_servicio: Optional[int] = Field(default=None, primary_key=True)
    id_factura_servicio: Optional[int] = Field(
        default=None, foreign_key="factura_servicio.id_factura_servicio"
    )
    monto: Decimal = Field(default=Decimal("0.00"))
    id_moneda: Optional[int] = Field(default=None, foreign_key="moneda.id_moneda")
    fecha: Optional[date] = None
    doc_traza: Optional[str] = Field(default=None, max_length=100)
    doc_factura: Optional[str] = Field(default=None, max_length=100)

    factura: "FacturaServicio" = Relationship(back_populates="pagos")


class PersonaLiquidacion(SQLModel, table=True):
    __tablename__ = "persona_liquidacion"

    id_liquidacion: Optional[int] = Field(default=None, primary_key=True)
    numero: Optional[str] = Field(default=None, max_length=50)
    id_etapa: Optional[int] = Field(default=None, foreign_key="etapas.id_etapa")
    id_persona: Optional[int] = Field(
        default=None, foreign_key="clientes_persona_natural.id_cliente"
    )
    fecha_emision: date = Field(default=date.today())
    fecha_liquidacion: Optional[date] = None
    descripcion: Optional[str] = None
    id_moneda: Optional[int] = Field(default=None, foreign_key="moneda.id_moneda")
    importe: Decimal = Field(default=Decimal("0.00"))
    porciento_gestion: Decimal = Field(default=Decimal("0.00"))
    porciento_empresa: Decimal = Field(default=Decimal("0.00"))
    devengado: Decimal = Field(default=Decimal("0.00"))
    tributario: Decimal = Field(default=Decimal("0.00"))
    comision_bancaria: Decimal = Field(default=Decimal("0.00"))
    neto_pagar: Decimal = Field(default=Decimal("0.00"))
    id_tipo_concepto: Optional[int] = None
    doc_pago_liquidacion: Optional[str] = Field(default=None, max_length=100)
    gasto_empresa: Decimal = Field(default=Decimal("0.00"))
    observacion: Optional[str] = None
