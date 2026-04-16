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
  cantidad?: number;
  stock?: number;
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
  id_producto: number;
  cantidad: number;
  fecha: string;
  observacion?: string;
  estado: string;
  codigo?: string;
  id_cliente?: number;
  precio_compra?: number;
  id_moneda_compra?: number;
  precio_venta?: number;
  id_moneda_venta?: number;
  tipo_movimiento?: TipoMovimiento;
  producto?: Productos;
  dependencia?: {
    id_dependencia: number;
    nombre: string;
  };
  cliente?: {
    id_cliente: number;
    nombre: string;
  };
}

export interface MovimientoCreate {
  id_tipo_movimiento: number;
  id_dependencia: number;
  id_producto: number;
  cantidad: number;
  fecha: string;
  observacion?: string;
  estado?: string;
  codigo?: string;
  id_cliente?: number;
  precio_compra?: number;
  moneda_compra?: number;
  precio_venta?: number;
  moneda_venta?: number;
  id_contrato?: number;
  id_factura?: number;
  id_anexo?: number;
}

export interface TipoMovimiento {
  id_tipo_movimiento: number;
  tipo: string;
  factor: number;
}

export interface TipoProveedor {
  id_tipo_proveedor: number;
  nombre: string;
  descripcion?: string;
}

export interface TipoProveedorCreate {
  nombre: string;
  descripcion?: string;
}

export interface TipoProveedorUpdate {
  nombre?: string;
  descripcion?: string;
}

export interface TipoConvenio {
  id_tipo_convenio: number;
  nombre: string;
  descripcion?: string;
}

export interface TipoConvenioCreate {
  nombre: string;
  descripcion?: string;
}

export interface TipoConvenioUpdate {
  nombre?: string;
  descripcion?: string;
}

export interface ClienteSimple {
  id_cliente: number;
  nombre: string;
}

export interface Convenio {
  id_convenio: number;
  codigo_convenio?: string;
  id_cliente: number;
  nombre_convenio: string;
  fecha: string;
  vigencia: string;
  id_tipo_convenio: number;
  cliente?: ClienteSimple;
  tipo_convenio?: TipoConvenio;
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
  dependencia_nombre?: string;
  id_producto?: number | null;
  id_moneda?: number | null;
  anexo_convenio?: {
    id_convenio: number;
    nombre_convenio: string;
    codigo_anexo?: string;
  };
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
  precio_compra?: number;
  id_anexo?: number;
  id_convenio?: number;
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
  cliente?: {
    id_cliente: number;
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

// Re-exportar tipos de contrato.ts
export * from './contrato';