export interface Pago {
  id_pago: number;
  id_factura: number;
  fecha: string;
  monto: number;
  id_moneda?: number;
  tipo_pago: string;
  referencia?: string;
  observaciones?: string;
}

export interface PagoCreate {
  id_factura: number;
  fecha: string;
  monto: number;
  id_moneda?: number;
  tipo_pago: string;
  referencia?: string;
  observaciones?: string;
}
