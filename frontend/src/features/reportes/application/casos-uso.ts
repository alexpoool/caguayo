import type {
  ParametrosReporte,
  ReportesRepositorio,
} from '../domain/reportes';

/** Casos de uso de reportes. Sin React ni HTTP directo. */
export function crearCasosUsoReportes(repositorio: ReportesRepositorio) {
  return {
    listarDependencias: () => repositorio.listarDependencias(),
    listarProvincias: () => repositorio.listarProvincias(),
    listarMunicipios: (idProvincia: number) =>
      repositorio.listarMunicipios(idProvincia),
    listarMonedas: () => repositorio.listarMonedas(),
    consultarReporte: (
      ruta: string,
      parametros?: ParametrosReporte,
      signal?: AbortSignal,
    ) => repositorio.consultarReporte(ruta, parametros, signal),
    generarReporte: (ruta: string, parametros?: ParametrosReporte) =>
      repositorio.generarReporte(ruta, parametros),
    buscarProductosItemAnexo: (texto?: string, signal?: AbortSignal) =>
      repositorio.buscarProductosItemAnexo(texto, signal),
  };
}

export type CasosUsoReportes = ReturnType<typeof crearCasosUsoReportes>;
