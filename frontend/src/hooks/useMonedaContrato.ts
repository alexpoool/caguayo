import { useQuery } from "@tanstack/react-query";
import { contratosService, etapasProyectoService, solicitudesService } from "../services/api";

async function monedaDeSolicitud(solicitudId: number): Promise<number | null> {
  const solicitud = await solicitudesService.getSolicitud(solicitudId);
  if (!solicitud?.id_contrato) return null;
  const contrato = await contratosService.getContrato(solicitud.id_contrato);
  return contrato?.id_moneda ?? null;
}

/**
 * Resuelve la moneda del contrato asignado a una solicitud de servicio.
 *
 * Cadena: solicitud -> id_contrato -> Contrato.id_moneda
 *
 * - `number`: la moneda del contrato (de usarse fija, sin poder cambiarla).
 * - `null`: la solicitud no tiene contrato (o el contrato no tiene moneda),
 *   en ese caso quien llama decide dejar la moneda editable.
 * - `undefined`: todavia cargando.
 */
export function useMonedaContrato(solicitudId?: number | null) {
  return useQuery<number | null>({
    queryKey: ["moneda-contrato", solicitudId],
    enabled: !!solicitudId,
    queryFn: () => monedaDeSolicitud(solicitudId!),
  });
}

/**
 * Mismo resultado partiendo de una etapa: etapa -> solicitud -> contrato.
 * Para paginas que solo conocen el id de etapa (facturas, pre-facturas,
 * ofertas, pagos, etc.).
 */
export function useMonedaContratoDeEtapa(etapaId?: number | null) {
  return useQuery<number | null>({
    queryKey: ["moneda-contrato-etapa", etapaId],
    enabled: !!etapaId,
    queryFn: async () => {
      const etapa = await etapasProyectoService.getEtapa(etapaId!);
      if (!etapa?.id_solicitud_servicio) return null;
      return monedaDeSolicitud(etapa.id_solicitud_servicio);
    },
  });
}
