/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from 'react';
import type { CasosUsoRrhh } from '../application/casos-uso';

const CasosUsoRrhhContext = createContext<CasosUsoRrhh | null>(null);

export function CasosUsoRrhhProvider({
  casosUso,
  children,
}: {
  casosUso: CasosUsoRrhh;
  children: ReactNode;
}) {
  return (
    <CasosUsoRrhhContext.Provider value={casosUso}>
      {children}
    </CasosUsoRrhhContext.Provider>
  );
}

/** Acceso a los casos de uso de RRHH desde componentes anidados. */
export function useCasosUsoRrhh(): CasosUsoRrhh {
  const casosUso = useContext(CasosUsoRrhhContext);
  if (!casosUso) {
    throw new Error('useCasosUsoRrhh debe usarse dentro de su proveedor');
  }
  return casosUso;
}
