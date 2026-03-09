export interface Moneda {
  id_moneda: number;
  nombre: string;
  denominacion: string;
  simbolo: string;
}

export interface MonedaCreate {
  nombre: string;
  denominacion: string;
  simbolo: string;
}

export interface MonedaUpdate {
  nombre?: string;
  denominacion?: string;
  simbolo?: string;
}
