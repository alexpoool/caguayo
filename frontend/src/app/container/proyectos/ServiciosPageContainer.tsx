import { ServiciosPage } from '../../../features/proyectos/ui/ServiciosPage';
import { casosUsoProyectos } from './casos-uso';

export function ServiciosPageContainer() {
  return <ServiciosPage casosUso={casosUsoProyectos} />;
}
