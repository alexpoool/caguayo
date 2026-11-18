import { PagoResultadoDetallePage } from '../../../features/rrhh/ui/PagoResultadoDetallePage';
import { casosUsoRrhh } from './casos-uso';
import { ConCasosUso } from './ConCasosUso';

export function PagoResultadoDetallePageContainer() {
  return (
    <ConCasosUso>
      <PagoResultadoDetallePage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}
