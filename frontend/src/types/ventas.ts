// Tipos para Detalle de Venta
export interface DetalleVenta {
  id_detalle: number;
  id_venta: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto?: Producto;
}

export interface DetalleVentaCreate {
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
}

// Tipos para Venta
export interface Venta {
  id_venta: number;
  id_cliente: number;
  fecha: string;
  total: number;
  estado: 'PENDIENTE' | 'COMPLETADA' | 'ANULADA';
  observacion?: string;
  fecha_registro: string;
  fecha_actualizacion?: string;
  cliente?: Cliente;
  detalles: DetalleVenta[];
}

export interface VentaCreate {
  id_cliente: number;
  fecha?: string;
  observacion?: string;
  detalles: DetalleVentaCreate[];
}

export interface VentaUpdate {
  id_cliente?: number;
  fecha?: string;
  observacion?: string;
  estado?: 'PENDIENTE' | 'COMPLETADA' | 'ANULADA';
}

// Tipos para Cliente
export interface Cliente {
  id_cliente: number;
  nombre: string;
  telefono?: string;
  email?: string;
  cedula_rif?: string;
  direccion?: string;
  activo: boolean;
  fecha_registro: string;
  fax?: string;
  web?: string;
  numero_cliente?: string;
  codigo_postal?: string;
  nit?: string;
  id_provincia?: number;
  id_municipio?: number;
  id_tipo_cliente?: number;
}

export interface ClienteWithVentas extends Cliente {
  ventas: Venta[];
}

export interface ClienteCreate {
  nombre: string;
  telefono?: string;
  email?: string;
  cedula_rif?: string;
  direccion?: string;
  activo?: boolean;
  tipo_relacion?: string;
  fax?: string;
  web?: string;
  numero_cliente?: string;
  codigo_postal?: string;
  nit?: string;
  id_provincia?: number;
  id_municipio?: number;
  id_tipo_cliente?: number;
}

export interface ClienteUpdate {
  nombre?: string;
  telefono?: string;
  email?: string;
  cedula_rif?: string;
  direccion?: string;
  activo?: boolean;
  tipo_relacion?: string;
  fax?: string;
  web?: string;
  numero_cliente?: string;
  codigo_postal?: string;
  nit?: string;
  id_provincia?: number;
  id_municipio?: number;
  id_tipo_cliente?: number;
}

// Tipos para Persona Natural
export interface ClienteNatural {
  id_cliente_natural?: number;
  id_cliente: number;
  codigo_expediente?: string;
  numero_registro?: string;
  carnet_identidad?: string;
  es_trabajador?: boolean;
  ocupacion?: string;
  centro_laboral?: string;
  centro_trabajo?: string;
  correo_trabajo?: string;
  direccion_trabajo?: string;
  telefono_trabajo?: string;
  catalogo?: string;
  baja?: boolean;
  fecha_baja?: string;
  vigencia?: string;
  codigo_reeup?: string;
  id_tipo_entidad?: number;
}

export interface ClienteNaturalCreate {
  id_cliente: number;
  codigo_expediente?: string;
  numero_registro?: string;
  carnet_identidad?: string;
  es_trabajador?: boolean;
  ocupacion?: string;
  centro_laboral?: string;
  centro_trabajo?: string;
  correo_trabajo?: string;
  direccion_trabajo?: string;
  telefono_trabajo?: string;
  catalogo?: string;
  baja?: boolean;
  fecha_baja?: string;
  vigencia?: string;
  codigo_reeup?: string;
  id_tipo_entidad?: number;
}

// Tipos para TCP (Trabajo por Cuenta Propia)
export interface ClienteTCP {
  id_cliente_tcp?: number;
  id_cliente: number;
  nombre: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  direccion?: string;
  numero_registro_proyecto?: string;
  fecha_aprobacion?: string;
}

export interface ClienteTCPCreate {
  id_cliente: number;
  nombre: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  direccion?: string;
  numero_registro_proyecto?: string;
  fecha_aprobacion?: string;
}

// Tipos para Tipo Entidad
export interface TipoEntidad {
  id_tipo_entidad: number;
  nombre: string;
}

// Tipos para Cuenta Bancaria
export interface Cuenta {
  id_cuenta?: number;
  id_cliente?: number;
  id_dependencia?: number;
  id_tipo_cuenta?: number;
  titular: string;
  banco: string;
  sucursal?: number;
  direccion: string;
}

// Tipos auxiliares (reutilizados de otros archivos)
export interface Producto {
  id_producto: number;
  nombre: string;
  descripcion?: string;
  precio_venta: number;
  precio_minimo: number;
  stock: number;
}
