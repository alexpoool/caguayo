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

import type { Provincia, Municipio } from './ubicacion';

// Tipos para Cliente
export interface Cliente {
  id_cliente: number;
  numero_cliente: string;
  nombre: string;
  tipo_persona: 'NATURAL' | 'JURIDICA' | 'TCP';
  cedula_rif: string;
  telefono?: string;
  email?: string;
  fax?: string;
  web?: string;
  id_provincia?: number;
  id_municipio?: number;
  codigo_postal?: string;
  direccion: string;
  tipo_relacion: 'CLIENTE' | 'PROVEEDOR' | 'AMBAS';
  estado: 'ACTIVO' | 'INACTIVO';
  fecha_registro: string;
  activo: boolean;
  provincia?: Provincia;
  municipio?: Municipio;
}

export interface ClienteWithVentas extends Cliente {
  ventas: Venta[];
}

export interface ClienteCreate {
  numero_cliente?: string;
  nombre: string;
  tipo_persona: 'NATURAL' | 'JURIDICA' | 'TCP';
  cedula_rif?: string;
  telefono?: string;
  email?: string;
  fax?: string;
  web?: string;
  id_provincia?: number;
  id_municipio?: number;
  codigo_postal?: string;
  direccion?: string;
  tipo_relacion?: 'CLIENTE' | 'PROVEEDOR' | 'AMBAS';
  estado?: 'ACTIVO' | 'INACTIVO';
  fecha_registro?: string;
  activo?: boolean;
}

export interface ClienteUpdate {
  numero_cliente?: string;
  nombre?: string;
  tipo_persona?: 'NATURAL' | 'JURIDICA' | 'TCP';
  cedula_rif?: string;
  telefono?: string;
  email?: string;
  fax?: string;
  web?: string;
  id_provincia?: number;
  id_municipio?: number;
  codigo_postal?: string;
  direccion?: string;
  tipo_relacion?: 'CLIENTE' | 'PROVEEDOR' | 'AMBAS';
  estado?: 'ACTIVO' | 'INACTIVO';
  fecha_registro?: string;
  activo?: boolean;
}

// Tipos para Persona Natural
export interface ClienteNatural {
  id_cliente: number;
  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string;
  carnet_identidad: string;
  codigo_expediente?: string;
  numero_registro?: string;
  catalogo?: string;
  es_trabajador: boolean;
  ocupacion?: string;
  centro_trabajo?: string;
  correo_trabajo?: string;
  direccion_trabajo?: string;
  telefono_trabajo?: string;
  en_baja: boolean;
  fecha_baja?: string;
  vigencia?: string;
}

export interface ClienteNaturalCreate {
  id_cliente: number;
  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string;
  carnet_identidad: string;
  codigo_expediente?: string;
  numero_registro?: string;
  catalogo?: string;
  es_trabajador?: boolean;
  ocupacion?: string;
  centro_trabajo?: string;
  correo_trabajo?: string;
  direccion_trabajo?: string;
  telefono_trabajo?: string;
  en_baja?: boolean;
  fecha_baja?: string;
  vigencia?: string;
}

// Tipos para TCP (Trabajo por Cuenta Propia)
export interface ClienteTCP {
  id_cliente: number;
  nombre: string;
  primer_apellido: string;
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

// Tipos para Persona Jurídica
export interface ClienteJuridica {
  id_cliente: number;
  codigo_reup: string;
  id_tipo_entidad?: number;
}

export interface ClienteJuridicaCreate {
  id_cliente: number;
  codigo_reup: string;
  id_tipo_entidad?: number;
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
  id_moneda?: number;
  titular: string;
  banco: string;
  sucursal?: number;
  numero_cuenta?: string;
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
