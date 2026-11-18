import { NominaPage } from '../../../features/rrhh/ui/NominaPage';
import { casosUsoRrhh } from './casos-uso';
import { ConCasosUso } from './ConCasosUso';

export function NominaPageContainer() {
  return (
    <ConCasosUso>
      <NominaPage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}
