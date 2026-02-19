export interface TipoProveedor {
  id_tipo_provedores: number;
  nombre: string;
  descripcion?: string;
}

export interface TipoProveedorCreate {
  nombre: string;
  descripcion?: string;
}

export interface TipoProveedorUpdate {
  nombre?: string;
  descripcion?: string;
}

export interface TipoConvenio {
  id_tipo_convenio: number;
  nombre: string;
  descripcion?: string;
}

export interface TipoConvenioCreate {
  nombre: string;
  descripcion?: string;
}

export interface TipoConvenioUpdate {
  nombre?: string;
  descripcion?: string;
}
