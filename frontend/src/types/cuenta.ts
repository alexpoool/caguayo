import type { TipoCuenta } from './tipo_cuenta';

export interface Cuenta {
  id_cuenta: number;
  id_dependencia?: number;
  id_tipo_cuenta: number;
  titular: string;
  banco: string;
  sucursal?: number;
  direccion: string;
  tipo_cuenta?: TipoCuenta;
}

export interface CuentaCreate {
  id_dependencia?: number;
  id_tipo_cuenta: number;
  titular: string;
  banco: string;
  sucursal?: number;
  direccion: string;
}

export interface CuentaUpdate {
  id_dependencia?: number;
  id_tipo_cuenta?: number;
  titular?: string;
  banco?: string;
  sucursal?: number;
  direccion?: string;
}
