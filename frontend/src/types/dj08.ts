// Tipos de la DJ-08 (espejo de backend/src/dto/dj08_dto.py)

export interface ActividadEconomica {
  id_actividad: number;
  codigo: string;
  nombre: string;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string;
  ingresos: number;
  gastos: number;
  orden: number;
}

export interface ActividadEconomicaInput {
  codigo: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  ingresos: number;
  gastos: number;
  orden: number;
}

export interface Tributo {
  id_tributo: number;
  nombre: string;
  importe: number;
}

export interface TributoInput {
  nombre: string;
  importe: number;
}

export interface DJ08Input {
  ano_fiscal: number;
  opera_en_municipio: boolean;
  municipio_donde_opera?: string | null;
  codigo_tributo?: string | null;
  codigo_banco?: string | null;
  minimo_exento: number;
  contribucion_restauracion: number;
  pagos_arrendamiento: number;
  importe_exonerado_reparaciones: number;
  otros_descuentos: number;
  bonificacion_mfp: number;
  cuotas_mensuales: number;
  otros_pagos_anticipados: number;
  total_retenciones: number;
  bonificaciones_autorizadas: number;
  impuesto_declaracion_rectificada: number;
  pago_declaracion_anterior: number;
  bonificacion_pronto_pago: number;
  impuesto_pagado_dj_ano: number;
  recargo_mora: number;
  fecha_declaracion?: string | null;
  observaciones?: string | null;
}

export interface EscalaFila {
  desde: number;
  hasta: number | null;
  base_imponible: number;
  tipo: number;
  importe: number;
  fila: number;
}

export interface DeclaracionJurada {
  id_declaracion: number;
  codigo: string;
  id_usuario: number | null;
  id_dependencia: number | null;
  estado: 'BORRADOR' | 'PRESENTADA';
  fecha_creacion: string;
  ano_fiscal: number;
  fecha_declaracion: string | null;
  observaciones: string | null;
  total_ingresos: number;
  total_gastos: number;
  total_tributos: number;
  base_imponible: number;
  impuesto_escala: number;
  impuesto_pagar: number;
  total_devolver: number;
  diferencia_pagar: number;
  diferencia_devolver: number;
  total_pagar: number;
}

export interface DJ08Calculado {
  nit: string;
  nombre: string;
  direccion: string;
  municipio: string;
  provincia: string;
  codigo_postal: string;
  telefono: string;
  email: string;
  entrada: DJ08Input;
  actividades: ActividadEconomica[];
  total_ingresos: number;
  total_gastos: number;
  total_tributos: number;
  base_imponible: number;
  impuesto_escala: number;
  impuesto_pagar: number;
  total_devolver: number;
  diferencia_pagar: number;
  diferencia_devolver: number;
  total_pagar: number;
  tributos: Tributo[];
  escala: EscalaFila[];
  escala_total_base: number;
  escala_total_importe: number;
}
