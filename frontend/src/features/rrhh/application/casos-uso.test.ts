import { describe, expect, it, vi } from 'vitest';
import { crearCasosUsoRrhh } from './casos-uso';
import type { RrhhRepositorio } from '../domain/rrhh';

function repoFalso(overrides: Partial<RrhhRepositorio> = {}) {
  return {
    listarEmpleados: vi.fn().mockResolvedValue([]),
    crearEmpleado: vi.fn().mockResolvedValue({}),
    getMonedas: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as RrhhRepositorio;
}

describe('crearCasosUsoRrhh', () => {
  it('expone los métodos del repositorio', () => {
    const repo = repoFalso();
    const casos = crearCasosUsoRrhh(repo);

    expect(casos.listarEmpleados).toBe(repo.listarEmpleados);
    expect(casos.getMonedas).toBe(repo.getMonedas);
  });

  it('delega las llamadas con sus argumentos', async () => {
    const repo = repoFalso();
    const casos = crearCasosUsoRrhh(repo);
    const params = { limit: 10, activo: true };

    await casos.listarEmpleados(params);

    expect(repo.listarEmpleados).toHaveBeenCalledWith(params);
  });
});
