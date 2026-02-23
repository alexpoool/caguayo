export interface Funcionalidad {
  id_funcionalidad: number;
  nombre: string;
}

export type GrupoFuncionalidades = Funcionalidad[] | number[];

export interface Grupo {
  id_grupo: number;
  nombre: string;
  descripcion?: string;
  funcionalidades?: GrupoFuncionalidades;
}

export interface GrupoCreate {
  nombre: string;
  descripcion?: string;
  funcionalidades?: number[];
}

export interface GrupoUpdate {
  nombre?: string;
  descripcion?: string;
  funcionalidades?: number[];
}

export interface DependenciaSimple {
  id_dependencia: number;
  nombre: string;
}

export interface Usuario {
  id_usuario: number;
  ci: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string;
  alias: string;
  id_grupo: number;
  id_dependencia?: number;
  grupo?: Grupo;
  dependencia?: DependenciaSimple;
  password_temporal?: string;
  correo?: string;
}

export interface UsuarioCreate {
  ci: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string;
  id_grupo: number;
  id_dependencia?: number;
}

export interface UsuarioUpdate {
  ci?: string;
  nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  id_grupo?: number;
  id_dependencia?: number;
}
