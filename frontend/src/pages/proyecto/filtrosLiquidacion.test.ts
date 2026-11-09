import { describe, expect, it } from "vitest";
import { filtrarLiquidaciones } from "./filtrosLiquidacion";
import type { TabLiquidacion } from "./filtrosLiquidacion";

interface Liquidacion {
  id_etapa: number;
  id_persona: number;
  confirmado: boolean;
}

const liquidaciones: Liquidacion[] = [
  { id_etapa: 1, id_persona: 10, confirmado: true },
  { id_etapa: 1, id_persona: 11, confirmado: false },
  { id_etapa: 2, id_persona: 10, confirmado: false },
  { id_etapa: 2, id_persona: 12, confirmado: true },
];

function filtrar(
  activeTab: TabLiquidacion,
  filtroEtapa?: number | null,
  filtroPersona?: number | null,
) {
  return filtrarLiquidaciones(liquidaciones, {
    activeTab,
    filtroEtapa,
    filtroPersona,
  });
}

describe("filtrarLiquidaciones", () => {
  it("devuelve todas sin filtros", () => {
    expect(filtrar("todas")).toHaveLength(4);
  });

  it("filtra por etapa y persona a la vez", () => {
    expect(filtrar("todas", 1, 10)).toEqual([
      { id_etapa: 1, id_persona: 10, confirmado: true },
    ]);
  });

  it("filtra pendientes y liquidadas", () => {
    expect(filtrar("pendientes", null, null).map((l) => l.id_persona)).toEqual([
      11, 10,
    ]);
    expect(filtrar("liquidadas", null, null).map((l) => l.id_persona)).toEqual([
      10, 12,
    ]);
  });

  it("trata filtros nulos o cero como ausentes", () => {
    expect(filtrar("todas", null, 0)).toHaveLength(4);
    expect(filtrar("todas", 0, null)).toHaveLength(4);
  });

  it("devuelve vacío con lista vacía", () => {
    expect(
      filtrarLiquidaciones([], { activeTab: "todas" }),
    ).toEqual([]);
  });
});
