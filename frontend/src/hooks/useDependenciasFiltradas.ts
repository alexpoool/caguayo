import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/shared/ui/auth";
import { dependenciasService } from "../services/administracion";
import type { Dependencia } from "../types/dependencia";

export function descendientesDe(raiz: number, todas: Dependencia[]): Dependencia[] {
  const hijosPorPadre = new Map<number, Dependencia[]>();
  for (const dependencia of todas) {
    if (dependencia.codigo_padre === undefined || dependencia.codigo_padre === null) continue;
    const hijos = hijosPorPadre.get(dependencia.codigo_padre) ?? [];
    hijos.push(dependencia);
    hijosPorPadre.set(dependencia.codigo_padre, hijos);
  }

  const resultado: Dependencia[] = [];
  const pendientes = [raiz];
  const visitados = new Set<number>([raiz]);

  for (let cursor = 0; cursor < pendientes.length; cursor += 1) {
    const padreId = pendientes[cursor];
    for (const hijo of hijosPorPadre.get(padreId) ?? []) {
      if (visitados.has(hijo.id_dependencia)) continue;
      visitados.add(hijo.id_dependencia);
      resultado.push(hijo);
      pendientes.push(hijo.id_dependencia);
    }
  }

  return resultado;
}

export function useDependenciasFiltradas() {
  const { user } = useAuth();
  const userDepId = user?.dependencia?.id_dependencia;

  return useQuery({
    queryKey: ["dependencias-filtradas", userDepId],
    queryFn: async () => {
      if (!userDepId) return [];

      const todas = await dependenciasService.getDependencias(true);
      const actual = todas.find((d) => d.id_dependencia === userDepId);
      if (!actual) return [];
      return [actual, ...descendientesDe(userDepId, todas)];
    },
    enabled: !!userDepId,
  });
}
