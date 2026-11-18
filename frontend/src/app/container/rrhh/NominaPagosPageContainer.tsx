import { NominaPagosPage } from '../../../features/rrhh/ui/NominaPagosPage';
import { casosUsoRrhh } from './casos-uso';
import { ConCasosUso } from './ConCasosUso';

export function NominaPagosPageContainer() {
  return (
    <ConCasosUso>
      <NominaPagosPage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}
