import { SolicitudesPage } from '../../../features/proyectos/ui/SolicitudesPage';
import { casosUsoProyectos } from './casos-uso';

export function SolicitudesPageContainer() {
  return <SolicitudesPage casosUso={casosUsoProyectos} />;
}
