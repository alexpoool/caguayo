import { EvaluacionesPage } from '../../../features/rrhh/ui/EvaluacionesPage';
import { casosUsoRrhh } from './casos-uso';
import { ConCasosUso } from './ConCasosUso';

export function EvaluacionesPageContainer() {
  return (
    <ConCasosUso>
      <EvaluacionesPage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}
