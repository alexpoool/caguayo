// ============== CONTRATO ==============
export interface Contrato {
  id_contrato: number;
  id_cliente: number;
  nombre_contrato: string;
  proforma?: string;
  estado: 'activo' | 'cancelado' | 'finalizado';
  fecha: string;
  vigencia: string;
  tipo?: string;
  id_moneda: number;
  productos?: Record<string, any>;
  monto?: number;
  documento_final?: string;
}

export interface ContratoCreate {
  id_cliente: number;
  nombre_contrato: string;
  proforma?: string;
  estado: 'activo' | 'cancelado' | 'finalizado';
  fecha: string;
  vigencia: string;
  tipo?: string;
  id_moneda: number;
  productos?: Record<string, any>;
  monto?: number;
  documento_final?: string;
}

export interface ContratoUpdate {
  id_cliente?: number;
  nombre_contrato?: string;
  proforma?: string;
  estado?: 'activo' | 'cancelado' | 'finalizado';
  fecha?: string;
  vigencia?: string;
  tipo?: string;
  id_moneda?: number;
  productos?: Record<string, any>;
  monto?: number;
  documento_final?: string;
}

// ============== CONTRATO PRODUCTO ==============
export interface ContratoProducto {
  id_contrato_producto: number;
  id_contrato: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
}

export interface ContratoProductoCreate {
  id_contrato: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
}

// ============== SUPLEMENTO ==============
export interface Suplemento {
  id_suplemento: number;
  id_contrato: number;
  nombre_suplemento: string;
  estado: 'activo' | 'cancelado' | 'finalizado';
  fecha: string;
  id_moneda: number;
  productos?: Record<string, any>;
  monto?: number;
  documento?: string;
}

export interface SuplementoCreate {
  id_contrato: number;
  nombre_suplemento: string;
  estado: 'activo' | 'cancelado' | 'finalizado';
  fecha: string;
  id_moneda: number;
  productos?: Record<string, any>;
  monto?: number;
  documento?: string;
}

export interface SuplementoUpdate {
  id_contrato?: number;
  nombre_suplemento?: string;
  estado?: 'activo' | 'cancelado' | 'finalizado';
  fecha?: string;
  id_moneda?: number;
  productos?: Record<string, any>;
  monto?: number;
  documento?: string;
}

// ============== SUPLEMENTO PRODUCTO ==============
export interface SuplementoProducto {
  id_suplemento_producto: number;
  id_suplemento: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
}

export interface SuplementoProductoCreate {
  id_suplemento: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
}

// ============== FACTURA ==============
export interface Factura {
  id_factura: number;
  id_contrato: number;
  codigo: string;
  descripcion?: string;
  observaciones?: string;
  fecha: string;
  id_moneda: number;
  productos?: Record<string, any>;
  monto?: number;
}

export interface FacturaCreate {
  id_contrato: number;
  codigo: string;
  descripcion?: string;
  observaciones?: string;
  fecha: string;
  id_moneda: number;
  productos?: Record<string, any>;
  monto?: number;
}

export interface FacturaUpdate {
  id_contrato?: number;
  codigo?: string;
  descripcion?: string;
  observaciones?: string;
  fecha?: string;
  id_moneda?: number;
  productos?: Record<string, any>;
  monto?: number;
}

// ============== FACTURA PRODUCTO ==============
export interface FacturaProducto {
  id_factura_producto: number;
  id_factura: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
}

export interface FacturaProductoCreate {
  id_factura: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
}

// ============== PAGO ==============
export interface Pago {
  id_pago: number;
  id_factura: number;
  numero_cheque_transferencia?: string;
  monto: number;
  numero_factura_RODAS: string;
  fecha: string;
  id_moneda: number;
}

export interface PagoCreate {
  id_factura: number;
  numero_cheque_transferencia?: string;
  monto: number;
  numero_factura_RODAS: string;
  fecha: string;
  id_moneda: number;
}

export interface PagoUpdate {
  id_factura?: number;
  numero_cheque_transferencia?: string;
  monto?: number;
  numero_factura_RODAS?: string;
  fecha?: string;
  id_moneda?: number;
}

// ============== VENTA EFECTIVO ==============
export interface VentaEfectivo {
  id_venta_efectivo: number;
  slip?: string;
  fecha: string;
  id_dependencia: number;
  id_producto?: number;
  cajero: string;
  productos?: Record<string, any>;
  monto?: number;
}

export interface VentaEfectivoCreate {
  slip?: string;
  fecha: string;
  id_dependencia: number;
  id_producto?: number;
  cajero: string;
  productos?: Record<string, any>;
  monto?: number;
}

export interface VentaEfectivoUpdate {
  slip?: string;
  fecha?: string;
  id_dependencia?: number;
  id_producto?: number;
  cajero?: string;
  productos?: Record<string, any>;
  monto?: number;
}

// ============== VENTA EFECTIVO PRODUCTO ==============
export interface VentaEfectivoProducto {
  id_venta_efectivo_producto: number;
  id_venta_efectivo: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
}

export interface VentaEfectivoProductoCreate {
  id_venta_efectivo: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
}
