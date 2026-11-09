import {
  clientesService,
  configuracionService,
  contratosService,
  cuentasService,
  dependenciasService,
  existenciaService,
  facturasService,
  monedaService,
  ofertasTiendaService,
  pagosService,
  productosService,
  solicitudesService,
  suplementosService,
  ventasEfectivoService,
} from '@/services/api';
import type {
  ClienteCreate,
  ContratoCreate,
  ContratoUpdate,
  FacturaCreate,
  FacturaUpdate,
  OfertaTiendaCreate,
  OfertaTiendaUpdate,
  SuplementoCreate,
  SuplementoUpdate,
  VentaEfectivoCreate,
  VentaEfectivoUpdate,
  VentasRepositorio,
} from '../domain/ventas';

/**
 * Adaptador temporal sobre los servicios legacy. Aísla a la feature de
 * `services/api`; el reemplazo por `apiClient` puede hacerse sin tocar UI.
 */
export const ventasApiRepositorio: VentasRepositorio = {
  listarContratos: (skip, limit, clienteId, search, onTotal) =>
    contratosService.getContratos(skip, limit, clienteId, search, onTotal),
  obtenerContrato: (id) => contratosService.getContrato(id),
  crearContrato: (data: ContratoCreate) =>
    contratosService.createContrato(data),
  actualizarContrato: (id: number, data: ContratoUpdate) =>
    contratosService.updateContrato(id, data),
  eliminarContrato: (id) => contratosService.deleteContrato(id),
  actualizarSolicitud: (id, data) =>
    solicitudesService.updateSolicitud(id, data),

  listarClientes: (skip, limit, tipoRelacion, search, onTotal) =>
    clientesService.getClientes(
      skip,
      limit,
      tipoRelacion,
      search,
      onTotal,
    ),
  obtenerCliente: (id) => clientesService.getCliente(id),
  crearCliente: (data: ClienteCreate) => clientesService.createCliente(data),
  listarMonedas: () => monedaService.getMonedas(0, 100),
  listarDependencias: (search, skip, limit) =>
    dependenciasService.getDependencias(search, skip, limit),
  listarCuentasDependencia: (idDependencia) =>
    dependenciasService.getCuentasByDependencia(idDependencia),
  listarCuentasCliente: (idCliente) =>
    cuentasService.getCuentasByCliente(idCliente),

  obtenerEstadosContrato: () => configuracionService.getEstadosContrato(),
  obtenerTiposContrato: () => configuracionService.getTiposContrato(),

  listarSuplementos: (skip, limit, onTotal, search) =>
    suplementosService.getSuplementos(skip, limit, onTotal, search),
  listarSuplementosPorContrato: (contratoId, skip, limit, search) =>
    suplementosService.getSuplementosByContrato(
      contratoId,
      skip,
      limit,
      search,
    ),
  crearSuplemento: (data: SuplementoCreate) =>
    suplementosService.createSuplemento(data),
  actualizarSuplemento: (id: number, data: SuplementoUpdate) =>
    suplementosService.updateSuplemento(id, data),
  eliminarSuplemento: (id) => suplementosService.deleteSuplemento(id),

  listarFacturas: (skip, limit, tipo) =>
    facturasService.getFacturas(skip, limit, tipo),
  listarFacturasPorContrato: (contratoId, tipo) =>
    facturasService.getFacturasByContrato(contratoId, tipo),
  crearFactura: (data: FacturaCreate) => facturasService.createFactura(data),
  actualizarFactura: (id: number, data: FacturaUpdate) =>
    facturasService.updateFactura(id, data),
  eliminarFactura: (id) => facturasService.deleteFactura(id),
  aprobarFactura: (id) => facturasService.aprobarFactura(id),

  listarPagosFactura: (facturaId) =>
    pagosService.getPagosByFactura(facturaId),
  crearPago: (data) => pagosService.createPago(data),
  eliminarPago: (id) => pagosService.deletePago(id),

  listarOfertas: (skip, limit, estado, onTotal) =>
    ofertasTiendaService.getOfertas(skip, limit, estado, onTotal),
  listarOfertasPorContrato: (contratoId, estado) =>
    ofertasTiendaService.getOfertasByContrato(contratoId, estado),
  crearOferta: (data: OfertaTiendaCreate) =>
    ofertasTiendaService.createOferta(data),
  actualizarOferta: (id: number, data: OfertaTiendaUpdate) =>
    ofertasTiendaService.updateOferta(id, data),
  eliminarOferta: (id) => ofertasTiendaService.deleteOferta(id),
  convertirOferta: (id, tipo) =>
    ofertasTiendaService.convertirOferta(id, tipo),

  listarVentasEfectivo: (skip, limit, onTotal, search) =>
    ventasEfectivoService.getVentasEfectivo(skip, limit, onTotal, search),
  crearVentaEfectivo: (data: VentaEfectivoCreate) =>
    ventasEfectivoService.createVentaEfectivo(data),
  actualizarVentaEfectivo: (id: number, data: VentaEfectivoUpdate) =>
    ventasEfectivoService.updateVentaEfectivo(id, data),
  eliminarVentaEfectivo: (id) =>
    ventasEfectivoService.deleteVentaEfectivo(id),

  listarProductosConStockItemAnexo: () =>
    productosService.getProductosConStockItemAnexo(),
  validarExistencias: (productos, dependenciaId, anexoId) =>
    existenciaService.validarMultiple(productos, dependenciaId, anexoId),
  listarExistenciasHibridas: (dependenciaId, anexoId) =>
    existenciaService.getExistenciasHibridas(dependenciaId, anexoId),
};
