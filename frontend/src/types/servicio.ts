export interface Servicio {
  id_servicio: number;
  codigo_servicio?: string;
  concepto?: string;
  unidad_medida?: string;
  precio: number;
  id_moneda?: number;
  observaciones?: string;
}

export interface ServicioCreate {
  codigo_servicio?: string;
  concepto?: string;
  unidad_medida?: string;
  precio?: number;
  id_moneda?: number;
  observaciones?: string;
}

export interface ServicioUpdate {
  codigo_servicio?: string;
  concepto?: string;
  unidad_medida?: string;
  precio?: number;
  id_moneda?: number;
  observaciones?: string;
}

export interface SolicitudServicio {
  id_solicitud_servicio: number;
  id_cliente?: number;
  id_contrato?: number;
  id_suplemento?: number;
  codigo_solicitud?: string;
  numero?: string;
  nombres_rep?: string;
  apellido1_rep?: string;
  apellido2_rep?: string;
  ci_rep?: string;
  telefono_rep?: string;
  cargo?: string;
  descripcion?: string;
  fecha_solicitud: string;
  fecha_entrega?: string;
  estado?: string;
  observaciones?: string;
  material_asumido_x: boolean;
  id_usuario?: number;
  aprobado: boolean;
  codigo_proyecto?: string;
}

export interface SolicitudServicioCreate {
  id_cliente?: number;
  id_contrato?: number;
  id_suplemento?: number;
  codigo_solicitud?: string;
  numero?: string;
  nombres_rep?: string;
  apellido1_rep?: string;
  apellido2_rep?: string;
  ci_rep?: string;
  telefono_rep?: string;
  cargo?: string;
  descripcion?: string;
  fecha_solicitud: string;
  fecha_entrega?: string;
  estado?: string;
  observaciones?: string;
  material_asumido_x?: boolean;
  id_usuario?: number;
  aprobado?: boolean;
  codigo_proyecto?: string;
}

export interface SolicitudServicioUpdate extends Partial<SolicitudServicioCreate> {}

export interface Etapa {
  id_etapa: number;
  id_solicitud_servicio: number;
  numero_etapa?: number;
  nombre_etapa?: string;
  fecha_entrega?: string;
  fecha_pago?: string;
  descripcion?: string;
  valor: number;
  id_moneda?: number;
  pagada: boolean;
  tipo_etapa?: 'TAREAS' | 'CERTIFICACIONES';
}

export interface EtapaCreate {
  id_solicitud_servicio: number;
  numero_etapa?: number;
  nombre_etapa?: string;
  fecha_entrega?: string;
  fecha_pago?: string;
  descripcion?: string;
  valor?: number;
  id_moneda?: number;
  pagada?: boolean;
  tipo_etapa?: 'TAREAS' | 'CERTIFICACIONES';
}

export interface EtapaUpdate {
  numero_etapa?: number;
  nombre_etapa?: string;
  fecha_entrega?: string;
  fecha_pago?: string;
  descripcion?: string;
  valor?: number;
  id_moneda?: number;
  pagada?: boolean;
  tipo_etapa?: 'TAREAS' | 'CERTIFICACIONES';
}

export interface TareaEtapa {
  id_tarea_etapa: number;
  id_etapa: number;
  id_servicio?: number;
  codigo_extendido?: string;
  concepto_modificado?: string;
  unidad_medida?: string;
  cantidad: number;
  precio_ajustado: number;
  id_moneda?: number;
  observaciones_ajustadas?: string;
  facturada?: boolean;
}

export interface TareaEtapaCreate {
  id_etapa: number;
  id_servicio?: number;
  codigo_extendido?: string;
  concepto_modificado?: string;
  unidad_medida?: string;
  cantidad?: number;
  precio_ajustado?: number;
  id_moneda?: number;
  observaciones_ajustadas?: string;
}

export interface TareaEtapaUpdate {
  id_servicio?: number;
  codigo_extendido?: string;
  concepto_modificado?: string;
  unidad_medida?: string;
  cantidad?: number;
  precio_ajustado?: number;
  id_moneda?: number;
  observaciones_ajustadas?: string;
}

export interface PersonaEtapa {
  id_etapa: number;
  id_persona: number;
  cobro: number;
  id_moneda?: number;
  liquidada: boolean;
  por_cobrar: number;
}

export interface PersonaEtapaCreate {
  id_etapa: number;
  id_persona: number;
  cobro?: number;
  id_moneda?: number;
  liquidada?: boolean;
  por_cobrar?: number;
}

export interface FacturaServicio {
  id_factura_servicio: number;
  id_etapa?: number;
  id_certificacion?: number;
  alcance?: string;
  codigo_factura?: string;
  id_moneda?: number;
  fecha?: string;
  descripcion?: string;
  importe: number;
  pagado: number;
  observaciones?: string;
  cuenta_factura?: string;
  id_usuario?: number;
}

export interface FacturaServicioCreate {
  id_etapa?: number;
  id_certificacion?: number;
  alcance?: string;
  codigo_factura?: string;
  id_moneda?: number;
  fecha?: string;
  descripcion?: string;
  importe?: number;
  pagado?: number;
  observaciones?: string;
  cuenta_factura?: string;
  id_usuario?: number;
  tareas_seleccionadas?: number[];
  tarea_modifiers?: Record<number, { cantidad: number; precio: number }>;
}

export interface FacturaServicioUpdate {
  id_etapa?: number;
  id_certificacion?: number;
  alcance?: string;
  codigo_factura?: string;
  id_moneda?: number;
  fecha?: string;
  descripcion?: string;
  importe?: number;
  pagado?: number;
  observaciones?: string;
  cuenta_factura?: string;
  id_usuario?: number;
  tareas_seleccionadas?: number[];
  tarea_modifiers?: Record<number, { cantidad: number; precio: number }>;
}

