// Tipos del módulo RRHH — Departamentos y Puestos (Fase 2)

export interface RrhhPuesto {
  id_puesto: number;
  nombre: string;
  descripcion: string | null;
  departamento_id: number | null;
  salario_minimo: number | null;
  salario_maximo: number | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RrhhPuestoCreate {
  nombre: string;
  descripcion?: string | null;
  departamento_id?: number | null;
  salario_minimo?: number | null;
  salario_maximo?: number | null;
  activo?: boolean;
}

export type RrhhPuestoUpdate = Partial<RrhhPuestoCreate>;

export interface RrhhPuestoDetalle extends RrhhPuesto {
  departamento_nombre: string | null;
  total_empleados: number;
}

/** Fila del listado de puestos (con agregados resueltos en backend). */
export interface RrhhPuestoListado extends RrhhPuesto {
  departamento_nombre: string | null;
  total_empleados: number;
}

export interface RrhhDepartamento {
  id_departamento: number;
  nombre: string;
  descripcion: string | null;
  responsable: number | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RrhhDepartamentoCreate {
  nombre: string;
  descripcion?: string | null;
  responsable?: number | null;
  activo?: boolean;
}

export type RrhhDepartamentoUpdate = Partial<RrhhDepartamentoCreate>;

export interface RrhhDepartamentoDetalle extends RrhhDepartamento {
  responsable_nombre: string | null;
  puestos: RrhhPuesto[];
  total_empleados: number;
}

/** Fila del listado de departamentos (con agregados resueltos en backend). */
export interface RrhhDepartamentoListado extends RrhhDepartamento {
  responsable_nombre: string | null;
  total_puestos: number;
  total_empleados: number;
}

export interface RrhhEmpleadoLite {
  id: number;
  codigo_empleado: string | null;
  nombre: string;
  apellido: string;
  estado: string;
  activo: boolean;
}

export interface RrhhEliminarResponse {
  accion: 'eliminado' | 'desactivado';
  motivo: string | null;
}
