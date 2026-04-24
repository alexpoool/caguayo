import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { dependenciasService } from "../services/administracion";

async function loadAllDescendientes(padreId: number): Promise<any[]> {
  try {
    const hijos = await dependenciasService.getDependenciasJerarquia(padreId);
    let descendientes: any[] = [...hijos];
    
    for (const hijo of hijos) {
      const nietas = await loadAllDescendientes(hijo.id_dependencia);
      descendientes = [...descendientes, ...nietas];
    }
    
    return descendientes;
  } catch (error) {
    console.error("Error cargando descendientes:", error);
    return [];
  }
}

export function useDependenciasFiltradas() {
  const { user } = useAuth();
  const userDepId = user?.dependencia?.id_dependencia;
  
  console.log("useDependenciasFiltradas - user:", user);
  console.log("useDependenciasFiltradas - userDepId:", userDepId);

  return useQuery({
    queryKey: ["dependencias-filtradas", userDepId],
    queryFn: async () => {
      if (!userDepId) {
        console.log("useDependenciasFiltradas - Sin userDepId, retornando []");
        return [];
      }

      try {
        const actual = await dependenciasService.getDependencia(userDepId);
        const descendientes = await loadAllDescendientes(userDepId);
        console.log("useDependenciasFiltradas - actual:", actual);
        console.log("useDependenciasFiltradas - descendientes:", descendientes);
        return [actual, ...descendientes];
      } catch (error) {
        console.error("useDependenciasFiltradas - Error:", error);
        return [];
      }
    },
    enabled: !!userDepId,
  });
}