import type { Venta, Cliente } from './ventas';

export interface ProductoStockBajo {
  id_producto: number;
  nombre: string;
  descripcion: string | null;
  precio_compra: number;
  precio_venta: number;
  precio_minimo: number;
  cantidad: number;
  id_subcategoria: number;
  subcategoria?: {
    id_subcategoria: number;
    nombre: string;
    id_categoria: number;
  } | null;
}

export interface ProductoStats {
  id_producto: number;
  nombre: string;
  cantidad_vendida: number;
  monto_total: number;
  porcentaje: number;
}

export interface DashboardStats {
  // Conteos principales
  total_productos: number;
  total_ventas: number;
  total_clientes: number;
  total_categorias: number;
  total_monedas: number;
  
  // Ventas de hoy (prioridad)
  ventas_hoy: number;
  ventas_hoy_cantidad: number;
  
  // Comparativas
  ventas_ayer: number;
  ventas_crecimiento_porcentaje: number;
  
  // Estados de ventas
  ventas_pendientes: number;
  ventas_completadas: number;
  ventas_anuladas: number;
  
  // Métricas
  ticket_promedio: number;
  
  // Inventario
  productos_stock_bajo: ProductoStockBajo[];
  productos_agotados: number;
  valor_inventario_compra: number;
  valor_inventario_venta: number;
  
  // Listas para tablas
  ultimas_ventas: Venta[];
  clientes_recientes: Cliente[];
  top_productos: ProductoStats[];
}

export interface VentasTrends {
  fechas: string[];
  montos: number[];
  cantidades: number[];
  periodo: string;
}

export interface MovimientosTrends {
  fechas: string[];
  recepciones: number[];
  mermas: number[];
  donaciones: number[];
  devoluciones: number[];
  periodo: string;
}
