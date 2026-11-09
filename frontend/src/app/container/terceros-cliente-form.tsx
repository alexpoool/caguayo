import { crearCasosUsoTerceros } from '../../features/terceros/application/casos-uso';
import { crearTercerosApiRepositorio } from '../../features/terceros/infrastructure/terceros-api-repositorio';
import {
  ClienteForm,
  type ClienteFormProps,
} from '../../features/terceros/ui/components/form/ClienteForm';

/** Formulario de cliente con sus casos de uso inyectados. */
const casosUsoTerceros = crearCasosUsoTerceros(
  crearTercerosApiRepositorio(),
);

export function ClienteFormContainer(
  props: Omit<ClienteFormProps, 'casosUso'>,
) {
  return <ClienteForm {...props} casosUso={casosUsoTerceros} />;
}
