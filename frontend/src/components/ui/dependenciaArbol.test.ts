import { describe, expect, it } from "vitest";
import { collectIds, construirBosque } from "./dependenciaArbol";
import type { Dependencia } from "../../types/dependencia";

function dep(id: number, nombre: string, padre?: number): Dependencia {
  return {
    id_dependencia: id,
    nombre,
    codigo: `D${id}`,
    codigo_padre: padre,
  } as unknown as Dependencia;
}

describe("construirBosque", () => {
  it("crea raíces para padres ausentes y ordena por nombre", () => {
    const { roots } = construirBosque([
      dep(1, "Zeta"),
      dep(2, "Alfa"),
      dep(3, "Hija", 1),
      dep(4, "Huerfana", 99),
    ]);

    expect(roots.map((n) => n.dep.nombre)).toEqual(["Alfa", "Huerfana", "Zeta"]);
    expect(roots[2].children.map((n) => n.dep.nombre)).toEqual(["Hija"]);
  });

  it("indexa todos los nodos por id", () => {
    const { byId } = construirBosque([dep(1, "A"), dep(2, "B", 1)]);
    expect(byId.get(2)?.dep.nombre).toBe("B");
  });

  it("respeta un ciclo sin colgarse ni inventar raíces", () => {
    const { roots, byId } = construirBosque([dep(1, "A", 2), dep(2, "B", 1)]);
    expect(roots).toHaveLength(0);
    expect(byId.size).toBe(2);
  });
});

describe("collectIds", () => {
  it("recorre el subárbol en preorden sin duplicar", () => {
    const { byId } = construirBosque([
      dep(1, "A"),
      dep(2, "B", 1),
      dep(3, "C", 1),
      dep(4, "D", 2),
    ]);

    expect(collectIds([byId.get(1)!])).toEqual([1, 2, 4, 3]);
  });
});
