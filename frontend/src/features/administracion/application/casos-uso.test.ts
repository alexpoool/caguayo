import { describe, expect, it, vi } from 'vitest';
import { crearCasosUsoAdministracion } from './casos-uso';
import type { AdministracionRepositorio } from '../domain/administracion';

function repoFalso(overrides: Partial<AdministracionRepositorio> = {}) {
  return {
    getUsuarios: vi.fn().mockResolvedValue([]),
    createMoneda: vi.fn().mockResolvedValue({}),
    listarCredenciales: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as AdministracionRepositorio;
}

describe('crearCasosUsoAdministracion', () => {
  it('expone los métodos del repositorio', () => {
    const repo = repoFalso();
    const casos = crearCasosUsoAdministracion(repo);

    expect(casos.getUsuarios).toBe(repo.getUsuarios);
    expect(casos.listarCredenciales).toBe(repo.listarCredenciales);
  });

  it('delega las llamadas con sus argumentos', async () => {
    const repo = repoFalso();
    const casos = crearCasosUsoAdministracion(repo);
    const data = { nombre: 'Peso', sigla: 'CUP' };

    await casos.createMoneda(data as never);

    expect(repo.createMoneda).toHaveBeenCalledWith(data);
  });
});
