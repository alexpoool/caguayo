import type { RrhhEstadoAsistencia } from "../../types/rrhh";

export interface ConteoAsistencia {
  total: number;
  presentes: number;
  ausentes: number;
  tardanzas: number;
  permisos: number;
  vacaciones: number;
}

/** Cuenta los estados de asistencia en una sola pasada. */
export function contarAsistencias<
  T extends { estado: RrhhEstadoAsistencia },
>(filas: T[]): ConteoAsistencia {
  const conteo: ConteoAsistencia = {
    total: filas.length,
    presentes: 0,
    ausentes: 0,
    tardanzas: 0,
    permisos: 0,
    vacaciones: 0,
  };

  for (const fila of filas) {
    switch (fila.estado) {
      case "presente":
        conteo.presentes += 1;
        break;
      case "ausente":
        conteo.ausentes += 1;
        break;
      case "tardanza":
        conteo.tardanzas += 1;
        break;
      case "permiso":
        conteo.permisos += 1;
        break;
      case "vacaciones":
        conteo.vacaciones += 1;
        break;
    }
  }

  return conteo;
}
