import { PreFacturasPage } from '../../../features/proyectos/ui/PreFacturasPage';
import { casosUsoProyectos } from './casos-uso';

export function PreFacturasPageContainer() {
  return <PreFacturasPage casosUso={casosUsoProyectos} />;
}
