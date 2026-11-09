import type {
  Certificacion,
  CertificacionCreate,
  CertificacionUpdate,
  Etapa,
  EtapaCreate,
  EtapaUpdate,
  FacturaServicio,
  FacturaServicioCreate,
  FacturaServicioUpdate,
  FacturaPagoValidacion,
  ItemFacturaServicio,
  ItemOferta,
  Oferta,
  OfertaCreate,
  OfertaUpdate,
  PagoFacturaServicio,
  PagoFacturaServicioCreate,
  PersonaEtapa,
  PersonaEtapaCreate,
  PersonaLiquidacion,
  PersonaLiquidacionInput,
  PersonaLiquidacionInputUpdate,
  PersonaLiquidacionValidacion,
  Servicio,
  ServicioCreate,
  ServicioUpdate,
  SolicitudServicio,
  SolicitudServicioCreate,
  SolicitudServicioUpdate,
  TareaEtapa,
  TareaEtapaCreate,
  TareaEtapaUpdate,
} from '@/types/servicio';
import type {
  Cliente,
  ClienteCreate,
  ClienteJuridica,
  ClienteNatural,
  ClienteTCP,
  Cuenta,
  TipoEntidad,
} from '@/types/ventas';
import type { Moneda } from '@/types/moneda';
import type {
  ContratoCreate,
  ContratoWithDetails,
  SuplementoCreate,
  SuplementoWithDetails,
} from '@/types/contrato';
import type { Usuario } from '@/types/usuario';
import type { CuentaDependenciaSesion } from '@/shared/domain/sesion';

export type {
  Certificacion,
  CertificacionCreate,
  CertificacionUpdate,
  Cliente,
  ClienteCreate,
  ClienteJuridica,
  ClienteNatural,
  ClienteTCP,
  ContratoCreate,
  ContratoWithDetails,
  Cuenta,
  CuentaDependenciaSesion,
  Etapa,
  EtapaCreate,
  EtapaUpdate,
  FacturaServicio,
  FacturaServicioCreate,
  FacturaServicioUpdate,
  FacturaPagoValidacion,
  ItemFacturaServicio,
  ItemOferta,
  Moneda,
  Oferta,
  OfertaCreate,
  OfertaUpdate,
  PagoFacturaServicio,
  PagoFacturaServicioCreate,
  PersonaEtapa,
  PersonaEtapaCreate,
  PersonaLiquidacion,
  PersonaLiquidacionInput,
  PersonaLiquidacionInputUpdate,
  PersonaLiquidacionValidacion,
  Servicio,
  ServicioCreate,
  ServicioUpdate,
  SolicitudServicio,
  SolicitudServicioCreate,
  SolicitudServicioUpdate,
  SuplementoCreate,
  SuplementoWithDetails,
  TareaEtapa,
  TareaEtapaCreate,
  TareaEtapaUpdate,
  TipoEntidad,
  Usuario,
};

export interface PagoDisponible {
  id_pago_factura_servicio: number;
  monto: number;
  monto_disponible: number;
  id_moneda?: number;
  fecha: string;
  doc_traza?: string;
}

export interface ConfirmarLiquidacionInput {
  devengado?: number;
  porcentaje_agencia?: number;
  tributario?: number;
  comision_bancaria?: number;
  comision_admin_obra?: number;
  gasto_empresa?: number;
  observaciones?: string;
  doc_pago_liquidacion?: string;
}

export interface FiltrosSolicitudes {
  estado?: string;
  search?: string;
}

export interface ProyectosRepositorio {
  getServicios(
    skip?: number,
    limit?: number,
    onTotal?: (total: number | null) => void,
    search?: string,
  ): Promise<Servicio[]>;
  createServicio(data: ServicioCreate): Promise<Servicio>;
  updateServicio(id: number, data: ServicioUpdate): Promise<Servicio>;
  deleteServicio(id: number): Promise<void>;

  getSolicitudes(
    skip?: number,
    limit?: number,
    onTotal?: (total: number | null) => void,
    filtros?: FiltrosSolicitudes,
  ): Promise<SolicitudServicio[]>;
  getSolicitud(id: number): Promise<SolicitudServicio>;
  createSolicitud(data: SolicitudServicioCreate): Promise<SolicitudServicio>;
  updateSolicitud(
    id: number,
    data: SolicitudServicioUpdate,
  ): Promise<SolicitudServicio>;
  deleteSolicitud(id: number): Promise<void>;

  getAllEtapas(): Promise<Etapa[]>;
  getEtapasBySolicitud(solicitudId: number): Promise<Etapa[]>;
  getEtapa(id: number): Promise<Etapa>;
  createEtapa(data: EtapaCreate): Promise<Etapa>;
  updateEtapa(id: number, data: EtapaUpdate): Promise<Etapa>;
  deleteEtapa(id: number): Promise<void>;

  getTareasByEtapa(etapaId: number): Promise<TareaEtapa[]>;
  createTareaEtapa(data: TareaEtapaCreate): Promise<TareaEtapa>;
  updateTareaEtapa(id: number, data: TareaEtapaUpdate): Promise<TareaEtapa>;
  deleteTareaEtapa(id: number): Promise<void>;

