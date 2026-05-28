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
    codigo_proyecto: Optional[str] = None


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
    codigo_proyecto: Optional[str] = None


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
    tipo_etapa: Optional[str] = "TAREAS"


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
    tipo_etapa: Optional[str] = None


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
    por_cobrar: Decimal = Decimal("0.00")


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
    por_cobrar: Optional[Decimal] = None


# ==========================================
# FACTURA SERVICIO
# ==========================================
class FacturaServicioBase(SQLModel):
    id_etapa: Optional[int] = None
    id_certificacion: Optional[int] = None
    alcance: Optional[str] = None
    codigo_factura: Optional[str] = None
    id_moneda: Optional[int] = None
    fecha: Optional[date] = None
    descripcion: Optional[str] = None
    importe: Decimal = Decimal("0.00")
    pagado: Decimal = Decimal("0.00")
    observaciones: Optional[str] = None
    cuenta_factura: Optional[str] = None
    id_usuario: Optional[int] = None


class FacturaServicioCreate(FacturaServicioBase):
    tareas_seleccionadas: Optional[List[int]] = None
    tarea_modifiers: Optional[dict] = None
    ajuste_porciento: Optional[Decimal] = None
    ajuste_valor: Optional[Decimal] = None


class FacturaServicioRead(FacturaServicioBase):
    id_factura_servicio: int


class FacturaServicioUpdate(SQLModel):
    id_etapa: Optional[int] = None
    alcance: Optional[str] = None
    codigo_factura: Optional[str] = None
    id_moneda: Optional[int] = None
    fecha: Optional[date] = None
    descripcion: Optional[str] = None
    importe: Optional[Decimal] = None
    pagado: Optional[Decimal] = None
    observaciones: Optional[str] = None
    cuenta_factura: Optional[str] = None
    id_usuario: Optional[int] = None
    tareas_seleccionadas: Optional[List[int]] = None
    tarea_modifiers: Optional[dict] = None
    ajuste_porciento: Optional[Decimal] = None
    ajuste_valor: Optional[Decimal] = None


# ==========================================
# ITEM FACTURA SERVICIO
# ==========================================
class ItemFacturaServicioBase(SQLModel):
    id_factura_servicio: int
    id_tarea_etapa: int
    codigo_extendido: Optional[str] = None
    concepto: Optional[str] = None
    unidad_medida: Optional[str] = None
    cantidad: Decimal = Decimal("0.00")
    precio: Decimal = Decimal("0.00")
    ajuste_porciento: Decimal = Decimal("0.00")
    ajuste_valor: Decimal = Decimal("0.00")


class ItemFacturaServicioCreate(ItemFacturaServicioBase):
    pass


class ItemFacturaServicioRead(ItemFacturaServicioBase):
    id_item_factura_servicio: int
    id_factura_servicio: int


class FacturaServicioWithItems(FacturaServicioRead):
    items: List[ItemFacturaServicioRead] = []


# ==========================================
# PAGO FACTURA SERVICIO
# ==========================================
class PagoFacturaServicioBase(SQLModel):
    monto: Decimal = Decimal("0.00")
    monto_disponible: Decimal = Decimal("0.00")
    id_moneda: Optional[int] = None
    fecha: Optional[date] = None
    doc_traza: Optional[str] = None


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
    tipo_pago: str = "TRANSFERENCIA"
    importe: Decimal = Decimal("0.00")
    porcentaje_caguayo: Decimal = Decimal("10.00")
    importe_caguayo: Decimal = Decimal("0.00")
    porciento_gestion: Decimal = Decimal("0.00")
    porciento_empresa: Decimal = Decimal("0.00")
    devengado: Decimal = Decimal("0.00")
    tributario: Decimal = Decimal("5.00")
    tributario_monto: Decimal = Decimal("0.00")
    comision_bancaria: Decimal = Decimal("0.00")
    neto_pagar: Decimal = Decimal("0.00")
    id_tipo_concepto: Optional[int] = None
    doc_pago_liquidacion: Optional[str] = None
    gasto_empresa: Decimal = Decimal("0.00")
    observacion: Optional[str] = None
    confirmado: bool = False
    id_pago: Optional[int] = None


class PersonaLiquidacionCreateInput(SQLModel):
    numero: Optional[str] = None
    id_etapa: int
    id_persona: int
    id_pago: Optional[int] = None
    importe: Optional[Decimal] = None
    fecha_emision: date
    fecha_liquidacion: Optional[date] = None
    descripcion: Optional[str] = None
    id_moneda: Optional[int] = None
    tipo_pago: str = "TRANSFERENCIA"
    porcentaje_caguayo: float = 10.0
    tributario: float = 5.0
    gasto_empresa: float = 0.0
    comision_bancaria: float = 0.0
    doc_pago_liquidacion: Optional[str] = None
    observacion: Optional[str] = None


