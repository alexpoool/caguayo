import { TareasEtapaPage } from '../../../features/proyectos/ui/TareasEtapaPage';
import { casosUsoProyectos } from './casos-uso';

export function TareasEtapaPageContainer() {
  return <TareasEtapaPage casosUso={casosUsoProyectos} />;
}
