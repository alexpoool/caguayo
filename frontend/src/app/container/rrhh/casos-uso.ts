import { crearCasosUsoRrhh } from '../../../features/rrhh/application/casos-uso';
import { rrhhApiRepositorio } from '../../../features/rrhh/infrastructure/rrhh-api-repositorio';

/** Composition root de RRHH: única unión de puerto y adaptador. */
export const casosUsoRrhh = crearCasosUsoRrhh(rrhhApiRepositorio);
