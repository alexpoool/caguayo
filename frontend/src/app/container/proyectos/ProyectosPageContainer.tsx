import { ProyectosPage } from '../../../features/proyectos/ui/ProyectosPage';
import { casosUsoProyectos } from './casos-uso';

export function ProyectosPageContainer() {
  return <ProyectosPage casosUso={casosUsoProyectos} />;
}
