import { PagosResultadoPage } from '../../../features/rrhh/ui/PagosResultadoPage';
import { casosUsoRrhh } from './casos-uso';
import { ConCasosUso } from './ConCasosUso';

export function PagosResultadoPageContainer() {
  return (
    <ConCasosUso>
      <PagosResultadoPage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}
