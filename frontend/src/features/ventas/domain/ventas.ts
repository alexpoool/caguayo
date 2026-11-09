import type { ProductoConCantidad, Productos } from '@/types/index';
import type { Moneda } from '@/types/moneda';
import type { Pago, PagoCreate } from '@/types/pago';
import type { Dependencia } from '@/types/dependencia';
import type { SolicitudServicio, SolicitudServicioUpdate } from '@/types/servicio';
import type {
  Cliente,
  ClienteCreate,
  Cuenta,
} from '@/types/ventas';
import type {
  ContratoCreate,
  ContratoUpdate,
  ContratoWithDetails,
  FacturaCreate,
  FacturaUpdate,
  FacturaWithDetails,
  OfertaTiendaCreate,
  OfertaTiendaUpdate,
  OfertaTiendaWithDetails,
  SuplementoCreate,
  SuplementoUpdate,
  SuplementoWithDetails,
  VentaEfectivoCreate,
  VentaEfectivoUpdate,
  VentaEfectivoWithDetails,
} from '@/types/contrato';
import type { CuentaDependenciaSesion } from '@/shared/domain/sesion';

export type {
  Cliente,
  ClienteCreate,
  ContratoCreate,
  ContratoUpdate,
  ContratoWithDetails,
  Cuenta,
  CuentaDependenciaSesion,
  Dependencia,
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
  Productos,
  SolicitudServicio,
  SolicitudServicioUpdate,
  SuplementoCreate,
  SuplementoUpdate,
  SuplementoWithDetails,
  VentaEfectivoCreate,
  VentaEfectivoUpdate,
  VentaEfectivoWithDetails,
};

export interface TipoContrato {
  id_tipo_contrato: number;
  nombre: string;
  descripcion?: string;
}

export interface EstadoContrato {
  id_estado_contrato: number;
  nombre: string;
  descripcion?: string;
}

export interface ValidacionExistencias {
  valido: boolean;
  errores: { mensaje: string }[];
}

export interface ExistenciaHibrida {
  id_producto: number;
  stock: number;
}

/** Puerto de ventas. La UI no conoce servicios ni HTTP. */
export interface VentasRepositorio {
  listarContratos(
    skip?: number,
    limit?: number,
    clienteId?: number,
    search?: string,
    onTotal?: (total: number | null) => void,
  ): Promise<ContratoWithDetails[]>;
  obtenerContrato(id: number): Promise<ContratoWithDetails>;
  crearContrato(data: ContratoCreate): Promise<ContratoWithDetails>;
  actualizarContrato(
    id: number,
    data: ContratoUpdate,
  ): Promise<ContratoWithDetails>;
  eliminarContrato(id: number): Promise<void>;
  actualizarSolicitud(
    id: number,
    data: SolicitudServicioUpdate,
  ): Promise<SolicitudServicio>;

  listarClientes(
    skip?: number,
    limit?: number,
    tipoRelacion?: string,
    search?: string,
    onTotal?: (total: number | null) => void,
  ): Promise<Cliente[]>;
  obtenerCliente(id: number): Promise<Cliente>;
  crearCliente(data: ClienteCreate): Promise<Cliente>;
  listarMonedas(): Promise<Moneda[]>;
  listarDependencias(
    search?: string,
    skip?: number,
    limit?: number,
  ): Promise<Dependencia[]>;
  listarCuentasDependencia(
    idDependencia: number,
  ): Promise<CuentaDependenciaSesion[]>;
  listarCuentasCliente(idCliente: number): Promise<Cuenta[]>;

  obtenerEstadosContrato(): Promise<EstadoContrato[]>;
  obtenerTiposContrato(): Promise<TipoContrato[]>;

  listarSuplementos(
    skip?: number,
    limit?: number,
    onTotal?: (total: number | null) => void,
    search?: string,
  ): Promise<SuplementoWithDetails[]>;
  listarSuplementosPorContrato(
    contratoId: number,
    skip?: number,
    limit?: number,
    search?: string,
  ): Promise<SuplementoWithDetails[]>;
  crearSuplemento(data: SuplementoCreate): Promise<SuplementoWithDetails>;
  actualizarSuplemento(
    id: number,
    data: SuplementoUpdate,
  ): Promise<SuplementoWithDetails>;
  eliminarSuplemento(id: number): Promise<void>;

  listarFacturas(
    skip?: number,
    limit?: number,
    tipo?: 'FACTURA' | 'PREFACTURA',
  ): Promise<FacturaWithDetails[]>;
  listarFacturasPorContrato(
    contratoId: number,
    tipo?: 'FACTURA' | 'PREFACTURA',
  ): Promise<FacturaWithDetails[]>;
  crearFactura(data: FacturaCreate): Promise<FacturaWithDetails>;
  actualizarFactura(
    id: number,
    data: FacturaUpdate,
  ): Promise<FacturaWithDetails>;
  eliminarFactura(id: number): Promise<void>;
  aprobarFactura(id: number): Promise<FacturaWithDetails>;

  listarPagosFactura(facturaId: number): Promise<Pago[]>;
  crearPago(data: PagoCreate): Promise<Pago>;
  eliminarPago(id: number): Promise<void>;

  listarOfertas(
    skip?: number,
    limit?: number,
    estado?: string,
    onTotal?: (total: number | null) => void,
  ): Promise<OfertaTiendaWithDetails[]>;
  listarOfertasPorContrato(
    contratoId: number,
    estado?: string,
  ): Promise<OfertaTiendaWithDetails[]>;
  crearOferta(data: OfertaTiendaCreate): Promise<OfertaTiendaWithDetails>;
  actualizarOferta(
    id: number,
    data: OfertaTiendaUpdate,
  ): Promise<OfertaTiendaWithDetails>;
  eliminarOferta(id: number): Promise<void>;
  convertirOferta(
    id: number,
    tipo?: 'FACTURA' | 'PREFACTURA',
  ): Promise<FacturaWithDetails>;

  listarVentasEfectivo(
    skip?: number,
    limit?: number,
    onTotal?: (total: number | null) => void,
    search?: string,
  ): Promise<VentaEfectivoWithDetails[]>;
  crearVentaEfectivo(
    data: VentaEfectivoCreate,
  ): Promise<VentaEfectivoWithDetails>;
  actualizarVentaEfectivo(
    id: number,
    data: VentaEfectivoUpdate,
  ): Promise<VentaEfectivoWithDetails>;
  eliminarVentaEfectivo(id: number): Promise<void>;

  listarProductosConStockItemAnexo(): Promise<ProductoConCantidad[]>;
  validarExistencias(
    productos: { id_producto: number; cantidad: number }[],
    dependenciaId?: number,
    anexoId?: number,
  ): Promise<ValidacionExistencias>;
  listarExistenciasHibridas(
    dependenciaId?: number,
    anexoId?: number,
  ): Promise<ExistenciaHibrida[]>;
}
