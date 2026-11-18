import { PuestosPage } from '../../../features/rrhh/ui/PuestosPage';
import { casosUsoRrhh } from './casos-uso';
import { ConCasosUso } from './ConCasosUso';

export function PuestosPageContainer() {
  return (
    <ConCasosUso>
      <PuestosPage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}
