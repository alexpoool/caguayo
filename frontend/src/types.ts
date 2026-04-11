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

  stock_minimo?: number;
  punto_pedido?: number;
  lead_time_dias?: number;
  clasificacion_abc?: string;
  subcategoria?: {
    id_subcategoria: number;
    nombre: string;
    descripcion?: string;
  };
}

export interface ProductosCreate {
  id_subcategoria: number;
  nombre: string;
  descripcion?: string;
  moneda_compra: number;
  precio_compra: number;
  moneda_venta: number;
  precio_venta: number;
  precio_minimo: number;
  stock_minimo?: number;
  punto_pedido?: number;
  lead_time_dias?: number;
  clasificacion_abc?: string;
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
  stock_minimo?: number;
  punto_pedido?: number;
  lead_time_dias?: number;
  clasificacion_abc?: string;
}

export interface Categorias {
  id_categoria: number;
  nombre: string;
  descripcion?: string;
  productos?: Productos[];
}

export interface CategoriasCreate {
  nombre: string;
  descripcion?: string;
}

export interface CategoriasUpdate {
  nombre?: string;
  descripcion?: string;
}

export interface DashboardStats {
  total_productos: number;
  total_ventas: number;
  total_movimientos: number;
  total_categorias: number;
  ventas_mes_actual: number;
  productos_stock_bajo: Array<{
    id_producto: number;
    nombre: string;
    precio_venta: number;
  }>;
}

export interface Dependencia {
  id_dependencia: number;
  nombre: string;
};