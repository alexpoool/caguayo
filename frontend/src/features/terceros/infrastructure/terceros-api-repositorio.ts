import type {
  Cliente,
  ClienteConVentas,
  ClienteCreate,
  ClienteJuridica,
  ClienteNatural,
  ClienteTCP,
  ClienteUpdate,
  Cuenta,
  Especialidad,
  FiltrosClientes,
  Moneda,
  Municipio,
  Provincia,
  TercerosRepositorio,
  TipoEntidad,
} from '../domain/terceros';
import {
  clienteJuridicaService,
  clienteNaturalService,
  clienteTCPService,
  clientesService,
  cuentasService,
  monedaService,
  tiposEntidadService,
} from '@/services/api';
import {
  configuracionService,
  dependenciasService,
} from '@/services/administracion';

/** Adaptador temporal sobre los servicios legacy. */
export function crearTercerosApiRepositorio(): TercerosRepositorio {
  return {
    listarClientes(
      skip = 0,
      limit = 100,
      tipoRelacion?: string,
      search?: string,
      onTotal?: (total: number | null) => void,
      filtros?: FiltrosClientes,
    ): Promise<Cliente[]> {
      return clientesService.getClientes(
        skip,
        limit,
        tipoRelacion,
        search,
        onTotal,
        filtros,
      );
    },

    obtenerCliente: (id: number): Promise<Cliente> =>
      clientesService.getCliente(id),

    obtenerClienteConVentas: (id: number): Promise<ClienteConVentas> =>
      clientesService.getClienteWithVentas(id),

    crearCliente: (data: ClienteCreate): Promise<Cliente> =>
      clientesService.createCliente(data),

    actualizarCliente: (id: number, data: ClienteUpdate): Promise<Cliente> =>
      clientesService.updateCliente(id, data),

    eliminarCliente: (id: number): Promise<void> =>
      clientesService.deleteCliente(id),

    obtenerClienteNatural: (id: number): Promise<ClienteNatural | null> =>
      clienteNaturalService.getClienteNatural(id),

    obtenerClienteJuridica: (id: number): Promise<ClienteJuridica | null> =>
      clienteJuridicaService.getClienteJuridica(id),

    obtenerClienteTCP: (id: number): Promise<ClienteTCP | null> =>
      clienteTCPService.getClienteTCP(id),

    listarTiposEntidad: (): Promise<TipoEntidad[]> =>
      tiposEntidadService.getTiposEntidad(),

    listarProvincias: (): Promise<Provincia[]> =>
      dependenciasService.getProvincias(),

    listarMunicipios: (provinciaId?: number): Promise<Municipio[]> =>
      dependenciasService.getMunicipios(provinciaId),

    listarMonedas: (): Promise<Moneda[]> => monedaService.getMonedas(),

    listarEspecialidades: (
      soloActivas = false,
    ): Promise<Especialidad[]> =>
      configuracionService.getEspecialidades(soloActivas),

    listarCuentasCliente: (idCliente: number): Promise<Cuenta[]> =>
      cuentasService.getCuentasByCliente(idCliente),

    crearCuenta: (data: Partial<Cuenta>): Promise<Cuenta> =>
      cuentasService.createCuenta(data),

    actualizarCuenta: (id: number, data: Partial<Cuenta>): Promise<Cuenta> =>
      cuentasService.updateCuenta(id, data),

    eliminarCuenta: (id: number): Promise<void> =>
      cuentasService.deleteCuenta(id),
  };
}
