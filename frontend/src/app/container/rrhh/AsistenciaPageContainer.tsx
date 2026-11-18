import { AsistenciaPage } from '../../../features/rrhh/ui/AsistenciaPage';
import { casosUsoRrhh } from './casos-uso';
import { ConCasosUso } from './ConCasosUso';

export function AsistenciaPageContainer() {
  return (
    <ConCasosUso>
      <AsistenciaPage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}
