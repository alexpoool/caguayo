import { EmpleadosPage } from '../../../features/rrhh/ui/EmpleadosPage';
import { casosUsoRrhh } from './casos-uso';
import { ConCasosUso } from './ConCasosUso';

export function EmpleadosPageContainer() {
  return (
    <ConCasosUso>
      <EmpleadosPage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}
