import { describe, expect, it } from 'vitest';
import { descendientesDe } from './useDependenciasFiltradas';
import type { Dependencia } from '../types/dependencia';

function dep(id: number, padre?: number): Dependencia {
  return {
    id_dependencia: id,
    codigo: `D${id}`,
    nombre: `Dependencia ${id}`,
    codigo_padre: padre,
  } as unknown as Dependencia;
}

describe('descendientesDe', () => {
  it('recorre todo el árbol en anchura sin repetir nodos', () => {
    const todas = [
      dep(1),
      dep(2, 1),
      dep(3, 1),
      dep(4, 2),
      dep(5, 4),
      dep(6, 3),
      dep(7),
    ];

    expect(descendientesDe(1, todas).map((d) => d.id_dependencia)).toEqual([
      2, 3, 4, 6, 5,
    ]);
  });

  it('no entra en ciclos', () => {
    const todas = [dep(1, 2), dep(2, 1), dep(3, 2)];

    expect(descendientesDe(1, todas).map((d) => d.id_dependencia)).toEqual([
      2, 3,
    ]);
  });

  it('devuelve vacío cuando la raíz no tiene hijos', () => {
    expect(descendientesDe(1, [dep(1)])).toEqual([]);
  });
});
