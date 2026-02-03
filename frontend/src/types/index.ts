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
  id_subcategoria: number;
  nombre: string;
  descripcion?: string;
  moneda_compra: number;
  precio_compra: number;
  moneda_venta: number;
  precio_venta: number;
  precio_minimo: number;
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
  confirmacion: boolean;
  tipo_movimiento?: TipoMovimiento;
  producto?: Productos;
}

export interface TipoMovimiento {
  id_tipo_movimiento: number;
  tipo: string;
  factor: number;
}

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
  id_subcategoria: number;
  nombre: string;
  descripcion?: string;
  moneda_compra: number;
  precio_compra: number;
  moneda_venta: number;
  precio_venta: number;
  precio_minimo: number;
}

export interface ProductosUpdate {
  id_subcategoria?: number;
  nombre?: string;
  descripcion?: string;
  moneda_compra?: number;
  precio_compra?: number;
  moneda_venta?: number;
  precio_venta?: number;
  precio_minimo?: number;
}

export interface CategoriasCreate {
  nombre: string;
  descripcion?: string;
}

export interface CategoriasUpdate {
  nombre?: string;
  descripcion?: string;
}