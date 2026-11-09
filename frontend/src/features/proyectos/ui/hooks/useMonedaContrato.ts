import { useQuery } from '@tanstack/react-query';
import type { CasosUsoProyectos } from '../../application/casos-uso';

async function monedaDeSolicitud(
  casosUso: CasosUsoProyectos,
  solicitudId: number,
): Promise<number | null> {
  const solicitud = await casosUso.getSolicitud(solicitudId);
  if (!solicitud?.id_contrato) return null;
  const contrato = await casosUso.getContrato(solicitud.id_contrato);
  return contrato?.id_moneda ?? null;
}

/**
 * Resuelve la moneda del contrato asignado a una solicitud de servicio.
 *
 * Cadena: solicitud -> id_contrato -> Contrato.id_moneda
 */
export function useMonedaContrato(
  casosUso: CasosUsoProyectos,
  solicitudId?: number | null,
) {
  return useQuery<number | null>({
    queryKey: ['moneda-contrato', solicitudId],
    enabled: !!solicitudId,
    queryFn: () => monedaDeSolicitud(casosUso, solicitudId!),
  });
}

/** Mismo resultado partiendo de una etapa: etapa -> solicitud -> contrato. */
export function useMonedaContratoDeEtapa(
  casosUso: CasosUsoProyectos,
  etapaId?: number | null,
) {
  return useQuery<number | null>({
    queryKey: ['moneda-contrato-etapa', etapaId],
    enabled: !!etapaId,
    queryFn: async () => {
      const etapa = await casosUso.getEtapa(etapaId!);
      if (!etapa?.id_solicitud_servicio) return null;
      return monedaDeSolicitud(casosUso, etapa.id_solicitud_servicio);
    },
  });
}
