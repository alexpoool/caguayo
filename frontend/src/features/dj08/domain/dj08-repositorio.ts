import type {
  ActividadEconomica,
  DeclaracionJurada,
  DJ08Calculado,
  DJ08Input,
  Tributo,
} from "../../../types/dj08";

/** Descarga binaria ya resuelta por infraestructura. */
export interface DocumentoDj08 {
  blob: Blob;
  nombre: string;
}

/**
 * Puerto de persistencia de DJ08. La UI y los casos de uso no conocen
 * `fetch`, `apiClient` ni la forma de la API.
 */
export interface Dj08Repositorio {
  listarActividades(): Promise<ActividadEconomica[]>;
  listarTributos(): Promise<Tributo[]>;
  listarDeclaraciones(): Promise<DeclaracionJurada[]>;
  calcular(entrada: DJ08Input): Promise<DJ08Calculado>;
  guardarDeclaracion(entrada: DJ08Input): Promise<DeclaracionJurada>;
  presentarDeclaracion(id: number): Promise<DeclaracionJurada>;
  eliminarDeclaracion(id: number): Promise<void>;
  exportarPdf(entrada: DJ08Input): Promise<DocumentoDj08>;
  exportarDeclaracionPdf(id: number): Promise<DocumentoDj08>;
}
