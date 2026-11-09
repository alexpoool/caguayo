import type { ReactNode } from 'react';
import { crearCasosUsoRrhh } from '../../features/rrhh/application/casos-uso';
import { rrhhApiRepositorio } from '../../features/rrhh/infrastructure/rrhh-api-repositorio';
import { AsistenciaPage } from '../../features/rrhh/ui/AsistenciaPage';
import { AuditoriaPage } from '../../features/rrhh/ui/AuditoriaPage';
import { CatalogosPage } from '../../features/rrhh/ui/CatalogosPage';
import { EmpleadosPage } from '../../features/rrhh/ui/EmpleadosPage';
import { EvaluacionDetallePage } from '../../features/rrhh/ui/EvaluacionDetallePage';
import { EvaluacionesPage } from '../../features/rrhh/ui/EvaluacionesPage';
import { MovimientosPage } from '../../features/rrhh/ui/MovimientosPage';
import { NominaDetallePage } from '../../features/rrhh/ui/NominaDetallePage';
import { NominaPage } from '../../features/rrhh/ui/NominaPage';
import { NominaPagosPage } from '../../features/rrhh/ui/NominaPagosPage';
import { ObjetivosPage } from '../../features/rrhh/ui/ObjetivosPage';
import { PagoResultadoDetallePage } from '../../features/rrhh/ui/PagoResultadoDetallePage';
import { PagoResultadoNuevoPage } from '../../features/rrhh/ui/PagoResultadoNuevoPage';
import { PagosResultadoPage } from '../../features/rrhh/ui/PagosResultadoPage';
import { ReportesPage } from '../../features/rrhh/ui/ReportesPage';
import { SolicitudesPage } from '../../features/rrhh/ui/SolicitudesPage';
import { PuestosPage } from '../../features/rrhh/ui/PuestosPage';
import { CasosUsoRrhhProvider } from '../../features/rrhh/ui/casos-uso-context';

/** Composition root de RRHH: única unión de puerto y adaptador. */
const casosUsoRrhh = crearCasosUsoRrhh(rrhhApiRepositorio);

function ConCasosUso({ children }: { children: ReactNode }) {
  return (
    <CasosUsoRrhhProvider casosUso={casosUsoRrhh}>
      {children}
    </CasosUsoRrhhProvider>
  );
}

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

export function EmpleadosPageContainer() {
  return (
    <ConCasosUso>
      <EmpleadosPage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}

export function AsistenciaPageContainer() {
  return (
    <ConCasosUso>
      <AsistenciaPage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}

export function MovimientosPageContainer() {
  return (
    <ConCasosUso>
      <MovimientosPage />
    </ConCasosUso>
  );
}

export function NominaPageContainer() {
  return (
    <ConCasosUso>
      <NominaPage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}

export function NominaDetallePageContainer() {
  return (
    <ConCasosUso>
      <NominaDetallePage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}

export function NominaPagosPageContainer() {
  return (
    <ConCasosUso>
      <NominaPagosPage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}

export function PagosResultadoPageContainer() {
  return (
    <ConCasosUso>
      <PagosResultadoPage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}

export function PagoResultadoNuevoPageContainer() {
  return (
    <ConCasosUso>
      <PagoResultadoNuevoPage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}

export function PagoResultadoDetallePageContainer() {
  return (
    <ConCasosUso>
      <PagoResultadoDetallePage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}

export function SolicitudesPageContainer() {
  return (
    <ConCasosUso>
      <SolicitudesPage />
    </ConCasosUso>
  );
}

export function EvaluacionesPageContainer() {
  return (
    <ConCasosUso>
      <EvaluacionesPage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}

export function EvaluacionDetallePageContainer() {
  return (
    <ConCasosUso>
      <EvaluacionDetallePage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}

export function ObjetivosPageContainer() {
  return (
    <ConCasosUso>
      <ObjetivosPage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}

export function ReportesPageContainer() {
  return (
    <ConCasosUso>
      <ReportesPage />
    </ConCasosUso>
  );
}

export function AuditoriaPageContainer() {
  return (
    <ConCasosUso>
      <AuditoriaPage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}

export function PuestosPageContainer() {
  return (
    <ConCasosUso>
      <PuestosPage casosUso={casosUsoRrhh} />
    </ConCasosUso>
  );
}
