import { describe, expect, it, vi } from 'vitest';
import {
  DIAS_TENDENCIA_POR_DEFECTO,
  crearCasosUsoDashboard,
} from './casos-uso';
import type {
  DashboardRepositorio,
  ResumenDashboard,
  TendenciasMovimientos,
  TendenciasVentas,
} from '../domain/dashboard';

function repositorioFalso(): DashboardRepositorio {
  return {
    obtenerEstadisticas: vi
      .fn()
      .mockResolvedValue({} as ResumenDashboard),
    obtenerTendenciasVentas: vi
      .fn()
      .mockResolvedValue({} as TendenciasVentas),
    obtenerTendenciasMovimientos: vi
      .fn()
      .mockResolvedValue({} as TendenciasMovimientos),
  };
}

describe('casos de uso del dashboard', () => {
  it('delega las estadísticas en el repositorio', async () => {
    const repositorio = repositorioFalso();
    const casosUso = crearCasosUsoDashboard(repositorio);

    await casosUso.obtenerEstadisticas();

    expect(repositorio.obtenerEstadisticas).toHaveBeenCalledOnce();
  });

  it('usa siete días por defecto en ambas tendencias', async () => {
    const repositorio = repositorioFalso();
    const casosUso = crearCasosUsoDashboard(repositorio);

    await casosUso.obtenerTendenciasVentas();
    await casosUso.obtenerTendenciasMovimientos();

    expect(repositorio.obtenerTendenciasVentas).toHaveBeenCalledWith(
      DIAS_TENDENCIA_POR_DEFECTO,
    );
    expect(repositorio.obtenerTendenciasMovimientos).toHaveBeenCalledWith(
      DIAS_TENDENCIA_POR_DEFECTO,
    );
  });

  it('respeta el periodo indicado por la UI', async () => {
    const repositorio = repositorioFalso();
    const casosUso = crearCasosUsoDashboard(repositorio);

    await casosUso.obtenerTendenciasVentas(30);
    await casosUso.obtenerTendenciasMovimientos(15);

    expect(repositorio.obtenerTendenciasVentas).toHaveBeenCalledWith(30);
    expect(repositorio.obtenerTendenciasMovimientos).toHaveBeenCalledWith(15);
  });
});
