import type { Dependencia } from '@/types/dependencia';
import type {
  Categorias as Categoria,
  Movimiento,
  MovimientoCreate,
  OrigenRecepcion,
  ProductoConCantidad,
  Productos as Producto,
  ProductosCreate as ProductoCreate,
  ProductosUpdate as ProductoUpdate,
  Subcategorias as Subcategoria,
  TipoMovimiento,
  Moneda,
} from '@/types/index';

export type {
  Categoria,
  Dependencia,
  Moneda,
  Movimiento,
  MovimientoCreate,
  OrigenRecepcion,
  Producto,
  ProductoConCantidad,
  ProductoCreate,
  ProductoUpdate,
  Subcategoria,
  TipoMovimiento,
};

/** Fila de recepción disponible para crear un ajuste. */
export interface RecepcionStock {
  id_movimiento: number;
  id_producto: number;
  nombre_producto: string;
  codigo_producto: string | null;
  cantidad: number;
  id_dependencia: number;
  nombre_dependencia: string;
  id_proveedor: number | null;
  proveedor_nombre: string | null;
  id_convenio: number | null;
  convenio_nombre: string | null;
  id_anexo: number | null;
  anexo_nombre: string | null;
  anexo_numero: string | null;
  fecha: string;
  codigo: string | null;
}

/** Movimiento pendiente con datos de origen que muestra la bandeja. */
export type MovimientoPendiente = Movimiento & {
  provedor?: { nombre: string };
  convenio?: { nombre_convenio: string };
  anexo?: { nombre_anexo: string; numero_anexo: string };
};

export interface DestinoAjuste {
  id_dependencia: number;
  cantidad: number;
}

export interface AjusteInventario {
  id_producto?: number;
  id_dependencia_origen?: number;
  destinos: DestinoAjuste[];
  observacion?: string;
  codigo?: string;
}

/** Puerto de inventario. La UI no conoce servicios ni HTTP. */
export interface InventarioRepositorio {
  listarProductos(
    skip?: number,
    limit?: number,
    search?: string,
    onTotal?: (total: number | null) => void,
  ): Promise<Producto[]>;
  crearProducto(data: ProductoCreate): Promise<Producto>;
  actualizarProducto(id: number, data: ProductoUpdate): Promise<Producto>;
  eliminarProducto(id: number): Promise<void>;
  listarProductosPorDependencia(
    dependenciaId: number,
  ): Promise<ProductoConCantidad[]>;
  listarProductosConStockItemAnexo(): Promise<ProductoConCantidad[]>;
  obtenerSiguienteCodigo(idSubcategoria: number): Promise<string>;
  listarCategorias(): Promise<Categoria[]>;
  listarSubcategorias(): Promise<Subcategoria[]>;
  listarMonedas(): Promise<Moneda[]>;
  listarDependencias(): Promise<Dependencia[]>;
  listarTiposMovimiento(): Promise<TipoMovimiento[]>;
  listarMovimientos(
    skip?: number,
    limit?: number,
    tipo?: string,
    search?: string,
    onTotal?: (total: number | null) => void,
  ): Promise<Movimiento[]>;
  listarMovimientosPendientes(
    skip?: number,
    limit?: number,
    onTotal?: (total: number | null) => void,
    search?: string,
  ): Promise<MovimientoPendiente[]>;
  crearMovimiento(data: MovimientoCreate): Promise<Movimiento>;
  confirmarMovimiento(id: number): Promise<Movimiento>;
  eliminarMovimiento(id: number): Promise<void>;
  listarRecepcionesStock(): Promise<RecepcionStock[]>;
  crearAjuste(data: AjusteInventario): Promise<void>;
}
