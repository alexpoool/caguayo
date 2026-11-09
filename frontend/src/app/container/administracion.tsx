import { crearCasosUsoAdministracion } from '../../features/administracion/application/casos-uso';
import { administracionApiRepositorio } from '../../features/administracion/infrastructure/administracion-api-repositorio';
import { ConfiguracionPage } from '../../features/administracion/ui/ConfiguracionPage';
import { CuentasPage } from '../../features/administracion/ui/CuentasPage';
import { DependenciasPage } from '../../features/administracion/ui/DependenciasPage';
import { GruposPage } from '../../features/administracion/ui/GruposPage';
import { MonedasPage } from '../../features/administracion/ui/MonedasPage';
import { RespaldosPage } from '../../features/administracion/ui/RespaldosPage';
import { UsuariosPage } from '../../features/administracion/ui/UsuariosPage';
import { UsuariosCredencialesPage } from '../../features/administracion/ui/UsuariosCredencialesPage';

/** Composition root de Administración: única unión de puerto y adaptador. */
const casosUsoAdministracion = crearCasosUsoAdministracion(
  administracionApiRepositorio,
);

export function ConfiguracionPageContainer() {
  return <ConfiguracionPage casosUso={casosUsoAdministracion} />;
}

export function CuentasPageContainer() {
  return <CuentasPage casosUso={casosUsoAdministracion} />;
}

export function DependenciasPageContainer() {
  return <DependenciasPage casosUso={casosUsoAdministracion} />;
}

export function GruposPageContainer() {
  return <GruposPage casosUso={casosUsoAdministracion} />;
}

export function MonedasPageContainer() {
  return <MonedasPage casosUso={casosUsoAdministracion} />;
}

export function RespaldosPageContainer() {
  return <RespaldosPage casosUso={casosUsoAdministracion} />;
}

export function UsuariosPageContainer() {
  return <UsuariosPage casosUso={casosUsoAdministracion} />;
}

export function UsuariosCredencialesPageContainer() {
  return <UsuariosCredencialesPage casosUso={casosUsoAdministracion} />;
}
