export interface TipoContrato {
  id_tipo_contrato: number;
  nombre: string;
  descripcion?: string;
}

export interface TipoContratoCreate {
  nombre: string;
  descripcion?: string;
}

export interface TipoContratoUpdate {
  nombre?: string;
  descripcion?: string;
}

export interface EstadoContrato {
  id_estado_contrato: number;
  nombre: string;
  descripcion?: string;
}

export interface EstadoContratoCreate {
  nombre: string;
  descripcion?: string;
}

export interface EstadoContratoUpdate {
  nombre?: string;
  descripcion?: string;
}
