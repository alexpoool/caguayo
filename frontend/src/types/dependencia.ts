import type { Provincia, Municipio } from './ubicacion';
import type { Cuenta, CuentaCreate } from './cuenta';

export interface TipoDependencia {
  id_tipo_dependencia: number;
  nombre: string;
  descripcion?: string;
}

export interface TipoDependenciaCreate {
  nombre: string;
  descripcion?: string;
}

export interface TipoDependenciaUpdate {
  nombre?: string;
  descripcion?: string;
}

export interface Dependencia {
  id_dependencia: number;
  id_tipo_dependencia: number;
  codigo_padre?: number;
  nombre: string;
  direccion: string;
  telefono: string;
  email?: string;
  web?: string;
  id_provincia?: number;
  id_municipio?: number;
  descripcion?: string;
  tipo_dependencia?: TipoDependencia;
  padre?: Dependencia;
  provincia?: Provincia;
  municipio?: Municipio;
  cuentas: Cuenta[];
}

export interface DependenciaCreate {
  id_tipo_dependencia: number;
  codigo_padre?: number;
  nombre: string;
  direccion: string;
  telefono: string;
  email?: string;
  web?: string;
  id_provincia?: number;
  id_municipio?: number;
  descripcion?: string;
}

export interface DependenciaConCuentasCreate {
  dependencia: DependenciaCreate;
  cuentas?: CuentaCreate[];
}

export interface DependenciaUpdate {
  id_tipo_dependencia?: number;
  codigo_padre?: number;
  nombre?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  web?: string;
  id_provincia?: number;
  id_municipio?: number;
  descripcion?: string;
}
