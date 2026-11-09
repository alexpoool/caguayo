import type {
  Cliente,
  ClienteCreate,
  ContratoCreate,
  ContratoUpdate,
  ContratoWithDetails,
  Cuenta,
  CuentaDependenciaSesion,
  Dependencia,
  EstadoContrato,
  ExistenciaHibrida,
  FacturaCreate,
  FacturaUpdate,
  FacturaWithDetails,
  Moneda,
  OfertaTiendaCreate,
  OfertaTiendaUpdate,
  OfertaTiendaWithDetails,
  Pago,
  PagoCreate,
  ProductoConCantidad,
  SolicitudServicio,
  SolicitudServicioUpdate,
  SuplementoCreate,
  SuplementoUpdate,
  SuplementoWithDetails,
  TipoContrato,
  ValidacionExistencias,
  VentaEfectivoCreate,
  VentaEfectivoUpdate,
  VentaEfectivoWithDetails,
  VentasRepositorio,
} from '../domain/ventas';

/** Casos de uso de ventas. Sin React ni HTTP. */
export function crearCasosUsoVentas(repositorio: VentasRepositorio) {
  return {
    listarContratos(
      skip = 0,
      limit = 10000,
      clienteId?: number,
      search?: string,
      onTotal?: (total: number | null) => void,
    ): Promise<ContratoWithDetails[]> {
      return repositorio.listarContratos(
        skip,
        limit,
        clienteId,
        search,
        onTotal,
      );
    },
    obtenerContrato: (id: number): Promise<ContratoWithDetails> =>
      repositorio.obtenerContrato(id),
    crearContrato: (data: ContratoCreate): Promise<ContratoWithDetails> =>
      repositorio.crearContrato(data),
    actualizarContrato: (
      id: number,
      data: ContratoUpdate,
    ): Promise<ContratoWithDetails> =>
      repositorio.actualizarContrato(id, data),
    eliminarContrato: (id: number): Promise<void> =>
      repositorio.eliminarContrato(id),
    actualizarSolicitud: (
      id: number,
      data: SolicitudServicioUpdate,
    ): Promise<SolicitudServicio> =>
      repositorio.actualizarSolicitud(id, data),

    listarClientes(
      skip = 0,
      limit = 10000,
      tipoRelacion?: string,
      search?: string,
      onTotal?: (total: number | null) => void,
    ): Promise<Cliente[]> {
      return repositorio.listarClientes(
        skip,
        limit,
        tipoRelacion,
        search,
        onTotal,
      );
    },
    obtenerCliente: (id: number): Promise<Cliente> =>
      repositorio.obtenerCliente(id),
    crearCliente: (data: ClienteCreate): Promise<Cliente> =>
      repositorio.crearCliente(data),
    listarMonedas: (): Promise<Moneda[]> => repositorio.listarMonedas(),
    listarDependencias: (
      search?: string,
      skip = 0,
      limit = 100,
    ): Promise<Dependencia[]> =>
      repositorio.listarDependencias(search, skip, limit),
    listarCuentasDependencia: (
      idDependencia: number,
    ): Promise<CuentaDependenciaSesion[]> =>
      repositorio.listarCuentasDependencia(idDependencia),
    listarCuentasCliente: (idCliente: number): Promise<Cuenta[]> =>
      repositorio.listarCuentasCliente(idCliente),

    obtenerEstadosContrato: (): Promise<EstadoContrato[]> =>
      repositorio.obtenerEstadosContrato(),
    obtenerTiposContrato: (): Promise<TipoContrato[]> =>
      repositorio.obtenerTiposContrato(),

    listarSuplementos(
      skip = 0,
      limit = 100,
      onTotal?: (total: number | null) => void,
      search?: string,
    ): Promise<SuplementoWithDetails[]> {
      return repositorio.listarSuplementos(skip, limit, onTotal, search);
    },
    listarSuplementosPorContrato: (
      contratoId: number,
      skip = 0,
      limit = 100,
      search?: string,
    ): Promise<SuplementoWithDetails[]> =>
      repositorio.listarSuplementosPorContrato(
        contratoId,
        skip,
        limit,
        search,
      ),
    crearSuplemento: (
      data: SuplementoCreate,
    ): Promise<SuplementoWithDetails> =>
      repositorio.crearSuplemento(data),
    actualizarSuplemento: (
      id: number,
      data: SuplementoUpdate,
    ): Promise<SuplementoWithDetails> =>
      repositorio.actualizarSuplemento(id, data),
    eliminarSuplemento: (id: number): Promise<void> =>
      repositorio.eliminarSuplemento(id),

    listarFacturas: (
      skip = 0,
      limit = 100,
      tipo: 'FACTURA' | 'PREFACTURA' = 'FACTURA',
    ): Promise<FacturaWithDetails[]> =>
      repositorio.listarFacturas(skip, limit, tipo),
    listarFacturasPorContrato: (
      contratoId: number,
      tipo: 'FACTURA' | 'PREFACTURA' = 'FACTURA',
    ): Promise<FacturaWithDetails[]> =>
      repositorio.listarFacturasPorContrato(contratoId, tipo),
    crearFactura: (data: FacturaCreate): Promise<FacturaWithDetails> =>
      repositorio.crearFactura(data),
    actualizarFactura: (
      id: number,
      data: FacturaUpdate,
    ): Promise<FacturaWithDetails> =>
      repositorio.actualizarFactura(id, data),
    eliminarFactura: (id: number): Promise<void> =>
      repositorio.eliminarFactura(id),
    aprobarFactura: (id: number): Promise<FacturaWithDetails> =>
      repositorio.aprobarFactura(id),

    listarPagosFactura: (facturaId: number): Promise<Pago[]> =>
      repositorio.listarPagosFactura(facturaId),
    crearPago: (data: PagoCreate): Promise<Pago> =>
      repositorio.crearPago(data),
    eliminarPago: (id: number): Promise<void> =>
      repositorio.eliminarPago(id),

    listarOfertas: (
      skip = 0,
      limit = 100,
      estado?: string,
      onTotal?: (total: number | null) => void,
    ): Promise<OfertaTiendaWithDetails[]> =>
      repositorio.listarOfertas(skip, limit, estado, onTotal),
    listarOfertasPorContrato: (
      contratoId: number,
      estado?: string,
    ): Promise<OfertaTiendaWithDetails[]> =>
      repositorio.listarOfertasPorContrato(contratoId, estado),
    crearOferta: (
      data: OfertaTiendaCreate,
    ): Promise<OfertaTiendaWithDetails> => repositorio.crearOferta(data),
    actualizarOferta: (
      id: number,
      data: OfertaTiendaUpdate,
    ): Promise<OfertaTiendaWithDetails> =>
      repositorio.actualizarOferta(id, data),
    eliminarOferta: (id: number): Promise<void> =>
      repositorio.eliminarOferta(id),
    convertirOferta: (
      id: number,
      tipo: 'FACTURA' | 'PREFACTURA' = 'FACTURA',
    ): Promise<FacturaWithDetails> =>
      repositorio.convertirOferta(id, tipo),

    listarVentasEfectivo: (
      skip = 0,
      limit = 100,
      onTotal?: (total: number | null) => void,
      search?: string,
    ): Promise<VentaEfectivoWithDetails[]> =>
      repositorio.listarVentasEfectivo(skip, limit, onTotal, search),
    crearVentaEfectivo: (
      data: VentaEfectivoCreate,
    ): Promise<VentaEfectivoWithDetails> =>
      repositorio.crearVentaEfectivo(data),
    actualizarVentaEfectivo: (
      id: number,
      data: VentaEfectivoUpdate,
    ): Promise<VentaEfectivoWithDetails> =>
      repositorio.actualizarVentaEfectivo(id, data),
    eliminarVentaEfectivo: (id: number): Promise<void> =>
      repositorio.eliminarVentaEfectivo(id),

    listarProductosConStockItemAnexo: (): Promise<ProductoConCantidad[]> =>
      repositorio.listarProductosConStockItemAnexo(),
    validarExistencias: (
      productos: { id_producto: number; cantidad: number }[],
      dependenciaId?: number,
      anexoId?: number,
    ): Promise<ValidacionExistencias> =>
      repositorio.validarExistencias(productos, dependenciaId, anexoId),
    listarExistenciasHibridas: (
      dependenciaId?: number,
      anexoId?: number,
    ): Promise<ExistenciaHibrida[]> =>
      repositorio.listarExistenciasHibridas(dependenciaId, anexoId),
  };
}

export type CasosUsoVentas = ReturnType<typeof crearCasosUsoVentas>;
