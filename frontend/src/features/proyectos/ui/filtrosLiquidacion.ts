export type TabLiquidacion = "todas" | "pendientes" | "liquidadas";

export interface FiltrosLiquidacion {
  filtroEtapa?: number | null;
  filtroPersona?: number | null;
  activeTab: TabLiquidacion;
}

interface LiquidacionFiltrable {
  id_etapa?: number | null;
  id_persona?: number | null;
  confirmado?: boolean;
}

/** Filtra liquidaciones en una sola pasada. */
export function filtrarLiquidaciones<T extends LiquidacionFiltrable>(
  liquidaciones: T[],
  { filtroEtapa, filtroPersona, activeTab }: FiltrosLiquidacion,
): T[] {
  return liquidaciones.filter((liquidacion) => {
    if (filtroEtapa && liquidacion.id_etapa !== filtroEtapa) return false;
    if (filtroPersona && liquidacion.id_persona !== filtroPersona) return false;
    if (activeTab === "pendientes" && liquidacion.confirmado) return false;
    if (activeTab === "liquidadas" && !liquidacion.confirmado) return false;
    return true;
  });
}
