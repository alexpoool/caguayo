import { crearCasosUsoProyectos } from '../../../features/proyectos/application/casos-uso';
import { proyectosApiRepositorio } from '../../../features/proyectos/infrastructure/proyectos-api-repositorio';

/** Composition root de proyectos: única unión de puerto y adaptador. */
export const casosUsoProyectos = crearCasosUsoProyectos(proyectosApiRepositorio);
