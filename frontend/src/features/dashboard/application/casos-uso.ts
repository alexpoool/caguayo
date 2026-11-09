import type { DashboardRepositorio } from '../domain/dashboard';

export const DIAS_TENDENCIA_POR_DEFECTO = 7;

/**
 * Casos de uso del dashboard. Orquestan el puerto y no conocen React,
 * `fetch`, `apiClient` ni la forma concreta de la API.
 */
export function crearCasosUsoDashboard(repositorio: DashboardRepositorio) {
  return {
    obtenerEstadisticas: () => repositorio.obtenerEstadisticas(),

    obtenerTendenciasVentas: (dias = DIAS_TENDENCIA_POR_DEFECTO) =>
      repositorio.obtenerTendenciasVentas(dias),

    obtenerTendenciasMovimientos: (dias = DIAS_TENDENCIA_POR_DEFECTO) =>
      repositorio.obtenerTendenciasMovimientos(dias),
  };
}

export type CasosUsoDashboard = ReturnType<typeof crearCasosUsoDashboard>;
