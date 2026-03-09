export interface TipoContrato {
  id_tipo_contrato: number;
  nombre: string;
  descripcion?: string;
}

export interface TipoContratoCreate {
  nombre: string;
  descripcion?: string;
}

export interface TipoContratoUpdate {
  nombre?: string;
  descripcion?: string;
}

export interface EstadoContrato {
  id_estado_contrato: number;
  nombre: string;
  descripcion?: string;
}

export interface EstadoContratoCreate {
  nombre: string;
  descripcion?: string;
}

export interface EstadoContratoUpdate {
  nombre?: string;
  descripcion?: string;
}

export interface Moneda {
  id_moneda: number;
  nombre: string;
  simbolo: string;
}

export interface ClienteSimple {
  id_cliente: number;
  nombre: string;
  cedula_rif: string;
}

export interface ProductoSimple {
  id_producto: number;
  nombre: string;
  precio_venta: number;
}

export interface ContratoProducto {
  id_contrato_producto: number;
  id_producto: number;
  cantidad: number;
  producto?: ProductoSimple;
}

export interface Contrato {
  id_contrato: number;
  id_cliente: number;
  nombre: string;
  proforma?: string;
  id_estado: number;
  fecha: string;
  vigencia: string;
  id_tipo_contrato: number;
  id_moneda: number;
  monto: number;
  documento_final?: string;
}

export interface ContratoWithDetails extends Contrato {
  productos: ContratoProducto[];
  estado?: EstadoContrato;
  tipo_contrato?: TipoContrato;
  moneda?: Moneda;
  cliente?: ClienteSimple;
}

export interface ContratoCreate {
  id_cliente: number;
  nombre: string;
  proforma?: string;
  id_estado: number;
  fecha: string;
  vigencia: string;
  id_tipo_contrato: number;
  id_moneda: number;
  monto?: number;
  documento_final?: string;
  productos: { id_producto: number; cantidad: number }[];
}

export interface ContratoUpdate {
  id_cliente?: number;
  nombre?: string;
  proforma?: string;
  id_estado?: number;
  fecha?: string;
  vigencia?: string;
  id_tipo_contrato?: number;
  id_moneda?: number;
  monto?: number;
  documento_final?: string;
  productos?: { id_producto: number; cantidad: number }[];
}

export interface SuplementoProducto {
  id_suplemento_producto: number;
  id_producto: number;
  cantidad: number;
  producto?: ProductoSimple;
}

export interface Suplemento {
  id_suplemento: number;
  id_contrato: number;
  nombre: string;
  id_estado: number;
  fecha: string;
  monto: number;
  documento?: string;
}

export interface SuplementoWithDetails extends Suplemento {
  productos: SuplementoProducto[];
  estado?: EstadoContrato;
}

export interface SuplementoCreate {
  id_contrato: number;
  nombre: string;
  id_estado: number;
  fecha: string;
  monto?: number;
  documento?: string;
  productos: { id_producto: number; cantidad: number }[];
}

export interface SuplementoUpdate {
  id_contrato?: number;
  nombre?: string;
  id_estado?: number;
  fecha?: string;
  monto?: number;
  documento?: string;
  productos?: { id_producto: number; cantidad: number }[];
}

export interface FacturaProducto {
  id_factura_producto: number;
  id_producto: number;
  cantidad: number;
  producto?: ProductoSimple;
}

export interface Factura {
  id_factura: number;
  id_contrato: number;
  codigo_factura: string;
  descripcion?: string;
  observaciones?: string;
  fecha: string;
  monto: number;
  pago_actual: number;
}

export interface FacturaWithDetails extends Factura {
  productos: FacturaProducto[];
}

export interface FacturaCreate {
  id_contrato: number;
  codigo_factura: string;
  descripcion?: string;
  observaciones?: string;
  fecha: string;
  monto?: number;
  pago_actual?: number;
  productos: { id_producto: number; cantidad: number }[];
}

export interface FacturaUpdate {
  id_contrato?: number;
  codigo_factura?: string;
  descripcion?: string;
  observaciones?: string;
  fecha?: string;
  monto?: number;
  pago_actual?: number;
  productos?: { id_producto: number; cantidad: number }[];
}

export interface DependenciaSimple {
  id_dependencia: number;
  nombre: string;
}

export interface VentaEfectivoProducto {
  id_venta_efectivo_producto: number;
  id_producto: number;
  cantidad: number;
  producto?: ProductoSimple;
}

export interface VentaEfectivo {
  id_venta_efectivo: number;
  slip: string;
  fecha: string;
  id_dependencia: number;
  cajero: string;
  monto: number;
}

export interface VentaEfectivoWithDetails extends VentaEfectivo {
  productos: VentaEfectivoProducto[];
  dependencia?: DependenciaSimple;
}

export interface VentaEfectivoCreate {
  slip: string;
  fecha: string;
  id_dependencia: number;
  cajero: string;
  monto?: number;
  productos: { id_producto: number; cantidad: number }[];
}

export interface VentaEfectivoUpdate {
  slip?: string;
  fecha?: string;
  id_dependencia?: number;
  cajero?: string;
  monto?: number;
  productos?: { id_producto: number; cantidad: number }[];
}
