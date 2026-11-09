import { authHelpers } from '@/shared/infrastructure/http/api';
import { API_BASE_URL } from '../../../config/api';
import { dependenciasService } from '../../../services/administracion';
import { monedaService } from '../../../services/api';
import type {
  ParametrosReporte,
  ReportesRepositorio,
} from '../domain/reportes';

function construirUrl(ruta: string, parametros?: ParametrosReporte): string {
  const qs = parametros ? new URLSearchParams(parametros).toString() : '';
  return `${API_BASE_URL}${ruta}${qs ? `?${qs}` : ''}`;
}

function cabeceras(): HeadersInit {
  const token = authHelpers.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Adaptador HTTP de reportes. */
export const reportesApiRepositorio: ReportesRepositorio = {
  listarDependencias: () => dependenciasService.getDependencias(),
  listarProvincias: () => dependenciasService.getProvincias(),
  listarMunicipios: (idProvincia) =>
    dependenciasService.getMunicipios(idProvincia),
  listarMonedas: () => monedaService.getMonedas(),

  async consultarReporte(ruta, parametros, signal) {
    const response = await fetch(construirUrl(ruta, parametros), {
      headers: cabeceras(),
      signal,
    });
    if (!response.ok) throw new Error(`${response.status}`);
    return response.json();
  },

  async generarReporte(ruta, parametros) {
    const response = await fetch(construirUrl(ruta, parametros), {
      headers: cabeceras(),
    });
    if (!response.ok) throw new Error(`${response.status}`);
    return response.blob();
  },

  async buscarProductosItemAnexo(texto, signal) {
    const parametros = texto ? { q: texto } : undefined;
    const response = await fetch(
      construirUrl('/reportes/productos-item-anexo', parametros),
      { headers: cabeceras(), signal },
    );
    if (!response.ok) throw new Error(`${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },
};
