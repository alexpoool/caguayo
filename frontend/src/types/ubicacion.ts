export interface Provincia {
  id_provincia: number;
  nombre: string;
}

export interface Municipio {
  id_municipio: number;
  id_provincia: number;
  nombre: string;
  provincia?: Provincia;
}
