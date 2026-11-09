import { crearCasosUsoTerceros } from '../../features/terceros/application/casos-uso';
import { crearTercerosApiRepositorio } from '../../features/terceros/infrastructure/terceros-api-repositorio';
import { ClientesPage } from '../../features/terceros/ui/ClientesPage';
import { CuentasClientePage } from '../../features/terceros/ui/CuentasClientePage';
import { PerfilClientePage } from '../../features/terceros/ui/PerfilClientePage';
import { TercerosHome } from '../../features/terceros/ui/TercerosHome';

/** Composition root de terceros: única unión de puerto y adaptador. */
const casosUsoTerceros = crearCasosUsoTerceros(
  crearTercerosApiRepositorio(),
);

export function ClientesPageContainer() {
  return <ClientesPage casosUso={casosUsoTerceros} />;
}

export function PerfilClientePageContainer() {
  return <PerfilClientePage casosUso={casosUsoTerceros} />;
}

export function CuentasClientePageContainer() {
  return <CuentasClientePage casosUso={casosUsoTerceros} />;
}

export function TercerosHomeContainer() {
  return <TercerosHome />;
}
