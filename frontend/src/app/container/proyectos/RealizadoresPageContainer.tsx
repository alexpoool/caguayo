import { RealizadoresPage } from '../../../features/proyectos/ui/RealizadoresPage';
import { casosUsoProyectos } from './casos-uso';

export function RealizadoresPageContainer() {
  return <RealizadoresPage casosUso={casosUsoProyectos} />;
}
