import type { Dependencia } from '@/types/dependencia';
import type { Municipio, Provincia } from '@/types/ubicacion';
import type { Productos } from '@/types/index';
import type { Moneda } from '@/types/moneda';

export type { Dependencia, Moneda, Municipio, Productos, Provincia };

export interface PersonaReporte {
  id_persona: number;
  nombre: string;
  apellidos?: string;
}

export interface ClienteReporte {
  id_cliente: number;
  nombre: string;
  codigo?: string;
}

/** Parámetros simples aceptados por los endpoints de reportes. */
export type ParametrosReporte = Record<string, string>;

export interface ReportesRepositorio {
  listarDependencias(): Promise<Dependencia[]>;
  listarProvincias(): Promise<Provincia[]>;
  listarMunicipios(idProvincia: number): Promise<Municipio[]>;
  listarMonedas(): Promise<Moneda[]>;

  consultarReporte(
    ruta: string,
    parametros?: ParametrosReporte,
    signal?: AbortSignal,
  ): Promise<unknown>;
  generarReporte(
    ruta: string,
    parametros?: ParametrosReporte,
  ): Promise<Blob>;
  buscarProductosItemAnexo(
    texto?: string,
    signal?: AbortSignal,
  ): Promise<Productos[]>;
}
