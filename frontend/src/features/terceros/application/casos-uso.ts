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

/** Casos de uso de terceros. Sin React ni HTTP. */
export function crearCasosUsoTerceros(repositorio: TercerosRepositorio) {
  return {
    listarClientes(
      skip = 0,
      limit = 100,
      tipoRelacion?: string,
      search?: string,
      onTotal?: (total: number | null) => void,
      filtros?: FiltrosClientes,
    ): Promise<Cliente[]> {
      return repositorio.listarClientes(
        skip,
        limit,
        tipoRelacion,
        search,
        onTotal,
        filtros,
      );
    },

    obtenerCliente: (id: number): Promise<Cliente> =>
      repositorio.obtenerCliente(id),

    obtenerClienteConVentas: (id: number): Promise<ClienteConVentas> =>
      repositorio.obtenerClienteConVentas(id),

    crearCliente: (data: ClienteCreate): Promise<Cliente> =>
      repositorio.crearCliente(data),

    actualizarCliente: (id: number, data: ClienteUpdate): Promise<Cliente> =>
      repositorio.actualizarCliente(id, data),

    eliminarCliente: (id: number): Promise<void> =>
      repositorio.eliminarCliente(id),

    obtenerClienteNatural: (id: number): Promise<ClienteNatural | null> =>
      repositorio.obtenerClienteNatural(id),

    obtenerClienteJuridica: (id: number): Promise<ClienteJuridica | null> =>
      repositorio.obtenerClienteJuridica(id),

    obtenerClienteTCP: (id: number): Promise<ClienteTCP | null> =>
      repositorio.obtenerClienteTCP(id),

    listarTiposEntidad: (): Promise<TipoEntidad[]> =>
      repositorio.listarTiposEntidad(),

    listarProvincias: (): Promise<Provincia[]> => repositorio.listarProvincias(),

    listarMunicipios: (provinciaId?: number): Promise<Municipio[]> =>
      repositorio.listarMunicipios(provinciaId),

    listarMonedas: (): Promise<Moneda[]> => repositorio.listarMonedas(),

    listarEspecialidades: (
      soloActivas = false,
    ): Promise<Especialidad[]> =>
      repositorio.listarEspecialidades(soloActivas),

    listarCuentasCliente: (idCliente: number): Promise<Cuenta[]> =>
      repositorio.listarCuentasCliente(idCliente),

    crearCuenta: (data: Partial<Cuenta>): Promise<Cuenta> =>
      repositorio.crearCuenta(data),

    actualizarCuenta: (id: number, data: Partial<Cuenta>): Promise<Cuenta> =>
      repositorio.actualizarCuenta(id, data),

    eliminarCuenta: (id: number): Promise<void> =>
      repositorio.eliminarCuenta(id),
  };
}

export type CasosUsoTerceros = ReturnType<typeof crearCasosUsoTerceros>;