  getPersonasByEtapa(etapaId: number): Promise<PersonaEtapa[]>;
  createPersonaEtapa(data: PersonaEtapaCreate): Promise<PersonaEtapa>;
  deletePersonaEtapa(etapaId: number, personaId: number): Promise<void>;

  getFacturasServicio(
    skip?: number,
    limit?: number,
    onTotal?: (total: number | null) => void,
    search?: string,
  ): Promise<FacturaServicio[]>;
  getFacturaServicio(id: number): Promise<FacturaServicio>;
  createFacturaServicio(
    data: FacturaServicioCreate,
  ): Promise<FacturaServicio>;
  updateFacturaServicio(
    id: number,
    data: FacturaServicioUpdate,
  ): Promise<FacturaServicio>;
  deleteFacturaServicio(id: number): Promise<void>;
  validarPagoEtapa(etapaId: number): Promise<FacturaPagoValidacion>;
  getItemsByFactura(facturaId: number): Promise<ItemFacturaServicio[]>;
  aprobarFacturaServicio(id: number): Promise<FacturaServicio>;

  getOfertas(
    skip?: number,
    limit?: number,
    estado?: string,
    onTotal?: (total: number | null) => void,
    search?: string,
  ): Promise<Oferta[]>;
  createOferta(data: OfertaCreate): Promise<Oferta>;
  updateOferta(id: number, data: OfertaUpdate): Promise<Oferta>;
  deleteOferta(id: number): Promise<void>;
  getItemsByOferta(ofertaId: number): Promise<ItemOferta[]>;
  confirmarOferta(
    id: number,
    tipo?: 'FACTURA' | 'PREFACTURA',
  ): Promise<FacturaServicio>;

  getPagosByFactura(facturaId: number): Promise<PagoFacturaServicio[]>;
  createPago(data: PagoFacturaServicioCreate): Promise<PagoFacturaServicio>;
  deletePago(id: number): Promise<void>;

  getCertificaciones(
    skip?: number,
    limit?: number,
    onTotal?: (total: number | null) => void,
  ): Promise<Certificacion[]>;
  getCertificacion(id: number): Promise<Certificacion>;
  getCertificacionesByEtapa(idEtapa: number): Promise<Certificacion[]>;
  createCertificacion(data: CertificacionCreate): Promise<Certificacion>;
  updateCertificacion(
    id: number,
    data: CertificacionUpdate,
  ): Promise<Certificacion>;
  deleteCertificacion(id: number): Promise<void>;

  getLiquidaciones(
    skip?: number,
    limit?: number,
    onTotal?: (total: number | null) => void,
    search?: string,
  ): Promise<PersonaLiquidacion[]>;
  getLiquidacion(id: number): Promise<PersonaLiquidacion>;
  createLiquidacion(
    data: PersonaLiquidacionInput,
  ): Promise<PersonaLiquidacion>;
  updateLiquidacion(
    id: number,
    data: PersonaLiquidacionInputUpdate,
  ): Promise<PersonaLiquidacion>;
  deleteLiquidacion(id: number): Promise<void>;
  confirmarLiquidacion(
    id: number,
    data: ConfirmarLiquidacionInput,
  ): Promise<PersonaLiquidacion>;
  validarLiquidar(
    idEtapa: number,
    idPersona: number,
  ): Promise<PersonaLiquidacionValidacion>;
  getPagosDisponibles(idEtapa: number): Promise<PagoDisponible[]>;
  getDisponibleLiquidar(
    idEtapa: number,
    idPersona: number,
  ): Promise<{ disponible: number }>;

  getContratos(
    skip?: number,
    limit?: number,
    idCliente?: number,
    search?: string,
    onTotal?: (total: number | null) => void,
  ): Promise<ContratoWithDetails[]>;
  getContrato(id: number): Promise<ContratoWithDetails>;
  createContrato(data: ContratoCreate): Promise<ContratoWithDetails>;
  getSuplementosByContrato(
    contratoId: number,
    skip?: number,
    limit?: number,
    search?: string,
  ): Promise<SuplementoWithDetails[]>;
  getSuplemento(id: number): Promise<SuplementoWithDetails>;
  createSuplemento(data: SuplementoCreate): Promise<SuplementoWithDetails>;

  getClientes(
    skip?: number,
    limit?: number,
    tipoRelacion?: string,
    search?: string,
    onTotal?: (total: number | null) => void,
  ): Promise<Cliente[]>;
  getCliente(id: number): Promise<Cliente>;
  createCliente(data: ClienteCreate): Promise<Cliente>;
  getPersonasNaturales(): Promise<ClienteNatural[]>;
  getTiposEntidad(): Promise<TipoEntidad[]>;

  getMonedas(skip?: number, limit?: number): Promise<Moneda[]>;
  getCuentasByClienteAll(clienteId: number): Promise<Cuenta[]>;
  getCuentasByDependencia(
    idDependencia: number,
  ): Promise<CuentaDependenciaSesion[]>;
  getEstadosContrato(): Promise<
    { id_estado_contrato: number; nombre: string; descripcion?: string }[]
  >;
  getUsuarios(): Promise<Usuario[]>;
}
