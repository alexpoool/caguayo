import type { ResumenDashboard } from '../domain/dashboard';

export type TendenciaVentas = 'up' | 'down' | 'neutral';

export interface ResultadoTendencia {
  trend: TendenciaVentas;
  value: number;
}

/** Traduce el crecimiento porcentual de la API a una tendencia visual. */
export function calcularTendencia(
  stats: ResumenDashboard | undefined,
): ResultadoTendencia {
  if (!stats) return { trend: 'neutral', value: 0 };
  if (stats.ventas_crecimiento_porcentaje > 0) {
    return { trend: 'up', value: stats.ventas_crecimiento_porcentaje };
  }
  if (stats.ventas_crecimiento_porcentaje < 0) {
    return { trend: 'down', value: stats.ventas_crecimiento_porcentaje };
  }
  return { trend: 'neutral', value: 0 };
}
