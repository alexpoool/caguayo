import type {
  AjusteInventario,
  InventarioRepositorio,
  Movimiento,
  MovimientoCreate,
  MovimientoPendiente,
  Producto,
  ProductoConCantidad,
  ProductoCreate,
  ProductoUpdate,
  RecepcionStock,
  TipoMovimiento,
} from '../domain/inventario';

/** Casos de uso de inventario. Sin React ni HTTP. */
export function crearCasosUsoInventario(repositorio: InventarioRepositorio) {
  return {
    listarProductos(
      skip = 0,
      limit = 100,
      search?: string,
      onTotal?: (total: number | null) => void,
    ): Promise<Producto[]> {
      return repositorio.listarProductos(skip, limit, search, onTotal);
    },

    crearProducto(data: ProductoCreate): Promise<Producto> {
      return repositorio.crearProducto(data);
    },

    actualizarProducto(id: number, data: ProductoUpdate): Promise<Producto> {
      return repositorio.actualizarProducto(id, data);
    },

    eliminarProducto(id: number): Promise<void> {
      return repositorio.eliminarProducto(id);
    },

    listarProductosPorDependencia(
      dependenciaId: number,
    ): Promise<ProductoConCantidad[]> {
      return repositorio.listarProductosPorDependencia(dependenciaId);
    },

    listarProductosConStockItemAnexo(): Promise<ProductoConCantidad[]> {
      return repositorio.listarProductosConStockItemAnexo();
    },

    obtenerSiguienteCodigo(idSubcategoria: number): Promise<string> {
      return repositorio.obtenerSiguienteCodigo(idSubcategoria);
    },

    listarCategorias: () => repositorio.listarCategorias(),
    listarSubcategorias: () => repositorio.listarSubcategorias(),
    listarMonedas: () => repositorio.listarMonedas(),
    listarDependencias: () => repositorio.listarDependencias(),

    listarTiposMovimiento(): Promise<TipoMovimiento[]> {
      return repositorio.listarTiposMovimiento();
    },

    listarMovimientos(
      skip = 0,
      limit = 100,
      tipo?: string,
      search?: string,
      onTotal?: (total: number | null) => void,
    ): Promise<Movimiento[]> {
      return repositorio.listarMovimientos(skip, limit, tipo, search, onTotal);
    },

    listarMovimientosPendientes(
      skip = 0,
      limit = 100,
      onTotal?: (total: number | null) => void,
      search?: string,
    ): Promise<MovimientoPendiente[]> {
      return repositorio.listarMovimientosPendientes(
        skip,
        limit,
        onTotal,
        search,
      );
    },

    crearMovimiento(data: MovimientoCreate): Promise<Movimiento> {
      return repositorio.crearMovimiento(data);
    },

    confirmarMovimiento(id: number): Promise<Movimiento> {
      return repositorio.confirmarMovimiento(id);
    },

    eliminarMovimiento(id: number): Promise<void> {
      return repositorio.eliminarMovimiento(id);
    },

    listarRecepcionesStock(): Promise<RecepcionStock[]> {
      return repositorio.listarRecepcionesStock();
    },

    crearAjuste(data: AjusteInventario): Promise<void> {
      return repositorio.crearAjuste(data);
    },
  };
}

export type CasosUsoInventario = ReturnType<typeof crearCasosUsoInventario>;