class PersonaLiquidacionCreate(PersonaLiquidacionBase):
    pass


class PersonaLiquidacionUpdateInput(SQLModel):
    numero: Optional[str] = None
    id_etapa: Optional[int] = None
    id_persona: Optional[int] = None
    id_pago: Optional[int] = None
    importe: Optional[float] = None
    fecha_emision: Optional[date] = None
    fecha_liquidacion: Optional[date] = None
    descripcion: Optional[str] = None
    id_moneda: Optional[int] = None
    tipo_pago: Optional[str] = None
    porcentaje_caguayo: Optional[float] = None
    tributario: Optional[float] = None
    gasto_empresa: Optional[float] = None
    comision_bancaria: Optional[float] = None
    doc_pago_liquidacion: Optional[str] = None
    observacion: Optional[str] = None


class PersonaLiquidacionRead(PersonaLiquidacionBase):
    id_liquidacion: int


class PersonaLiquidacionUpdate(SQLModel):
    numero: Optional[str] = None
    id_etapa: Optional[int] = None
    id_persona: Optional[int] = None
    id_pago: Optional[int] = None
    fecha_emision: Optional[date] = None
    fecha_liquidacion: Optional[date] = None
    descripcion: Optional[str] = None
    id_moneda: Optional[int] = None
    tipo_pago: Optional[str] = None
    importe: Optional[Decimal] = None
    porcentaje_caguayo: Optional[Decimal] = None
    importe_caguayo: Optional[Decimal] = None
    porciento_gestion: Optional[Decimal] = None
    porciento_empresa: Optional[Decimal] = None
    devengado: Optional[Decimal] = None
    tributario: Optional[Decimal] = None
    tributario_monto: Optional[Decimal] = None
    comision_bancaria: Optional[Decimal] = None
    neto_pagar: Optional[Decimal] = None
    id_tipo_concepto: Optional[int] = None
    doc_pago_liquidacion: Optional[str] = None
    gasto_empresa: Optional[Decimal] = None
    observacion: Optional[str] = None


class PersonaLiquidacionConfirmar(SQLModel):
    devengado: Optional[float] = None
    porcentaje_caguayo: Optional[float] = None
    tributario: Optional[float] = None
    comision_bancaria: Optional[float] = None
    gasto_empresa: Optional[float] = None
    observaciones: Optional[str] = None
    doc_pago_liquidacion: Optional[str] = None


# ==========================================
# VALIDACION PAGO FACTURA PARA LIQUIDACION
# ==========================================
class PagoDetalleRead(SQLModel):
    id_pago_factura_servicio: int
    monto: Decimal
    monto_disponible: Decimal = Decimal("0.00")
    id_moneda: Optional[int] = None
    fecha: Optional[date] = None
    doc_traza: Optional[str] = None


class FacturaPagoValidacion(SQLModel):
    id_factura_servicio: Optional[int] = None
    codigo_factura: Optional[str] = None
    importe: Decimal = Decimal("0.00")
    pagado: Decimal = Decimal("0.00")
    saldo: Decimal = Decimal("0.00")
    esta_pagada: bool = False
    pagos: List[PagoDetalleRead] = []


class PersonaLiquidacionValidacion(SQLModel):
    puede_liquidar: bool
    id_etapa: int
    id_persona: int
    factura: Optional[FacturaPagoValidacion] = None
    mensaje: Optional[str] = None


# ==========================================
# CERTIFICACIONES
# ==========================================
class CertificacionBase(SQLModel):
    nombre: str
    id_etapa: int
    constructor: Optional[str] = None
    inversionista: Optional[str] = None
    obra: Optional[str] = None
    objeto_obra: Optional[str] = None
    actividad: Optional[str] = None
    descripcion: Optional[str] = None
    observaciones: Optional[str] = None
    fecha: Optional[date] = None
    a_cobrar: Decimal = Decimal("0.00")
    impuesto_venta_onat: Decimal = Decimal("0.00")
    ajuste_porciento: Decimal = Decimal("0.00")
    ajuste_valor: Decimal = Decimal("0.00")
    facturado: bool = False


class CertificacionCreate(CertificacionBase):
    pass


class CertificacionRead(CertificacionBase):
    id_certificacion: int


class CertificacionUpdate(SQLModel):
    nombre: Optional[str] = None
    id_etapa: Optional[int] = None
    constructor: Optional[str] = None
    inversionista: Optional[str] = None
    obra: Optional[str] = None
    objeto_obra: Optional[str] = None
    actividad: Optional[str] = None
    descripcion: Optional[str] = None
    observaciones: Optional[str] = None
    fecha: Optional[date] = None
    precio_servicio: Optional[Decimal] = None
    gasto_caguayo: Optional[int] = None
    a_cobrar: Optional[Decimal] = None
    ajuste_porciento: Optional[Decimal] = None
    ajuste_valor: Optional[Decimal] = None
