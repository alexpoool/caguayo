// Tipos del módulo de backups/restauración de dependencias.

export interface BackupInfo {
  archivo: string;
  base_datos: string;
  /** dd/mm/AAAA HH:MM, formateado por la API a partir del nombre del archivo */
  fecha: string;
  fecha_iso: string;
  tamano_bytes: number;
  /** null = no existe .sha256 con qué comparar */
  checksum_ok: boolean | null;
  /** false = pg_restore -l no pudo leer la cabecera (dump inservible) */
  cabecera_ok: boolean | null;
  detalle_error: string | null;
}

export interface BaseDatoPrevia {
  /** Nombre de BD tipo {bd}_prev_YYYYMMDD_HHMMSS (copia de rollback) */
  nombre: string;
  fecha: string | null;
}

export interface BackupListado {
  base_datos: string;
  backups: BackupInfo[];
  bds_previas: BaseDatoPrevia[];
}

export interface BackupJobStep {
  paso: string;
  estado: 'pendiente' | 'en_curso' | 'ok' | 'error' | 'advertencia';
  detalle?: string | null;
}

export interface BackupJob {
  id: string;
  tipo: 'backup' | 'restaurar';
  base_datos: string;
  archivo: string | null;
  estado: 'pendiente' | 'ejecutando' | 'completado' | 'fallido';
  pasos: BackupJobStep[];
  resultado: {
    archivo?: string;
    tamano_bytes?: number;
    n_tablas?: number | null;
    sha256?: string;
    filas_por_tabla?: Record<string, number>;
    bd_previa?: string;
    diferencias_stats?: string[];
  } | null;
  error: string | null;
  creado_iso: string | null;
  terminado_iso: string | null;
}

export interface BackupJobIniciado {
  job_id: string;
  tipo: string;
  estado: string;
}

/** Fila de BDs del listado del panel Backups (todas las no-template del servidor). */
export interface BaseDatoConBackups {
  nombre_database: string;
  es_central: boolean;
  n_backups: number;
  backup_mas_reciente: string | null;
  tamano_total_bytes: number;
}