export interface ItemFacturaServicio {
  id_item_factura_servicio: number;
  id_factura_servicio: number;
  id_tarea_etapa: number;
  codigo_extendido?: string;
  concepto?: string;
  unidad_medida?: string;
  cantidad: number;
  precio: number;
}

export interface PagoFacturaServicio {
  id_pago_factura_servicio: number;
  id_factura_servicio?: number;
  monto: number;
  id_moneda?: number;
  fecha?: string;
  doc_traza?: string;
}

export interface PagoFacturaServicioCreate {
  id_factura_servicio: number;
  monto?: number;
  id_moneda?: number;
  fecha?: string;
  doc_traza?: string;
}

export interface PersonaLiquidacion {
  id_liquidacion: number;
  numero?: string;
  id_etapa?: number;
  id_persona?: number;
  fecha_emision: string;
  fecha_liquidacion?: string;
  descripcion?: string;
  id_moneda?: number;
  tipo_pago?: string;
  importe: number;
  porcentaje_caguayo: number;
  importe_caguayo: number;
  porciento_gestion: number;
  porciento_empresa: number;
  devengado: number;
  tributario: number;
  tributario_monto: number;
  comision_bancaria: number;
  neto_pagar: number;
  id_tipo_concepto?: number;
  doc_pago_liquidacion?: string;
  gasto_empresa: number;
  observacion?: string;
  confirmado: boolean;
  id_pago?: number;
}

export interface PersonaLiquidacionCreate {
  numero?: string;
  id_etapa?: number;
  id_persona?: number;
  fecha_emision: string;
  fecha_liquidacion?: string;
  descripcion?: string;
  id_moneda?: number;
  importe?: number;
  porcentaje_caguayo?: number;
  importe_caguayo?: number;
  porciento_gestion?: number;
  porciento_empresa?: number;
  devengado?: number;
  tributario?: number;
  tributario_monto?: number;
  comision_bancaria?: number;
  neto_pagar?: number;
  id_tipo_concepto?: number;
  doc_pago_liquidacion?: string;
  gasto_empresa?: number;
  observacion?: string;
}

export interface PersonaLiquidacionUpdate {
  numero?: string;
  id_etapa?: number;
  id_persona?: number;
  fecha_emision?: string;
  fecha_liquidacion?: string;
  descripcion?: string;
  id_moneda?: number;
  tipo_pago?: string;
  importe?: number;
  porcentaje_caguayo?: number;
  importe_caguayo?: number;
  porciento_gestion?: number;
  porciento_empresa?: number;
  devengado?: number;
  tributario?: number;
  tributario_monto?: number;
  comision_bancaria?: number;
  neto_pagar?: number;
  id_tipo_concepto?: number;
  doc_pago_liquidacion?: string;
  gasto_empresa?: number;
  observacion?: string;
}

export type PersonaLiquidacionInput = {
  numero?: string;
  id_etapa: number;
  id_persona: number;
  id_pago?: number;
  importe?: number;
  fecha_emision: string;
  fecha_liquidacion?: string;
  descripcion?: string;
  id_moneda?: number;
  tipo_pago?: string;
  porcentaje_caguayo?: number;
  tributario?: number;
  gasto_empresa?: number;
  comision_bancaria?: number;
  doc_pago_liquidacion?: string;
  observacion?: string;
};

export type PersonaLiquidacionInputUpdate = {
  numero?: string;
  id_etapa?: number;
  id_persona?: number;
  id_pago?: number;
  importe?: number;
  fecha_emision?: string;
  fecha_liquidacion?: string;
  descripcion?: string;
  id_moneda?: number;
  tipo_pago?: string;
  porcentaje_caguayo?: number;
  tributario?: number;
  gasto_empresa?: number;
  comision_bancaria?: number;
  doc_pago_liquidacion?: string;
  observacion?: string;
};

export interface PagoDetalle {
  id_pago_factura_servicio: number;
  monto: number;
  monto_disponible: number;
  fecha?: string;
  doc_traza?: string;
}

export interface FacturaPagoValidacion {
  id_factura_servicio?: number;
  codigo_factura?: string;
  importe: number;
  pagado: number;
  saldo: number;
  esta_pagada: boolean;
  pagos: PagoDetalle[];
}

export interface PersonaLiquidacionValidacion {
  puede_liquidar: boolean;
  id_etapa: number;
  id_persona: number;
  factura?: FacturaPagoValidacion;
  mensaje?: string;
}

export interface Certificacion {
  id_certificacion: number;
  nombre: string;
  id_etapa: number;
  constructor?: string;
  inversionista?: string;
  obra?: string;
  objeto_obra?: string;
  actividad?: string;
  descripcion?: string;
  observaciones?: string;
  fecha?: string;
  a_cobrar: number;
  impuesto_venta_onat?: number;
  facturado?: boolean;
}

export interface CertificacionCreate {
  nombre: string;
  id_etapa: number;
  constructor?: string;
  inversionista?: string;
  obra?: string;
  objeto_obra?: string;
  actividad?: string;
  descripcion?: string;
  observaciones?: string;
  fecha?: string;
  a_cobrar?: number;
  impuesto_venta_onat?: number;
  facturado?: boolean;
}

export interface CertificacionUpdate {
  nombre?: string;
  id_etapa?: string;
  constructor?: string;
  inversionista?: string;
  obra?: string;
  objeto_obra?: string;
  actividad?: string;
  descripcion?: string;
  observaciones?: string;
  fecha?: string;
  a_cobrar?: number;
  impuesto_venta_onat?: number;
}
