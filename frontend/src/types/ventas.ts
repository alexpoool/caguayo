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
}

export interface ClienteUpdate {
  nombre?: string;
  telefono?: string;
  email?: string;
  cedula_rif?: string;
  direccion?: string;
  activo?: boolean;
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
