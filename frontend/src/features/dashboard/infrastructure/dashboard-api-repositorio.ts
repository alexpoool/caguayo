import { apiClient } from '@/shared/infrastructure/http/api';
import type {
  DashboardRepositorio,
  ResumenDashboard,
  TendenciasMovimientos,
  TendenciasVentas,
} from '../domain/dashboard';

/** Adaptador HTTP del puerto del dashboard. Único punto con `apiClient`. */
export const dashboardApiRepositorio: DashboardRepositorio = {
  obtenerEstadisticas: () =>
    apiClient.get<ResumenDashboard>('/dashboard/stats'),

  obtenerTendenciasVentas: (dias = 7) =>
    apiClient.get<TendenciasVentas>(`/dashboard/trends?dias=${dias}`),

  obtenerTendenciasMovimientos: (dias = 7) =>
    apiClient.get<TendenciasMovimientos>(
      `/dashboard/movimientos-trends?dias=${dias}`,
    ),
};
