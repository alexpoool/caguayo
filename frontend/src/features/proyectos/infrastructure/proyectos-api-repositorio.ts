import {
  certificacionesService,
  clientesService,
  contratosService,
  cuentasService,
  dependenciasService,
  etapasProyectoService,
  facturasServicioService,
  monedaService,
  ofertasService,
  pagosFacturaServicioService,
  personaEtapaService,
  personaLiquidacionService,
  serviciosProyectoService,
  solicitudesService,
  suplementosService,
  tareasEtapaService,
  tiposEntidadService,
  configuracionService,
} from '../../../services/api';
import { administracionService } from '../../../services/administracion';
import type { ProyectosRepositorio } from '../domain/proyectos';

/** Adaptador temporal sobre los servicios HTTP heredados. */
export const proyectosApiRepositorio: ProyectosRepositorio = {
  getServicios: (...args) => serviciosProyectoService.getServicios(...args),
  createServicio: (data) => serviciosProyectoService.createServicio(data),
  updateServicio: (id, data) =>
    serviciosProyectoService.updateServicio(id, data),
  deleteServicio: (id) => serviciosProyectoService.deleteServicio(id),

  getSolicitudes: (...args) => solicitudesService.getSolicitudes(...args),
  getSolicitud: (id) => solicitudesService.getSolicitud(id),
  createSolicitud: (data) => solicitudesService.createSolicitud(data),
  updateSolicitud: (id, data) =>
    solicitudesService.updateSolicitud(id, data),
  deleteSolicitud: (id) => solicitudesService.deleteSolicitud(id),

  getAllEtapas: () => etapasProyectoService.getAllEtapas(),
  getEtapasBySolicitud: (solicitudId) =>
    etapasProyectoService.getEtapasBySolicitud(solicitudId),
  getEtapa: (id) => etapasProyectoService.getEtapa(id),
  createEtapa: (data) => etapasProyectoService.createEtapa(data),
  updateEtapa: (id, data) => etapasProyectoService.updateEtapa(id, data),
  deleteEtapa: (id) => etapasProyectoService.deleteEtapa(id),

  getTareasByEtapa: (etapaId) =>
    tareasEtapaService.getTareasByEtapa(etapaId),
  createTareaEtapa: (data) => tareasEtapaService.createTareaEtapa(data),
  updateTareaEtapa: (id, data) =>
    tareasEtapaService.updateTareaEtapa(id, data),
  deleteTareaEtapa: (id) => tareasEtapaService.deleteTareaEtapa(id),

  getPersonasByEtapa: (etapaId) =>
    personaEtapaService.getPersonasByEtapa(etapaId),
  createPersonaEtapa: (data) => personaEtapaService.createPersonaEtapa(data),
  deletePersonaEtapa: (etapaId, personaId) =>
    personaEtapaService.deletePersonaEtapa(etapaId, personaId),

  getFacturasServicio: (...args) =>
    facturasServicioService.getFacturasServicio(...args),
  getFacturaServicio: (id) => facturasServicioService.getFacturaServicio(id),
  createFacturaServicio: (data) =>
    facturasServicioService.createFacturaServicio(data),
  updateFacturaServicio: (id, data) =>
    facturasServicioService.updateFacturaServicio(id, data),
  deleteFacturaServicio: (id) =>
    facturasServicioService.deleteFacturaServicio(id),
  validarPagoEtapa: (etapaId) =>
    facturasServicioService.validarPagoEtapa(etapaId),
  getItemsByFactura: (facturaId) =>
    facturasServicioService.getItemsByFactura(facturaId),
  aprobarFacturaServicio: (id) =>
    facturasServicioService.aprobarFacturaServicio(id),

  getOfertas: (...args) => ofertasService.getOfertas(...args),
  createOferta: (data) => ofertasService.createOferta(data),
  updateOferta: (id, data) => ofertasService.updateOferta(id, data),
  deleteOferta: (id) => ofertasService.deleteOferta(id),
  getItemsByOferta: (ofertaId) =>
    ofertasService.getItemsByOferta(ofertaId),
  confirmarOferta: (id, tipo) => ofertasService.confirmarOferta(id, tipo),

  getPagosByFactura: (facturaId) =>
    pagosFacturaServicioService.getPagosByFactura(facturaId),
  createPago: (data) => pagosFacturaServicioService.createPago(data),
  deletePago: (id) => pagosFacturaServicioService.deletePago(id),

  getCertificaciones: (...args) =>
    certificacionesService.getCertificaciones(...args),
  getCertificacion: (id) => certificacionesService.getCertificacion(id),
  getCertificacionesByEtapa: (idEtapa) =>
    certificacionesService.getCertificacionesByEtapa(idEtapa),
  createCertificacion: (data) =>
    certificacionesService.createCertificacion(data),
  updateCertificacion: (id, data) =>
    certificacionesService.updateCertificacion(id, data),
  deleteCertificacion: (id) =>
    certificacionesService.deleteCertificacion(id),

  getLiquidaciones: (...args) =>
    personaLiquidacionService.getLiquidaciones(...args),
  getLiquidacion: (id) => personaLiquidacionService.getLiquidacion(id),
  createLiquidacion: (data) =>
    personaLiquidacionService.createLiquidacion(data),
  updateLiquidacion: (id, data) =>
    personaLiquidacionService.updateLiquidacion(id, data),
  deleteLiquidacion: (id) =>
    personaLiquidacionService.deleteLiquidacion(id),
  confirmarLiquidacion: (id, data) =>
    personaLiquidacionService.confirmarLiquidacion(id, data),
  validarLiquidar: (idEtapa, idPersona) =>
    personaLiquidacionService.validarLiquidar(idEtapa, idPersona),
  getPagosDisponibles: (idEtapa) =>
    personaLiquidacionService.getPagosDisponibles(idEtapa),
  getDisponibleLiquidar: (idEtapa, idPersona) =>
    personaLiquidacionService.getDisponibleLiquidar(idEtapa, idPersona),

  getContratos: (...args) => contratosService.getContratos(...args),
  getContrato: (id) => contratosService.getContrato(id),
  createContrato: (data) => contratosService.createContrato(data),
  getSuplementosByContrato: (...args) =>
    suplementosService.getSuplementosByContrato(...args),
  getSuplemento: (id) => suplementosService.getSuplemento(id),
  createSuplemento: (data) => suplementosService.createSuplemento(data),

  getClientes: (...args) => clientesService.getClientes(...args),
  getCliente: (id) => clientesService.getCliente(id),
  createCliente: (data) => clientesService.createCliente(data),
  getPersonasNaturales: () => clientesService.getPersonasNaturales(),
  getTiposEntidad: () => tiposEntidadService.getTiposEntidad(),

  getMonedas: (...args) => monedaService.getMonedas(...args),
  getCuentasByClienteAll: (clienteId) =>
    cuentasService.getCuentasByClienteAll(clienteId),
  getCuentasByDependencia: (idDependencia) =>
    dependenciasService.getCuentasByDependencia(idDependencia),
  getEstadosContrato: () => configuracionService.getEstadosContrato(),
  getUsuarios: () => administracionService.getUsuarios(),
};
