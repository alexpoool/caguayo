import {
  categoriasService,
  dependenciasService,
  monedaService,
  movimientosService,
  productosService,
  subcategoriasService,
} from '@/services/api';
import type {
  AjusteInventario,
  InventarioRepositorio,
  MovimientoCreate,
  MovimientoPendiente,
  ProductoCreate,
  ProductoUpdate,
  RecepcionStock,
} from '../domain/inventario';

/**
 * Adaptador temporal sobre los servicios legacy. Aísla a la feature de
 * `services/api`; el reemplazo por `apiClient` puede hacerse sin tocar UI.
 */
export const inventarioApiRepositorio: InventarioRepositorio = {
  listarProductos: (skip, limit, search, onTotal) =>
    productosService.getProductos(skip, limit, search, onTotal),

  crearProducto: (data: ProductoCreate) =>
    productosService.createProducto(data),

  actualizarProducto: (id: number, data: ProductoUpdate) =>
    productosService.updateProducto(id, data),

  eliminarProducto: (id: number) => productosService.deleteProducto(id),

  listarProductosPorDependencia: (dependenciaId: number) =>
    movimientosService.getProductosPorDependencia(dependenciaId),

  listarProductosConStockItemAnexo: () =>
    productosService.getProductosConStockItemAnexo(),

  async obtenerSiguienteCodigo(idSubcategoria: number) {
    const response = await productosService.getNextCodigo(idSubcategoria);
    return response.codigo;
  },

  listarCategorias: () => categoriasService.getCategorias(),
  listarSubcategorias: () => subcategoriasService.getSubcategorias(),
  listarMonedas: () => monedaService.getMonedas(),
  listarDependencias: () => dependenciasService.getDependencias(),
  listarTiposMovimiento: () => movimientosService.getTiposMovimiento(),

  listarMovimientos: (skip, limit, tipo, search, onTotal) =>
    movimientosService.getMovimientos(skip, limit, tipo, search, onTotal),

  async listarMovimientosPendientes(skip, limit, onTotal, search) {
    const movimientos = await movimientosService.getMovimientosPendientes(
      skip,
      limit,
      onTotal,
      search,
    );
    return movimientos as MovimientoPendiente[];
  },

  crearMovimiento: (data: MovimientoCreate) =>
    movimientosService.createMovimiento(data),

  confirmarMovimiento: (id: number) =>
    movimientosService.confirmarMovimiento(id),

  eliminarMovimiento: (id: number) => movimientosService.deleteMovimiento(id),

  async listarRecepcionesStock() {
    const recepciones = await movimientosService.getRecepcionesStock();
    return recepciones as RecepcionStock[];
  },

  async crearAjuste(data: AjusteInventario) {
    await movimientosService.crearAjuste(data);
  },
};
