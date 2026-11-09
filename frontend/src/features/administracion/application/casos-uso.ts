import type { AdministracionRepositorio } from '../domain/administracion';

/** Casos de uso de Administración. Sin React ni HTTP. */
export function crearCasosUsoAdministracion(
  repositorio: AdministracionRepositorio,
) {
  return { ...repositorio };
}

export type CasosUsoAdministracion = ReturnType<
  typeof crearCasosUsoAdministracion
>;
