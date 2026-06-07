import type { Moneda } from './moneda';

export interface Cuenta {
  id_cuenta: number;
  id_cliente?: number;
  id_dependencia?: number;
  id_moneda?: number;
  titular: string;
  banco: string;
  sucursal?: number;
  numero_cuenta?: string;
  direccion: string;
  moneda?: Moneda;
}

export interface CuentaCreate {
  id_cliente?: number;
  id_dependencia?: number;
  id_moneda?: number;
  titular: string;
  banco: string;
  sucursal?: number;
  numero_cuenta?: string;
  direccion: string;
}

export interface CuentaUpdate {
  id_cliente?: number;
  id_dependencia?: number;
  id_moneda?: number;
  titular?: string;
  banco?: string;
  sucursal?: number;
  numero_cuenta?: string;
  direccion?: string;
}

export interface CuentaDependencia {
  id_cuenta?: number;
  id_dependencia: number;
  dependencia_nombre?: string;
  id_moneda?: number;
  titular: string;
  banco: string;
  sucursal?: number;
  numero_cuenta: string;
  direccion: string;
  moneda?: Moneda;
}

export interface CuentaDependenciaCreate {
  id_dependencia: number;
  id_moneda?: number;
  titular: string;
  banco: string;
  sucursal?: number;
  numero_cuenta: string;
  direccion: string;
}

export interface CuentaDependenciaUpdate {
  id_dependencia?: number;
  id_moneda?: number;
  titular?: string;
  banco?: string;
  sucursal?: number;
  numero_cuenta?: string;
  direccion?: string;
}
