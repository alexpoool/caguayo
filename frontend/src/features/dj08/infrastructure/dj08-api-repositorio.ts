import { dj08Service } from "../../../services/api";
import type { Dj08Repositorio } from "../domain/dj08-repositorio";

/**
 * Adaptador HTTP del puerto DJ08. Es el único punto de la feature que conoce
 * `services/api`; sustituirlo por otro cliente no toca UI ni casos de uso.
 */
export const dj08ApiRepositorio: Dj08Repositorio = {
  listarActividades: () => dj08Service.listarActividades(),
  listarTributos: () => dj08Service.listarTributos(),
  listarDeclaraciones: () => dj08Service.listarDeclaraciones(),
  calcular: (entrada) => dj08Service.calcular(entrada),
  guardarDeclaracion: (entrada) => dj08Service.guardarDeclaracion(entrada),
  presentarDeclaracion: (id) => dj08Service.presentarDeclaracion(id),
  eliminarDeclaracion: (id) => dj08Service.eliminarDeclaracion(id),
  exportarPdf: (entrada) => dj08Service.exportarPdf(entrada),
  exportarDeclaracionPdf: (id) => dj08Service.exportarDeclaracionPdf(id),
};
