/** Tipos de sesión que consume la UI; no dependen de la forma de la API. */
export interface CuentaDependenciaSesion {
  id_cuenta: number;
  numero_cuenta: string;
  sucursal?: number;
  banco: string;
  titular: string;
  direccion: string;
  id_moneda?: number;
}

export interface DependenciaSesion {
  id_dependencia: number;
  nombre: string;
  denominacion?: string;
  base_datos: string;
  host?: string;
  puerto?: number;
  email?: string;
  telefono?: string;
  direccion?: string;
  web?: string;
  nit?: string;
  reeup?: string;
  provincia?: string;
  municipio?: string;
  cuentas_dependencias?: CuentaDependenciaSesion[];
}

export interface GrupoSesion {
  id_grupo: number;
  nombre: string;
}

export interface UsuarioSesion {
  id_usuario: number;
  ci: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string;
  alias: string;
  cargo?: string;
  dependencia?: DependenciaSesion;
  grupo?: GrupoSesion;
}

export interface FuncionalidadSesion {
  id_funcionalidad: number;
  nombre: string;
}

export interface Sesion {
  token: string;
  usuario: UsuarioSesion;
  funcionalidades: FuncionalidadSesion[];
  baseDatos: string;
}

export interface CredencialesSesion {
  alias: string;
  contrasenia: string;
  baseDatos: string;
}
