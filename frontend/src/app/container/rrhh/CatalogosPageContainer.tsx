import { CatalogosPage } from '../../../features/rrhh/ui/CatalogosPage';
import { casosUsoRrhh } from './casos-uso';
import { ConCasosUso } from './ConCasosUso';

export function CatalogosPageContainer(props: {
  tabInicial?: string;
  onCambiarTab?: (id: string) => void;
}) {
  return (
    <ConCasosUso>
      <CatalogosPage casosUso={casosUsoRrhh} {...props} />
    </ConCasosUso>
  );
}
