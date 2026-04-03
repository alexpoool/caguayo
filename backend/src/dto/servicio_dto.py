from typing import Optional, List
from datetime import date
from decimal import Decimal
from sqlmodel import SQLModel


# ==========================================
# SERVICIOS
# ==========================================
class ServicioBase(SQLModel):
    codigo_servicio: Optional[str] = None
    concepto: Optional[str] = None
    unidad_medida: Optional[str] = None
    precio: Decimal = Decimal("0.00")
    id_moneda: Optional[int] = None
    observaciones: Optional[str] = None


class ServicioCreate(ServicioBase):
    pass


class ServicioRead(ServicioBase):
    id_servicio: int


class ServicioUpdate(SQLModel):
    codigo_servicio: Optional[str] = None
    concepto: Optional[str] = None
    unidad_medida: Optional[str] = None
    precio: Optional[Decimal] = None
    id_moneda: Optional[int] = None
    observaciones: Optional[str] = None


# ==========================================
# SOLICITUD SERVICIO
# ==========================================
class SolicitudServicioBase(SQLModel):
    id_cliente: Optional[int] = None
    id_contrato: Optional[int] = None
    id_suplemento: Optional[int] = None
    codigo_solicitud: Optional[str] = None
    nombres_rep: Optional[str] = None
    apellido1_rep: Optional[str] = None
    apellido2_rep: Optional[str] = None
    ci_rep: Optional[str] = None
    telefono_rep: Optional[str] = None
    cargo: Optional[str] = None
    descripcion: Optional[str] = None
    fecha_solicitud: date
    fecha_entrega: Optional[date] = None
    estado: Optional[str] = None
    observaciones: Optional[str] = None
    material_asumido_x: bool = False
    id_usuario: Optional[int] = None
    aprobado: bool = False


class SolicitudServicioCreate(SolicitudServicioBase):
    pass


class SolicitudServicioRead(SolicitudServicioBase):
    id_solicitud_servicio: int


class SolicitudServicioUpdate(SQLModel):
    id_cliente: Optional[int] = None
    id_contrato: Optional[int] = None
    id_suplemento: Optional[int] = None
    codigo_solicitud: Optional[str] = None
    nombres_rep: Optional[str] = None
    apellido1_rep: Optional[str] = None
    apellido2_rep: Optional[str] = None
    ci_rep: Optional[str] = None
    telefono_rep: Optional[str] = None
    cargo: Optional[str] = None
    descripcion: Optional[str] = None
    fecha_solicitud: Optional[date] = None
    fecha_entrega: Optional[date] = None
    estado: Optional[str] = None
    observaciones: Optional[str] = None
    material_asumido_x: Optional[bool] = None
    id_usuario: Optional[int] = None
    aprobado: Optional[bool] = None


# ==========================================
# ETAPAS
# ==========================================
class EtapaBase(SQLModel):
    numero_etapa: Optional[int] = None
    nombre_etapa: Optional[str] = None
    fecha_entrega: Optional[date] = None
    fecha_pago: Optional[date] = None
    descripcion: Optional[str] = None
    valor: Decimal = Decimal("0.00")
    id_moneda: Optional[int] = None
    pagada: bool = False


class EtapaCreate(EtapaBase):
    id_solicitud_servicio: int


class EtapaRead(EtapaBase):
    id_etapa: int
    id_solicitud_servicio: int


class EtapaUpdate(SQLModel):
    numero_etapa: Optional[int] = None
    nombre_etapa: Optional[str] = None
    fecha_entrega: Optional[date] = None
    fecha_pago: Optional[date] = None
    descripcion: Optional[str] = None
    valor: Optional[Decimal] = None
    id_moneda: Optional[int] = None
    pagada: Optional[bool] = None


# ==========================================
# TAREAS ETAPA
# ==========================================
class TareaEtapaBase(SQLModel):
    id_servicio: Optional[int] = None
    codigo_extendido: Optional[str] = None
    concepto_modificado: Optional[str] = None
    unidad_medida: Optional[str] = None
    cantidad: Decimal = Decimal("0.00")
    precio_ajustado: Decimal = Decimal("0.00")
    id_moneda: Optional[int] = None
    observaciones_ajustadas: Optional[str] = None


class TareaEtapaCreate(TareaEtapaBase):
    id_etapa: int


class TareaEtapaRead(TareaEtapaBase):
    id_tarea_etapa: int
    id_etapa: int


class TareaEtapaUpdate(SQLModel):
    id_servicio: Optional[int] = None
    codigo_extendido: Optional[str] = None
    concepto_modificado: Optional[str] = None
    unidad_medida: Optional[str] = None
    cantidad: Optional[Decimal] = None
    precio_ajustado: Optional[Decimal] = None
    id_moneda: Optional[int] = None
    observaciones_ajustadas: Optional[str] = None


