import { ObjetivosPage } from '../../../features/rrhh/ui/ObjetivosPage';
import { casosUsoRrhh } from './casos-uso';
import { ConCasosUso } from './ConCasosUso';

export function ObjetivosPageContainer() {
  return (
    <ConCasosUso>
      <ObjetivosPage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}
