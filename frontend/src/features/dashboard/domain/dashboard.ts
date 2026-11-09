/** Entidades y puertos del panel principal. Sin React ni HTTP. */

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

export interface ProductoVendido {
  id_producto: number;
  nombre: string;
  cantidad_vendida: number;
  monto_total: number;
  porcentaje: number;
}

/** Proyección de venta que necesita el panel; no obliga a la entidad completa. */
export interface VentaReciente {
  id_venta: number;
  total: number;
  estado: 'PENDIENTE' | 'COMPLETADA' | 'ANULADA';
  fecha: string;
  cliente?: { nombre: string } | null;
}

/** Proyección de cliente que necesita el panel. */
export interface ClienteReciente {
  id_cliente: number;
  nombre: string;
  fecha_registro: string;
}

export interface ResumenDashboard {
  total_productos: number;
  total_ventas: number;
  total_clientes: number;
  total_categorias: number;
  total_monedas: number;

  ventas_hoy: number;
  ventas_hoy_cantidad: number;
  ventas_ayer: number;
  ventas_crecimiento_porcentaje: number;

  ventas_pendientes: number;
  ventas_completadas: number;
  ventas_anuladas: number;
  ticket_promedio: number;

  productos_stock_bajo: ProductoStockBajo[];
  productos_agotados: number;
  valor_inventario_compra: number;
  valor_inventario_venta: number;

  ultimas_ventas: VentaReciente[];
  clientes_recientes: ClienteReciente[];
  top_productos: ProductoVendido[];
}

export interface TendenciasVentas {
  fechas: string[];
  montos: number[];
  cantidades: number[];
  periodo: string;
}

export interface TendenciasMovimientos {
  fechas: string[];
  recepciones: number[];
  mermas: number[];
  donaciones: number[];
  devoluciones: number[];
  periodo: string;
}

/** Puerto de datos del dashboard. La UI solo conoce esta interfaz. */
export interface DashboardRepositorio {
  obtenerEstadisticas(): Promise<ResumenDashboard>;
  obtenerTendenciasVentas(dias?: number): Promise<TendenciasVentas>;
  obtenerTendenciasMovimientos(dias?: number): Promise<TendenciasMovimientos>;
}
