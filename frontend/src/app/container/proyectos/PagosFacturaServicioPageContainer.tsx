import { PagosFacturaServicioPage } from '../../../features/proyectos/ui/PagosFacturaServicioPage';
import { casosUsoProyectos } from './casos-uso';

export function PagosFacturaServicioPageContainer() {
  return <PagosFacturaServicioPage casosUso={casosUsoProyectos} />;
}
