import { describe, expect, it, vi } from 'vitest';
import { crearCasosUsoReportes } from './casos-uso';
import type { ReportesRepositorio } from '../domain/reportes';

function repoFalso(
  overrides: Partial<ReportesRepositorio> = {},
): ReportesRepositorio {
  return {
    listarDependencias: vi.fn().mockResolvedValue([]),
    listarProvincias: vi.fn().mockResolvedValue([]),
    listarMunicipios: vi.fn().mockResolvedValue([]),
    listarMonedas: vi.fn().mockResolvedValue([]),
    consultarReporte: vi.fn().mockResolvedValue({}),
    generarReporte: vi.fn().mockResolvedValue(new Blob()),
    buscarProductosItemAnexo: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe('crearCasosUsoReportes', () => {
  it('delega catálogos y búsqueda de productos', async () => {
    const repo = repoFalso();
    const casos = crearCasosUsoReportes(repo);
    const controller = new AbortController();

    await casos.listarDependencias();
    await casos.listarProvincias();
    await casos.listarMunicipios(2);
    await casos.listarMonedas();
    await casos.buscarProductosItemAnexo('martillo', controller.signal);

    expect(repo.listarMunicipios).toHaveBeenCalledWith(2);
    expect(repo.buscarProductosItemAnexo).toHaveBeenCalledWith(
      'martillo',
      controller.signal,
    );
  });

  it('delega consulta y generación de reportes con sus parámetros', async () => {
    const repo = repoFalso();
    const casos = crearCasosUsoReportes(repo);
    const controller = new AbortController();
    const params = { id_dependencia: '4', notas: 'hola' };

    await casos.consultarReporte('/reportes/existencias/preview', params, controller.signal);
    await casos.generarReporte('/reportes/existencias', params);

    expect(repo.consultarReporte).toHaveBeenCalledWith(
      '/reportes/existencias/preview',
      params,
      controller.signal,
    );
    expect(repo.generarReporte).toHaveBeenCalledWith(
      '/reportes/existencias',
      params,
    );
  });
});
