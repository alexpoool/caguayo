import { CertificacionesPage } from '../../../features/proyectos/ui/CertificacionesPage';
import { casosUsoProyectos } from './casos-uso';

export function CertificacionesPageContainer() {
  return <CertificacionesPage casosUso={casosUsoProyectos} />;
}
