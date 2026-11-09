import type { RrhhRepositorio } from '../domain/rrhh';

/** Casos de uso de RRHH. Sin React ni HTTP. */
export function crearCasosUsoRrhh(repositorio: RrhhRepositorio) {
  return { ...repositorio };
}

export type CasosUsoRrhh = ReturnType<typeof crearCasosUsoRrhh>;
