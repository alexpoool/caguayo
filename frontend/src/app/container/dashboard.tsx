import { crearCasosUsoDashboard } from '../../features/dashboard/application/casos-uso';
import { dashboardApiRepositorio } from '../../features/dashboard/infrastructure/dashboard-api-repositorio';
import { DashboardPage } from '../../features/dashboard/ui/DashboardPage';

/** Composition root del dashboard: única unión de puerto y adaptador. */
const casosUsoDashboard = crearCasosUsoDashboard(dashboardApiRepositorio);

export function DashboardPageContainer() {
  return <DashboardPage casosUso={casosUsoDashboard} />;
}
