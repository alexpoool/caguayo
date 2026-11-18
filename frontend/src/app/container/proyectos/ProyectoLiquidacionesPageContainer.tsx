import { LiquidacionesPage } from '../../../features/proyectos/ui/LiquidacionesPage';
import { casosUsoProyectos } from './casos-uso';

export function ProyectoLiquidacionesPageContainer() {
  return <LiquidacionesPage casosUso={casosUsoProyectos} />;
}
