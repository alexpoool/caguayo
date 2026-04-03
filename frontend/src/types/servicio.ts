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
}

export interface SolicitudServicioUpdate {
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
  fecha_solicitud?: string;
  fecha_entrega?: string;
  estado?: string;
  observaciones?: string;
  material_asumido_x?: boolean;
  id_usuario?: number;
  aprobado?: boolean;
}

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
  pago_completado: boolean;
}

export interface PersonaEtapaCreate {
  id_etapa: number;
  id_persona: number;
  cobro?: number;
  id_moneda?: number;
  liquidada?: boolean;
  pago_completado?: boolean;
}

export interface FacturaServicio {
  id_factura_servicio: number;
  id_etapa?: number;
  alcance?: string;
  codigo_factura?: string;
  id_moneda?: number;
  fecha?: string;
  descripcion?: string;
  cantidad: number;
  precio: number;
  observaciones?: string;
  id_usuario?: number;
}

export interface FacturaServicioCreate {
  id_etapa?: number;
  alcance?: string;
  codigo_factura?: string;
  id_moneda?: number;
  fecha?: string;
  descripcion?: string;
  cantidad?: number;
  precio?: number;
  observaciones?: string;
  id_usuario?: number;
}

export interface FacturaServicioUpdate {
  id_etapa?: number;
  alcance?: string;
  codigo_factura?: string;
  id_moneda?: number;
  fecha?: string;
  descripcion?: string;
  cantidad?: number;
  precio?: number;
  observaciones?: string;
  id_usuario?: number;
}

export interface PagoFacturaServicio {
  id_pago_factura_servicio: number;
  id_factura_servicio?: number;
  monto: number;
  id_moneda?: number;
  fecha?: string;
  doc_traza?: string;
  doc_factura?: string;
}

export interface PagoFacturaServicioCreate {
  id_factura_servicio: number;
  monto?: number;
  id_moneda?: number;
  fecha?: string;
  doc_traza?: string;
  doc_factura?: string;
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
  importe: number;
  porciento_gestion: number;
  porciento_empresa: number;
  devengado: number;
  tributario: number;
  comision_bancaria: number;
  neto_pagar: number;
  id_tipo_concepto?: number;
  doc_pago_liquidacion?: string;
  gasto_empresa: number;
  observacion?: string;
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
  porciento_gestion?: number;
  porciento_empresa?: number;
  devengado?: number;
  tributario?: number;
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
  importe?: number;
  porciento_gestion?: number;
  porciento_empresa?: number;
  devengado?: number;
  tributario?: number;
  comision_bancaria?: number;
  neto_pagar?: number;
  id_tipo_concepto?: number;
  doc_pago_liquidacion?: string;
  gasto_empresa?: number;
  observacion?: string;
}
