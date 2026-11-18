import { AuditoriaPage } from '../../../features/rrhh/ui/AuditoriaPage';
import { casosUsoRrhh } from './casos-uso';
import { ConCasosUso } from './ConCasosUso';

export function AuditoriaPageContainer() {
  return (
    <ConCasosUso>
      <AuditoriaPage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}
