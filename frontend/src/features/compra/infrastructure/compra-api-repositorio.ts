import {
  anexosService,
  clientesService,
  configuracionService,
  conveniosService,
  cuentasService,
  existenciaService,
  fichasCostoService,
  fichasTarifasService,
  liquidacionService,
  monedaService,
  productosEnLiquidacionService,
  productosService,
  subcategoriasService,
} from '@/services/api';
import type {
  Anexo,
  CompraRepositorio,
  Convenio,
  DocumentoFicha,
  FichaCostoInput,
  FichaCostoRead,
  FichaTarifaInput,
  LiquidacionCreate,
  ProductosEnLiquidacionCreate,
} from '../domain/compra';

/**
 * Adaptador temporal sobre los servicios legacy. Aísla a la feature de
 * `services/api`; el reemplazo por `apiClient` puede hacerse sin tocar UI.
 */
export const compraApiRepositorio: CompraRepositorio = {
  listarConvenios: (clienteId, search, skip, limit, onTotal) =>
    conveniosService.getConvenios(clienteId, search, skip, limit, onTotal),

  crearConvenio: (data: Partial<Convenio>) =>
    conveniosService.createConvenio(data),

  actualizarConvenio: (id: number, data: Partial<Convenio>) =>
    conveniosService.updateConvenio(id, data),

  eliminarConvenio: (id: number) => conveniosService.deleteConvenio(id),

  listarClientes: (skip, limit, tipoRelacion, search) =>
    clientesService.getClientes(skip, limit, tipoRelacion, search),

  obtenerCliente: (id: number) => clientesService.getCliente(id),

  listarTiposConvenio: () => configuracionService.getTiposConvenio(),

  listarAnexos: (convenioId, search, skip, limit, onTotal) =>
    anexosService.getAnexos(convenioId, search, skip, limit, onTotal),

  crearAnexo: (data: Partial<Anexo>) => anexosService.createAnexo(data),

  operacionesAnexo: (id, data) => anexosService.operacionesAnexo(id, data),

  listarProductos: (skip, limit, search, onTotal) =>
    productosService.getProductos(skip, limit, search, onTotal),

  obtenerProducto: (id: number) => productosService.getProducto(id),

  async obtenerSiguienteCodigo(idSubcategoria: number) {
    const response = await productosService.getNextCodigo(idSubcategoria);
    return response.codigo;
  },

  listarMonedas: (skip, limit) => monedaService.getMonedas(skip, limit),

  listarSubcategorias: () => subcategoriasService.getSubcategorias(),

  listarProductosEnLiquidacion: (skip, limit, clienteId, onTotal, search) =>
    productosEnLiquidacionService.getProductosEnLiquidacion(
      skip,
      limit,
      clienteId,
      onTotal,
      search,
    ),

  listarProductosEnLiquidacionPendientes: (
    skip,
    limit,
    clienteId,
    onTotal,
    search,
  ) =>
    productosEnLiquidacionService.getProductosEnLiquidacionPendientes(
      skip,
      limit,
      clienteId,
      onTotal,
      search,
    ),

  listarProductosEnLiquidacionLiquidadas: (
    skip,
    limit,
    clienteId,
    onTotal,
    search,
  ) =>
    productosEnLiquidacionService.getProductosEnLiquidacionLiquidadas(
      skip,
      limit,
      clienteId,
      onTotal,
      search,
    ),

  crearProductoEnLiquidacion: (data: ProductosEnLiquidacionCreate) =>
    productosEnLiquidacionService.createProductoEnLiquidacion(data),

  actualizarProductoEnLiquidacion: (
    id: number,
    data: Partial<ProductosEnLiquidacionCreate>,
  ) =>
    productosEnLiquidacionService.updateProductoEnLiquidacion(id, data),

  eliminarProductoEnLiquidacion: (id: number) =>
    productosEnLiquidacionService.deleteProducto(id),

  listarLiquidaciones: (skip, limit, clienteId, onTotal, search) =>
    liquidacionService.getLiquidaciones(
      skip,
      limit,
      clienteId,
      onTotal,
      search,
    ),

  listarLiquidacionesPendientes: (skip, limit, clienteId, onTotal, search) =>
    liquidacionService.getLiquidacionesPendientes(
      skip,
      limit,
      clienteId,
      onTotal,
      search,
    ),

  listarLiquidacionesLiquidadas: (skip, limit, clienteId, onTotal, search) =>
    liquidacionService.getLiquidacionesLiquidadas(
      skip,
      limit,
      clienteId,
      onTotal,
      search,
    ),

  crearLiquidacion: (data: LiquidacionCreate) =>
    liquidacionService.createLiquidacion(data),

  eliminarLiquidacion: (id: number) =>
    liquidacionService.deleteLiquidacion(id),

  aprobarLiquidacion: (id: number) =>
    liquidacionService.aprobarLiquidacion(id),

  listarProductosPendientesCliente: (clienteId, anexoId, monedaId) =>
    liquidacionService.getProductosPendientesByCliente(
      clienteId,
      anexoId,
      monedaId,
    ),

  validarExistencias: (productos, dependenciaId, anexoId) =>
    existenciaService.validarMultiple(productos, dependenciaId, anexoId),

  listarCuentasCliente: (idCliente: number) =>
    cuentasService.getCuentasByCliente(idCliente),

  listarFichas: (params) => fichasCostoService.getFichas(params),

  crearFicha: (data: FichaCostoInput): Promise<FichaCostoRead> =>
    fichasCostoService.createFicha(data),

  actualizarFicha: (id: number, data: Partial<FichaCostoInput>) =>
    fichasCostoService.updateFicha(id, data),

  exportarFichaExcel: (id, firmas): Promise<DocumentoFicha> =>
    fichasCostoService.exportarExcel(id, firmas),

  exportarFichaPdf: (id, firmas): Promise<DocumentoFicha> =>
    fichasCostoService.exportarPdf(id, firmas),

  listarTarifas: (params) => fichasTarifasService.getTarifas(params),

  crearTarifa: (data: FichaTarifaInput) =>
    fichasTarifasService.createTarifa(data),

  actualizarTarifa: (id: number, data: Partial<FichaTarifaInput>) =>
    fichasTarifasService.updateTarifa(id, data),

  eliminarTarifa: (id: number) => fichasTarifasService.deleteTarifa(id),
};
