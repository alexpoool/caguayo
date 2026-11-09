import { crearCasosUsoAuth } from "../../features/auth/application/casos-uso";
import { authApiRepositorio } from "../../features/auth/infrastructure/auth-api-repositorio";

/** Composition root de autenticación. */
export const casosUsoAuth = crearCasosUsoAuth(authApiRepositorio);
