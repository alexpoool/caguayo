import { EvaluacionDetallePage } from '../../../features/rrhh/ui/EvaluacionDetallePage';
import { casosUsoRrhh } from './casos-uso';
import { ConCasosUso } from './ConCasosUso';

export function EvaluacionDetallePageContainer() {
  return (
    <ConCasosUso>
      <EvaluacionDetallePage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}