# ==========================================
# PERSONA ETAPA
# ==========================================
class PersonaEtapaBase(SQLModel):
    cobro: Decimal = Decimal("0.00")
    id_moneda: Optional[int] = None
    liquidada: bool = False
    pago_completado: bool = False


class PersonaEtapaCreate(PersonaEtapaBase):
    id_etapa: int
    id_persona: int


class PersonaEtapaRead(PersonaEtapaBase):
    id_etapa: int
    id_persona: int


class PersonaEtapaUpdate(SQLModel):
    cobro: Optional[Decimal] = None
    id_moneda: Optional[int] = None
    liquidada: Optional[bool] = None
    pago_completado: Optional[bool] = None


# ==========================================
# FACTURA SERVICIO
# ==========================================
class FacturaServicioBase(SQLModel):
    id_etapa: Optional[int] = None
    alcance: Optional[str] = None
    codigo_factura: Optional[str] = None
    id_moneda: Optional[int] = None
    fecha: Optional[date] = None
    descripcion: Optional[str] = None
    cantidad: Decimal = Decimal("0.00")
    precio: Decimal = Decimal("0.00")
    observaciones: Optional[str] = None
    id_usuario: Optional[int] = None


class FacturaServicioCreate(FacturaServicioBase):
    pass


class FacturaServicioRead(FacturaServicioBase):
    id_factura_servicio: int


class FacturaServicioUpdate(SQLModel):
    id_etapa: Optional[int] = None
    alcance: Optional[str] = None
    codigo_factura: Optional[str] = None
    id_moneda: Optional[int] = None
    fecha: Optional[date] = None
    descripcion: Optional[str] = None
    cantidad: Optional[Decimal] = None
    precio: Optional[Decimal] = None
    observaciones: Optional[str] = None
    id_usuario: Optional[int] = None


# ==========================================
# PAGO FACTURA SERVICIO
# ==========================================
class PagoFacturaServicioBase(SQLModel):
    monto: Decimal = Decimal("0.00")
    id_moneda: Optional[int] = None
    fecha: Optional[date] = None
    doc_traza: Optional[str] = None
    doc_factura: Optional[str] = None


class PagoFacturaServicioCreate(PagoFacturaServicioBase):
    id_factura_servicio: int


class PagoFacturaServicioRead(PagoFacturaServicioBase):
    id_pago_factura_servicio: int
    id_factura_servicio: Optional[int] = None


# ==========================================
# PERSONA LIQUIDACION
# ==========================================
class PersonaLiquidacionBase(SQLModel):
    numero: Optional[str] = None
    id_etapa: Optional[int] = None
    id_persona: Optional[int] = None
    fecha_emision: date
    fecha_liquidacion: Optional[date] = None
    descripcion: Optional[str] = None
    id_moneda: Optional[int] = None
    importe: Decimal = Decimal("0.00")
    porciento_gestion: Decimal = Decimal("0.00")
    porciento_empresa: Decimal = Decimal("0.00")
    devengado: Decimal = Decimal("0.00")
    tributario: Decimal = Decimal("0.00")
    comision_bancaria: Decimal = Decimal("0.00")
    neto_pagar: Decimal = Decimal("0.00")
    id_tipo_concepto: Optional[int] = None
    doc_pago_liquidacion: Optional[str] = None
    gasto_empresa: Decimal = Decimal("0.00")
    observacion: Optional[str] = None


class PersonaLiquidacionCreate(PersonaLiquidacionBase):
    pass


class PersonaLiquidacionRead(PersonaLiquidacionBase):
    id_liquidacion: int


class PersonaLiquidacionUpdate(SQLModel):
    numero: Optional[str] = None
    id_etapa: Optional[int] = None
    id_persona: Optional[int] = None
    fecha_emision: Optional[date] = None
    fecha_liquidacion: Optional[date] = None
    descripcion: Optional[str] = None
    id_moneda: Optional[int] = None
    importe: Optional[Decimal] = None
    porciento_gestion: Optional[Decimal] = None
    porciento_empresa: Optional[Decimal] = None
    devengado: Optional[Decimal] = None
    tributario: Optional[Decimal] = None
    comision_bancaria: Optional[Decimal] = None
    neto_pagar: Optional[Decimal] = None
    id_tipo_concepto: Optional[int] = None
    doc_pago_liquidacion: Optional[str] = None
    gasto_empresa: Optional[Decimal] = None
    observacion: Optional[str] = None
