import type { DJ08Input } from "../../../types/dj08";
import type { Dj08Repositorio } from "../domain/dj08-repositorio";

/**
 * Casos de uso de DJ08. No conocen React, HTTP ni la forma de la API:
 * reciben el puerto y devuelven promesas del dominio.
 */
export function crearCasosUsoDj08(repositorio: Dj08Repositorio) {
  return {
    listarActividades: () => repositorio.listarActividades(),
    listarTributos: () => repositorio.listarTributos(),
    listarDeclaraciones: () => repositorio.listarDeclaraciones(),
    calcular: (entrada: DJ08Input) => repositorio.calcular(entrada),
    guardar: (entrada: DJ08Input) => repositorio.guardarDeclaracion(entrada),
    presentar: (id: number) => repositorio.presentarDeclaracion(id),
    eliminar: (id: number) => repositorio.eliminarDeclaracion(id),
    exportarPdf: (entrada: DJ08Input) => repositorio.exportarPdf(entrada),
    exportarDeclaracionPdf: (id: number) =>
      repositorio.exportarDeclaracionPdf(id),
  };
}

export type CasosUsoDj08 = ReturnType<typeof crearCasosUsoDj08>;
