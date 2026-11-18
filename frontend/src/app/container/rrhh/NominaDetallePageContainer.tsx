import { NominaDetallePage } from '../../../features/rrhh/ui/NominaDetallePage';
import { casosUsoRrhh } from './casos-uso';
import { ConCasosUso } from './ConCasosUso';

export function NominaDetallePageContainer() {
  return (
    <ConCasosUso>
      <NominaDetallePage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}
