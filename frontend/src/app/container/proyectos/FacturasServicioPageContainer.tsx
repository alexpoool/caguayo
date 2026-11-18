import { FacturasServicioPage } from '../../../features/proyectos/ui/FacturasServicioPage';
import { casosUsoProyectos } from './casos-uso';

export function FacturasServicioPageContainer() {
  return <FacturasServicioPage casosUso={casosUsoProyectos} />;
}
