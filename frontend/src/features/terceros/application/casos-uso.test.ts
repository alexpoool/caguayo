import { describe, expect, it, vi } from 'vitest';
import { crearCasosUsoTerceros } from './casos-uso';
import type {
  Cliente,
  ClienteConVentas,
  Cuenta,
  TercerosRepositorio,
} from '../domain/terceros';

const cliente: Cliente = {
  id_cliente: 1,
  codigo: 'C-001',
  nombre: 'Cliente',
  tipo_persona: 'NATURAL',
  nit: 'V-1',
  direccion: 'Calle 1',
  tipo_relacion: 'CLIENTE',
  estado: 'ACTIVO',
  fecha_registro: '2026-01-01',
};

const clienteConVentas: ClienteConVentas = {
  ...cliente,
  ventas: [
    {
      id_venta: 1,
      fecha: '2026-01-02',
      total: 10,
      estado: 'COMPLETADA',
    },
  ],
};

const cuenta: Cuenta = {
  id_cuenta: 1,
  titular: 'Cliente',
  banco: 'Banco',
  direccion: 'Calle 1',
};

function repoFalso(
  overrides: Partial<TercerosRepositorio> = {},
): TercerosRepositorio {
  return {
    listarClientes: vi.fn().mockResolvedValue([cliente]),
    obtenerCliente: vi.fn().mockResolvedValue(cliente),
    obtenerClienteConVentas: vi.fn().mockResolvedValue(clienteConVentas),
    crearCliente: vi.fn().mockResolvedValue(cliente),
    actualizarCliente: vi.fn().mockResolvedValue(cliente),
    eliminarCliente: vi.fn().mockResolvedValue(undefined),
    obtenerClienteNatural: vi.fn().mockResolvedValue(null),
    obtenerClienteJuridica: vi.fn().mockResolvedValue(null),
    obtenerClienteTCP: vi.fn().mockResolvedValue(null),
    listarTiposEntidad: vi.fn().mockResolvedValue([]),
    listarProvincias: vi.fn().mockResolvedValue([]),
    listarMunicipios: vi.fn().mockResolvedValue([]),
    listarMonedas: vi.fn().mockResolvedValue([]),
    listarEspecialidades: vi.fn().mockResolvedValue([]),
    listarCuentasCliente: vi.fn().mockResolvedValue([cuenta]),
    crearCuenta: vi.fn().mockResolvedValue(cuenta),
    actualizarCuenta: vi.fn().mockResolvedValue(cuenta),
    eliminarCuenta: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('crearCasosUsoTerceros', () => {
  it('delega el CRUD de clientes y proveedores', async () => {
    const repo = repoFalso();
    const casos = crearCasosUsoTerceros(repo);
    const onTotal = vi.fn();
    const filtros = { tipoPersona: 'NATURAL' as const, idTipoEntidad: 2 };
    const nuevo = {
      codigo: 'C-002',
      nombre: 'Nuevo',
      tipo_persona: 'JURIDICA' as const,
    };

    await expect(
      casos.listarClientes(0, 50, 'CLIENTE', 'x', onTotal, filtros),
    ).resolves.toEqual([cliente]);
    await expect(casos.obtenerCliente(1)).resolves.toBe(cliente);
    await expect(casos.obtenerClienteConVentas(1)).resolves.toBe(
      clienteConVentas,
    );
    await casos.crearCliente(nuevo);
    await casos.actualizarCliente(1, { nombre: 'Editado' });
    await casos.eliminarCliente(1);

    expect(repo.listarClientes).toHaveBeenCalledWith(
      0,
      50,
      'CLIENTE',
      'x',
      onTotal,
      filtros,
    );
    expect(repo.obtenerCliente).toHaveBeenCalledWith(1);
    expect(repo.obtenerClienteConVentas).toHaveBeenCalledWith(1);
    expect(repo.crearCliente).toHaveBeenCalledWith(nuevo);
    expect(repo.actualizarCliente).toHaveBeenCalledWith(1, {
      nombre: 'Editado',
    });
    expect(repo.eliminarCliente).toHaveBeenCalledWith(1);
  });

  it('delega datos específicos y catálogos', async () => {
    const repo = repoFalso();
    const casos = crearCasosUsoTerceros(repo);

    await casos.obtenerClienteNatural(1);
    await casos.obtenerClienteJuridica(1);
    await casos.obtenerClienteTCP(1);
    await casos.listarTiposEntidad();
    await casos.listarProvincias();
    await casos.listarMunicipios(2);
    await casos.listarMonedas();
    await casos.listarEspecialidades(true);

    expect(repo.obtenerClienteNatural).toHaveBeenCalledWith(1);
    expect(repo.obtenerClienteJuridica).toHaveBeenCalledWith(1);
    expect(repo.obtenerClienteTCP).toHaveBeenCalledWith(1);
    expect(repo.listarTiposEntidad).toHaveBeenCalledOnce();
    expect(repo.listarProvincias).toHaveBeenCalledOnce();
    expect(repo.listarMunicipios).toHaveBeenCalledWith(2);
    expect(repo.listarMonedas).toHaveBeenCalledOnce();
    expect(repo.listarEspecialidades).toHaveBeenCalledWith(true);
  });

  it('delega cuentas bancarias', async () => {
    const repo = repoFalso();
    const casos = crearCasosUsoTerceros(repo);

    await expect(casos.listarCuentasCliente(1)).resolves.toEqual([cuenta]);
    await casos.crearCuenta({ titular: 'Cliente', banco: 'Banco' });
    await casos.actualizarCuenta(1, { banco: 'Otro' });
    await casos.eliminarCuenta(1);

    expect(repo.listarCuentasCliente).toHaveBeenCalledWith(1);
    expect(repo.crearCuenta).toHaveBeenCalledWith({
      titular: 'Cliente',
      banco: 'Banco',
    });
    expect(repo.actualizarCuenta).toHaveBeenCalledWith(1, { banco: 'Otro' });
    expect(repo.eliminarCuenta).toHaveBeenCalledWith(1);
  });
});
