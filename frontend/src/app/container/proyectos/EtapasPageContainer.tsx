import { EtapasPage } from '../../../features/proyectos/ui/EtapasPage';
import { casosUsoProyectos } from './casos-uso';

export function EtapasPageContainer() {
  return <EtapasPage casosUso={casosUsoProyectos} />;
}
