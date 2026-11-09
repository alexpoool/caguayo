import type {
  Anexo,
  CompraRepositorio,
  Convenio,
  Cuenta,
  DocumentoFicha,
  FichaCostoInput,
  FichaCostoRead,
  FichaTarifa,
  FichaTarifaInput,
  FirmasFicha,
  Liquidacion,
  LiquidacionCreate,
  OperacionesAnexo,
  Producto,
  ProductosEnLiquidacion,
  ProductosEnLiquidacionCreate,
  ResultadoOperacionesAnexo,
  TipoConvenio,
  ValidacionExistencias,
} from '../domain/compra';

/** Casos de uso de compra. Sin React ni HTTP. */
export function crearCasosUsoCompra(repositorio: CompraRepositorio) {
  return {
    listarConvenios(
      clienteId?: number,
      search?: string,
      skip = 0,
      limit = 100,
      onTotal?: (total: number | null) => void,
    ): Promise<Convenio[]> {
      return repositorio.listarConvenios(
        clienteId,
        search,
        skip,
        limit,
        onTotal,
      );
    },

    crearConvenio(data: Partial<Convenio>): Promise<Convenio> {
      return repositorio.crearConvenio(data);
    },

    actualizarConvenio(
      id: number,
      data: Partial<Convenio>,
    ): Promise<Convenio> {
      return repositorio.actualizarConvenio(id, data);
    },

    eliminarConvenio(id: number): Promise<void> {
      return repositorio.eliminarConvenio(id);
    },

    listarClientes: (
      skip?: number,
      limit?: number,
      tipoRelacion?: string,
      search?: string,
    ) => repositorio.listarClientes(skip, limit, tipoRelacion, search),
    obtenerCliente: (id: number) => repositorio.obtenerCliente(id),
    listarTiposConvenio: (): Promise<TipoConvenio[]> =>
      repositorio.listarTiposConvenio(),

    listarAnexos(
      convenioId?: number,
      search?: string,
      skip = 0,
      limit = 100,
      onTotal?: (total: number | null) => void,
    ): Promise<Anexo[]> {
      return repositorio.listarAnexos(
        convenioId,
        search,
        skip,
        limit,
        onTotal,
      );
    },

    crearAnexo: (data: Partial<Anexo>) => repositorio.crearAnexo(data),
    operacionesAnexo: (
      id: number,
      data: OperacionesAnexo,
    ): Promise<ResultadoOperacionesAnexo> =>
      repositorio.operacionesAnexo(id, data),
    listarProductos: (
      skip?: number,
      limit?: number,
      search?: string,
      onTotal?: (total: number | null) => void,
    ) => repositorio.listarProductos(skip, limit, search, onTotal),
    obtenerProducto: (id: number): Promise<Producto> =>
      repositorio.obtenerProducto(id),
    obtenerSiguienteCodigo: (idSubcategoria: number): Promise<string> =>
      repositorio.obtenerSiguienteCodigo(idSubcategoria),
    listarMonedas: (skip?: number, limit?: number) =>
      repositorio.listarMonedas(skip, limit),
    listarSubcategorias: () => repositorio.listarSubcategorias(),

    listarProductosEnLiquidacion: (
      skip?: number,
      limit?: number,
      clienteId?: number,
      onTotal?: (total: number | null) => void,
      search?: string,
    ) =>
      repositorio.listarProductosEnLiquidacion(
        skip,
        limit,
        clienteId,
        onTotal,
        search,
      ),
    listarProductosEnLiquidacionPendientes: (
      skip?: number,
      limit?: number,
      clienteId?: number,
      onTotal?: (total: number | null) => void,
      search?: string,
    ) =>
      repositorio.listarProductosEnLiquidacionPendientes(
        skip,
        limit,
        clienteId,
        onTotal,
        search,
      ),
    listarProductosEnLiquidacionLiquidadas: (
      skip?: number,
      limit?: number,
      clienteId?: number,
      onTotal?: (total: number | null) => void,
      search?: string,
    ) =>
      repositorio.listarProductosEnLiquidacionLiquidadas(
        skip,
        limit,
        clienteId,
        onTotal,
        search,
      ),
    crearProductoEnLiquidacion: (
      data: ProductosEnLiquidacionCreate,
    ): Promise<ProductosEnLiquidacion> =>
      repositorio.crearProductoEnLiquidacion(data),
    actualizarProductoEnLiquidacion: (
      id: number,
      data: Partial<ProductosEnLiquidacionCreate>,
    ) => repositorio.actualizarProductoEnLiquidacion(id, data),
    eliminarProductoEnLiquidacion: (id: number) =>
      repositorio.eliminarProductoEnLiquidacion(id),

    listarLiquidaciones: (
      skip?: number,
      limit?: number,
      clienteId?: number,
      onTotal?: (total: number | null) => void,
      search?: string,
    ) =>
      repositorio.listarLiquidaciones(
        skip,
        limit,
        clienteId,
        onTotal,
        search,
      ),
    listarLiquidacionesPendientes: (
      skip?: number,
      limit?: number,
      clienteId?: number,
      onTotal?: (total: number | null) => void,
      search?: string,
    ) =>
      repositorio.listarLiquidacionesPendientes(
        skip,
        limit,
        clienteId,
        onTotal,
        search,
      ),
    listarLiquidacionesLiquidadas: (
      skip?: number,
      limit?: number,
      clienteId?: number,
      onTotal?: (total: number | null) => void,
      search?: string,
    ) =>
      repositorio.listarLiquidacionesLiquidadas(
        skip,
        limit,
        clienteId,
        onTotal,
        search,
      ),
    crearLiquidacion: (data: LiquidacionCreate): Promise<Liquidacion> =>
      repositorio.crearLiquidacion(data),
    eliminarLiquidacion: (id: number) =>
      repositorio.eliminarLiquidacion(id),
    aprobarLiquidacion: (id: number) =>
      repositorio.aprobarLiquidacion(id),
    listarProductosPendientesCliente: (
      clienteId: number,
      anexoId?: number,
      monedaId?: number,
    ) =>
      repositorio.listarProductosPendientesCliente(
        clienteId,
        anexoId,
        monedaId,
      ),
    validarExistencias: (
      productos: { id_producto: number; cantidad: number }[],
      dependenciaId?: number,
      anexoId?: number,
    ): Promise<ValidacionExistencias> =>
      repositorio.validarExistencias(productos, dependenciaId, anexoId),
    listarCuentasCliente: (idCliente: number): Promise<Cuenta[]> =>
      repositorio.listarCuentasCliente(idCliente),

    listarFichas: (params?: {
      id_producto?: number;
      search?: string;
      skip?: number;
      limit?: number;
    }): Promise<FichaCostoRead[]> => repositorio.listarFichas(params),
    crearFicha: (data: FichaCostoInput): Promise<FichaCostoRead> =>
      repositorio.crearFicha(data),
    actualizarFicha: (
      id: number,
      data: Partial<FichaCostoInput>,
    ): Promise<FichaCostoRead> => repositorio.actualizarFicha(id, data),
    exportarFichaExcel: (
      id: number,
      firmas: FirmasFicha,
    ): Promise<DocumentoFicha> =>
      repositorio.exportarFichaExcel(id, firmas),
    exportarFichaPdf: (
      id: number,
      firmas: FirmasFicha,
    ): Promise<DocumentoFicha> => repositorio.exportarFichaPdf(id, firmas),
    listarTarifas: (params?: {
      search?: string;
      skip?: number;
      limit?: number;
    }): Promise<FichaTarifa[]> => repositorio.listarTarifas(params),
    crearTarifa: (data: FichaTarifaInput): Promise<FichaTarifa> =>
      repositorio.crearTarifa(data),
    actualizarTarifa: (
      id: number,
      data: Partial<FichaTarifaInput>,
    ): Promise<FichaTarifa> => repositorio.actualizarTarifa(id, data),
    eliminarTarifa: (id: number) => repositorio.eliminarTarifa(id),
  };
}

export type CasosUsoCompra = ReturnType<typeof crearCasosUsoCompra>;
