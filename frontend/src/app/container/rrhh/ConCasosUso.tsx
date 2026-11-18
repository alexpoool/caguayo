import type { ReactNode } from 'react';
import { CasosUsoRrhhProvider } from '../../../features/rrhh/ui/casos-uso-context';
import { casosUsoRrhh } from './casos-uso';

/** Provee los casos de uso de RRHH a las páginas que los consumen. */
export function ConCasosUso({ children }: { children: ReactNode }) {
  return (
    <CasosUsoRrhhProvider casosUso={casosUsoRrhh}>
      {children}
    </CasosUsoRrhhProvider>
  );
}
