import { OfertasPage } from '../../../features/proyectos/ui/OfertasPage';
import { casosUsoProyectos } from './casos-uso';

export function OfertasPageContainer() {
  return <OfertasPage casosUso={casosUsoProyectos} />;
}
