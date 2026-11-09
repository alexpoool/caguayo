import type {
  CertificacionCreate,
  CertificacionUpdate,
  ConfirmarLiquidacionInput,
  EtapaCreate,
  EtapaUpdate,
  FacturaServicioCreate,
  FacturaServicioUpdate,
  FiltrosSolicitudes,
  OfertaCreate,
  OfertaUpdate,
  PagoFacturaServicioCreate,
  PersonaEtapaCreate,
  PersonaLiquidacionInput,
  PersonaLiquidacionInputUpdate,
  ProyectosRepositorio,
  ServicioCreate,
  ServicioUpdate,
  SolicitudServicioCreate,
  SolicitudServicioUpdate,
  TareaEtapaCreate,
  TareaEtapaUpdate,
} from '../domain/proyectos';

/** Casos de uso de proyectos. Sin React ni HTTP. */
export function crearCasosUsoProyectos(repositorio: ProyectosRepositorio) {
  return {
    getServicios: (
      skip = 0,
      limit = 100,
      onTotal?: (total: number | null) => void,
      search?: string,
    ) => repositorio.getServicios(skip, limit, onTotal, search),
    createServicio: (data: ServicioCreate) =>
      repositorio.createServicio(data),
    updateServicio: (id: number, data: ServicioUpdate) =>
      repositorio.updateServicio(id, data),
    deleteServicio: (id: number) => repositorio.deleteServicio(id),

    getSolicitudes: (
      skip = 0,
      limit = 100,
      onTotal?: (total: number | null) => void,
      filtros?: FiltrosSolicitudes,
    ) => repositorio.getSolicitudes(skip, limit, onTotal, filtros),
    getSolicitud: (id: number) => repositorio.getSolicitud(id),
    createSolicitud: (data: SolicitudServicioCreate) =>
      repositorio.createSolicitud(data),
    updateSolicitud: (id: number, data: SolicitudServicioUpdate) =>
      repositorio.updateSolicitud(id, data),
    deleteSolicitud: (id: number) => repositorio.deleteSolicitud(id),

    getAllEtapas: () => repositorio.getAllEtapas(),
    getEtapasBySolicitud: (solicitudId: number) =>
      repositorio.getEtapasBySolicitud(solicitudId),
    getEtapa: (id: number) => repositorio.getEtapa(id),
    createEtapa: (data: EtapaCreate) => repositorio.createEtapa(data),
    updateEtapa: (id: number, data: EtapaUpdate) =>
      repositorio.updateEtapa(id, data),
    deleteEtapa: (id: number) => repositorio.deleteEtapa(id),

    getTareasByEtapa: (etapaId: number) =>
      repositorio.getTareasByEtapa(etapaId),
    createTareaEtapa: (data: TareaEtapaCreate) =>
      repositorio.createTareaEtapa(data),
    updateTareaEtapa: (id: number, data: TareaEtapaUpdate) =>
      repositorio.updateTareaEtapa(id, data),
    deleteTareaEtapa: (id: number) => repositorio.deleteTareaEtapa(id),

    getPersonasByEtapa: (etapaId: number) =>
      repositorio.getPersonasByEtapa(etapaId),
    createPersonaEtapa: (data: PersonaEtapaCreate) =>
      repositorio.createPersonaEtapa(data),
    deletePersonaEtapa: (etapaId: number, personaId: number) =>
      repositorio.deletePersonaEtapa(etapaId, personaId),

    getFacturasServicio: (
      skip = 0,
      limit = 100,
      onTotal?: (total: number | null) => void,
      search?: string,
    ) => repositorio.getFacturasServicio(skip, limit, onTotal, search),
    getFacturaServicio: (id: number) =>
      repositorio.getFacturaServicio(id),
    createFacturaServicio: (data: FacturaServicioCreate) =>
      repositorio.createFacturaServicio(data),
    updateFacturaServicio: (id: number, data: FacturaServicioUpdate) =>
      repositorio.updateFacturaServicio(id, data),
    deleteFacturaServicio: (id: number) =>
      repositorio.deleteFacturaServicio(id),
    validarPagoEtapa: (etapaId: number) =>
      repositorio.validarPagoEtapa(etapaId),
    getItemsByFactura: (facturaId: number) =>
      repositorio.getItemsByFactura(facturaId),
    aprobarFacturaServicio: (id: number) =>
      repositorio.aprobarFacturaServicio(id),

    getOfertas: (
      skip = 0,
      limit = 100,
      estado?: string,
      onTotal?: (total: number | null) => void,
      search?: string,
    ) => repositorio.getOfertas(skip, limit, estado, onTotal, search),
    createOferta: (data: OfertaCreate) => repositorio.createOferta(data),
    updateOferta: (id: number, data: OfertaUpdate) =>
      repositorio.updateOferta(id, data),
    deleteOferta: (id: number) => repositorio.deleteOferta(id),
    getItemsByOferta: (ofertaId: number) =>
      repositorio.getItemsByOferta(ofertaId),
    confirmarOferta: (
      id: number,
      tipo: 'FACTURA' | 'PREFACTURA' = 'FACTURA',
    ) => repositorio.confirmarOferta(id, tipo),

    getPagosByFactura: (facturaId: number) =>
      repositorio.getPagosByFactura(facturaId),
    createPago: (data: PagoFacturaServicioCreate) =>
      repositorio.createPago(data),
    deletePago: (id: number) => repositorio.deletePago(id),

    getCertificaciones: (
      skip = 0,
      limit = 100,
      onTotal?: (total: number | null) => void,
    ) => repositorio.getCertificaciones(skip, limit, onTotal),
    getCertificacion: (id: number) =>
      repositorio.getCertificacion(id),
    getCertificacionesByEtapa: (idEtapa: number) =>
      repositorio.getCertificacionesByEtapa(idEtapa),
    createCertificacion: (data: CertificacionCreate) =>
      repositorio.createCertificacion(data),
    updateCertificacion: (id: number, data: CertificacionUpdate) =>
      repositorio.updateCertificacion(id, data),
    deleteCertificacion: (id: number) =>
      repositorio.deleteCertificacion(id),

    getLiquidaciones: (
      skip = 0,
      limit = 100,
      onTotal?: (total: number | null) => void,
      search?: string,
    ) => repositorio.getLiquidaciones(skip, limit, onTotal, search),
    getLiquidacion: (id: number) => repositorio.getLiquidacion(id),
    createLiquidacion: (data: PersonaLiquidacionInput) =>
      repositorio.createLiquidacion(data),
    updateLiquidacion: (
      id: number,
      data: PersonaLiquidacionInputUpdate,
    ) => repositorio.updateLiquidacion(id, data),
    deleteLiquidacion: (id: number) =>
      repositorio.deleteLiquidacion(id),
    confirmarLiquidacion: (
      id: number,
      data: ConfirmarLiquidacionInput,
    ) => repositorio.confirmarLiquidacion(id, data),
    validarLiquidar: (idEtapa: number, idPersona: number) =>
      repositorio.validarLiquidar(idEtapa, idPersona),
    getPagosDisponibles: (idEtapa: number) =>
      repositorio.getPagosDisponibles(idEtapa),
    getDisponibleLiquidar: (idEtapa: number, idPersona: number) =>
      repositorio.getDisponibleLiquidar(idEtapa, idPersona),

    getContratos: (
      skip = 0,
      limit = 10000,
      idCliente?: number,
      search?: string,
      onTotal?: (total: number | null) => void,
    ) => repositorio.getContratos(skip, limit, idCliente, search, onTotal),
    getContrato: (id: number) => repositorio.getContrato(id),
    createContrato: (data: Parameters<ProyectosRepositorio['createContrato']>[0]) =>
      repositorio.createContrato(data),
    getSuplementosByContrato: (
      contratoId: number,
      skip = 0,
      limit = 100,
      search?: string,
    ) => repositorio.getSuplementosByContrato(contratoId, skip, limit, search),
    getSuplemento: (id: number) => repositorio.getSuplemento(id),
    createSuplemento: (
      data: Parameters<ProyectosRepositorio['createSuplemento']>[0],
    ) => repositorio.createSuplemento(data),

    getClientes: (
      skip = 0,
      limit = 10000,
      tipoRelacion?: string,
      search?: string,
      onTotal?: (total: number | null) => void,
    ) => repositorio.getClientes(skip, limit, tipoRelacion, search, onTotal),
    getCliente: (id: number) => repositorio.getCliente(id),
    createCliente: (
      data: Parameters<ProyectosRepositorio['createCliente']>[0],
    ) => repositorio.createCliente(data),
    getPersonasNaturales: () => repositorio.getPersonasNaturales(),
    getTiposEntidad: () => repositorio.getTiposEntidad(),

    getMonedas: (skip = 0, limit = 100) =>
      repositorio.getMonedas(skip, limit),
    getCuentasByClienteAll: (clienteId: number) =>
      repositorio.getCuentasByClienteAll(clienteId),
    getCuentasByDependencia: (idDependencia: number) =>
      repositorio.getCuentasByDependencia(idDependencia),
    getEstadosContrato: () => repositorio.getEstadosContrato(),
    getUsuarios: () => repositorio.getUsuarios(),
  };
}

export type CasosUsoProyectos = ReturnType<typeof crearCasosUsoProyectos>;
