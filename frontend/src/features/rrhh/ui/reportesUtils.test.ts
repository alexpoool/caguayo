import { describe, expect, it } from "vitest";
import { contarAsistencias } from "./reportesUtils";
import type { RrhhEstadoAsistencia } from "../domain/rrhh";

function fila(estado: RrhhEstadoAsistencia) {
  return { estado };
}

describe("contarAsistencias", () => {
  it("cuenta los cinco estados en una pasada", () => {
    const filas = [
      fila("presente"),
      fila("presente"),
      fila("ausente"),
      fila("tardanza"),
      fila("permiso"),
      fila("vacaciones"),
    ];

    expect(contarAsistencias(filas)).toEqual({
      total: 6,
      presentes: 2,
      ausentes: 1,
      tardanzas: 1,
      permisos: 1,
      vacaciones: 1,
    });
  });

  it("devuelve ceros con lista vacía", () => {
    expect(contarAsistencias([])).toEqual({
      total: 0,
      presentes: 0,
      ausentes: 0,
      tardanzas: 0,
      permisos: 0,
      vacaciones: 0,
    });
  });

  it("ignora estados desconocidos", () => {
    const filas = [{ estado: "otro" as RrhhEstadoAsistencia }];
    expect(contarAsistencias(filas).total).toBe(1);
    expect(contarAsistencias(filas).presentes).toBe(0);
  });
});
