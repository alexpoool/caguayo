import { PagoResultadoNuevoPage } from '../../../features/rrhh/ui/PagoResultadoNuevoPage';
import { casosUsoRrhh } from './casos-uso';
import { ConCasosUso } from './ConCasosUso';

export function PagoResultadoNuevoPageContainer() {
  return (
    <ConCasosUso>
      <PagoResultadoNuevoPage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}
