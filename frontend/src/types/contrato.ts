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
  codigo?: string;
}

export interface ContratoWithDetails extends Contrato {
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
}

export interface Suplemento {
  id_suplemento: number;
  id_contrato: number;
  nombre: string;
  id_estado: number;
  fecha: string;
  monto: number;
  documento?: string;
  codigo?: string;
}

export interface SuplementoWithDetails extends Suplemento {
  estado?: EstadoContrato;
}

export interface SuplementoCreate {
  id_contrato: number;
  nombre: string;
  id_estado: number;
  fecha: string;
  monto?: number;
  documento?: string;
}

export interface SuplementoUpdate {
  id_contrato?: number;
  nombre?: string;
  id_estado?: number;
  fecha?: string;
  monto?: number;
  documento?: string;
}

export interface ItemAnexo {
  id_item_anexo: number;
  id_anexo: number;
  id_producto: number;
  cantidad: number;
  precio_compra: number;
  precio_venta: number;
  id_moneda: number;
  producto?: ProductoSimple;
}

export interface ItemAnexoCreate {
  id_producto: number;
  cantidad: number;
  precio_venta: number;
  id_moneda: number;
}

export interface Anexo {
  id_anexo: number;
  id_convenio: number;
  nombre_anexo: string;
  fecha: string;
  codigo_anexo?: string;
  numero_anexo?: string;
  id_dependencia?: number | null;
  comision?: number;
  id_moneda?: number | null;
}

export interface AnexoWithDetails extends Anexo {
  items: ItemAnexo[];
  dependencia?: DependenciaSimple;
  convenios?: {
    id_convenio: number;
    nombre_convenio: string;
  };
}

export interface AnexoCreate {
  id_convenio: number;
  nombre_anexo: string;
  fecha: string;
  id_dependencia?: number;
  id_moneda?: number;
  comision?: number;
  items: ItemAnexoCreate[];
}

export interface ItemFactura {
  id_item_factura: number;
  id_factura: number;
  id_producto: number;
  cantidad: number;
  precio_compra: number;
  precio_venta: number;
  id_moneda: number;
  producto?: ProductoSimple;
}

export interface ItemFacturaCreate {
  id_producto: number;
  cantidad: number;
  precio_venta: number;
  id_moneda: number;
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
  id_dependencia?: number;
  id_moneda?: number;
}

export interface FacturaWithDetails extends Factura {
  items: ItemFactura[];
}

export interface FacturaCreate {
  id_contrato: number;
  codigo_factura: string;
  descripcion?: string;
  observaciones?: string;
  fecha: string;
  monto?: number;
  pago_actual?: number;
  id_dependencia?: number;
  id_moneda?: number;
  items: ItemFacturaCreate[];
}

export interface FacturaUpdate {
  id_contrato?: number;
  codigo_factura?: string;
  descripcion?: string;
  observaciones?: string;
  fecha?: string;
  monto?: number;
  pago_actual?: number;
  id_dependencia?: number;
  items?: ItemFacturaCreate[];
}

export interface DependenciaSimple {
  id_dependencia: number;
  nombre: string;
}

export interface ItemVentaEfectivo {
  id_item_venta_efectivo: number;
  id_venta_efectivo: number;
  id_producto: number;
  cantidad: number;
  precio_compra: number;
  precio_venta: number;
  id_moneda: number;
  producto?: ProductoSimple;
}

export interface ItemVentaEfectivoCreate {
  id_producto: number;
  cantidad: number;
  precio_venta: number;
  id_moneda: number;
}

export interface VentaEfectivo {
  id_venta_efectivo: number;
  slip: string;
  fecha: string;
  id_dependencia: number;
  cajero: string;
  monto: number;
  id_moneda?: number;
  codigo?: string;
}

export interface VentaEfectivoWithDetails extends VentaEfectivo {
  items: ItemVentaEfectivo[];
  dependencia?: DependenciaSimple;
}

export interface VentaEfectivoCreate {
  slip: string;
  fecha: string;
  id_dependencia: number;
  cajero: string;
  monto?: number;
  id_moneda?: number;
  items: ItemVentaEfectivoCreate[];
}

export interface VentaEfectivoUpdate {
  slip?: string;
  fecha?: string;
  id_dependencia?: number;
  cajero?: string;
  monto?: number;
  items?: ItemVentaEfectivoCreate[];
}
