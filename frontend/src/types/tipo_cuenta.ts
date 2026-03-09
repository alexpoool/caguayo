export interface TipoCuenta {
  id_tipo_cuenta: number;
  nombre: string;
  descripcion?: string;
}

export interface TipoCuentaCreate {
  nombre: string;
  descripcion?: string;
}

export interface TipoCuentaUpdate {
  nombre?: string;
  descripcion?: string;
}
