// Tipos para las entidades de la base de datos

export interface Moneda {
  id_moneda: number;
  nombre: string;
  denominacion: string;
  simbolo: string;
}

export interface Categorias {
  id_categoria: number;
  nombre: string;
  descripcion?: string;
}

export interface Subcategorias {
  id_subcategoria: number;
  id_categoria: number;
  nombre: string;
  descripcion?: string;
  categoria?: Categorias;
}

export interface Productos {
  id_producto: number;
  codigo?: string;
  id_subcategoria: number;
  nombre: string;
  descripcion?: string;
  moneda_compra: number;
  precio_compra: number;
  moneda_venta: number;
  precio_venta: number;
  precio_minimo: number;
  // Campo calculado desde movimientos confirmados
  cantidad?: number;
  subcategoria?: Subcategorias;
  moneda_compra_rel?: Moneda;
  moneda_venta_rel?: Moneda;
}

export interface Ventas {
  id_venta: number;
  id_anexo: number;
  id_producto: number;
  codigo: string;
  cantidad: number;
  moneda_venta: number;
  monto: number;
  id_transaccion: number;
  id_liquidacion?: number;
  observacion?: string;
  confirmacion: boolean;
  fecha_registro: string;
  producto?: Productos;
  moneda_venta_rel?: Moneda;
}

export interface Movimiento {
  id_movimiento: number;
  id_tipo_movimiento: number;
  id_dependencia: number;
  id_anexo: number;
  id_producto: number;
  cantidad: number;
  fecha: string;
  observacion?: string;
  id_liquidacion?: number;
  estado: string;
  codigo?: string;
  // Nuevos campos
  id_convenio?: number;
  id_provedor?: number;
  precio_compra?: number;
  id_moneda_compra?: number;
  precio_venta?: number;
  id_moneda_venta?: number;
  tipo_movimiento?: TipoMovimiento;
  producto?: Productos;
}

export interface MovimientoCreate {
  id_tipo_movimiento: number;
  id_dependencia: number;
  id_anexo?: number;
  id_producto: number;
  cantidad: number;
  fecha: string;
  observacion?: string;
  id_liquidacion?: number;
  estado?: string;
  codigo?: string;
  // Nuevos campos
  id_convenio?: number;
  id_provedor?: number;
  precio_compra?: number;
  id_moneda_compra?: number;
  precio_venta?: number;
  id_moneda_venta?: number;
}

export interface TipoMovimiento {
  id_tipo_movimiento: number;
  tipo: string;
  factor: number;
}

export interface Provedor {
  id_provedores: number;
  id_tipo_provedor: number;
  nombre: string;
  email?: string;
  direccion?: string;
}

export interface Convenio {
  id_convenio: number;
  id_provedor: number;
  nombre_convenio: string;
  fecha: string;
  vigencia: string;
  id_tipo_convenio: number;
}

export interface Anexo {
  id_anexo: number;
  id_convenio: number;
  nombre_anexo: string;
  fecha: string;
  numero_anexo: string;
  id_dependencia: number;
  comision?: number;
}

// Dependencia se importa desde dependencia.ts

export interface DashboardStats {
  total_productos: number;
  total_ventas: number;
  total_movimientos: number;
  total_categorias: number;
  ventas_mes_actual: number;
  productos_stock_bajo: Productos[];
}

// Tipos para crear/actualizar
export interface ProductosCreate {
  codigo?: string;
  id_subcategoria: number;
  nombre: string;
  descripcion?: string;
  moneda_compra: number;
  precio_compra: number;
  moneda_venta: number;
  precio_venta: number;
  precio_minimo: number;
}

// Producto con cantidad disponible (para movimientos)
export interface ProductoConCantidad {
  id_producto: number;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  cantidad: number;
}

export interface ProductosUpdate {
  codigo?: string;
  id_subcategoria?: number;
  nombre?: string;
  descripcion?: string;
  moneda_compra?: number;
  precio_compra?: number;
  moneda_venta?: number;
  precio_venta?: number;
  precio_minimo?: number;
}

// Tipo para origen de recepción
export interface OrigenRecepcion {
  codigo: string;
  anio?: number;
  proveedor?: {
    id_provedor: number;
    nombre: string;
  };
  convenio?: {
    id_convenio: number;
    nombre: string;
  };
  anexo?: {
    id_anexo: number;
    nombre: string;
    numero: string;
  };
}

export interface CategoriasCreate {
  nombre: string;
  descripcion?: string;
}

export interface CategoriasUpdate {
  nombre?: string;
  descripcion?: string;
}

// Tipos para Subcategorias
export interface SubcategoriasCreate {
  id_categoria: number;
  nombre: string;
  descripcion?: string;
}

export interface SubcategoriasUpdate {
  id_categoria?: number;
  nombre?: string;
  descripcion?: string;
}

// Re-exportar tipos de ventas.ts
export * from './ventas';

// Re-exportar tipos de dependencia.ts
export * from './dependencia';