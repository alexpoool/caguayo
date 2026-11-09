import type { Especialidad, Moneda } from '@/types/index';
import type { Municipio, Provincia } from '@/types/ubicacion';
import type {
  Cliente,
  ClienteCreate,
  ClienteJuridica,
  ClienteNatural,
  ClienteTCP,
  ClienteUpdate,
  Cuenta,
  TipoEntidad,
} from '@/types/ventas';

export type {
  Cliente,
  ClienteCreate,
  ClienteJuridica,
  ClienteNatural,
  ClienteTCP,
  ClienteUpdate,
  Cuenta,
  Especialidad,
  Moneda,
  Municipio,
  Provincia,
  TipoEntidad,
};

export type FiltroTipoPersona =
  | 'TODOS'
  | 'NATURAL'
  | 'TCP'
  | 'JURIDICA'
  | `ENTIDAD:${number}`;

export interface FiltrosClientes {
  tipoPersona?: 'NATURAL' | 'JURIDICA' | 'TCP';
  idTipoEntidad?: number;
}

/** Resumen de venta necesario para el perfil del cliente. */
export interface VentaCliente {
  id_venta: number;
  fecha: string;
  total: number;
  estado: 'PENDIENTE' | 'COMPLETADA' | 'ANULADA';
  detalles?: unknown[];
}

export type ClienteConVentas = Cliente & {
  ventas: VentaCliente[];
};

/** Puerto de terceros. La UI no conoce servicios ni HTTP. */
export interface TercerosRepositorio {
  listarClientes(
    skip?: number,
    limit?: number,
    tipoRelacion?: string,
    search?: string,
    onTotal?: (total: number | null) => void,
    filtros?: FiltrosClientes,
  ): Promise<Cliente[]>;
  obtenerCliente(id: number): Promise<Cliente>;
  obtenerClienteConVentas(id: number): Promise<ClienteConVentas>;
  crearCliente(data: ClienteCreate): Promise<Cliente>;
  actualizarCliente(id: number, data: ClienteUpdate): Promise<Cliente>;
  eliminarCliente(id: number): Promise<void>;
  obtenerClienteNatural(id: number): Promise<ClienteNatural | null>;
  obtenerClienteJuridica(id: number): Promise<ClienteJuridica | null>;
  obtenerClienteTCP(id: number): Promise<ClienteTCP | null>;
  listarTiposEntidad(): Promise<TipoEntidad[]>;
  listarProvincias(): Promise<Provincia[]>;
  listarMunicipios(provinciaId?: number): Promise<Municipio[]>;
  listarMonedas(): Promise<Moneda[]>;
  listarEspecialidades(soloActivas?: boolean): Promise<Especialidad[]>;
  listarCuentasCliente(idCliente: number): Promise<Cuenta[]>;
  crearCuenta(data: Partial<Cuenta>): Promise<Cuenta>;
  actualizarCuenta(id: number, data: Partial<Cuenta>): Promise<Cuenta>;
  eliminarCuenta(id: number): Promise<void>;
}
