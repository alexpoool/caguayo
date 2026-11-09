export type Modulo =
  | 'administracion'
  | 'venta'
  | 'compra'
  | 'inventario'
  | 'reportes'
  | 'home'
  | 'proyecto'
  | 'dj08'
  | 'rrhh'
  | 'terceros';

/**
 * Funcionalidades que dan acceso a un módulo completo.
 * Se mantiene aquí para que el sidebar y el guard de rutas usen la misma fuente.
 */
export const FUNCIONALIDADES_POR_MODULO: Record<Modulo, string[]> = {
  inventario: ['movimientos', 'pendientes', 'productos'],
  terceros: ['clientes', 'contratos', 'proveedores', 'convenios'],
  compra: ['proveedores', 'anexos', 'liquidaciones', 'productos_liquidacion'],
  venta: ['clientes', 'facturas', 'venta_efectivo', 'ofertas_tienda'],
  proyecto: [
    'servicios',
    'solicitudes',
    'proyectos',
    'facturas_servicio',
    'ofertas',
    'pre_facturas',
    'liquidaciones_servicio',
  ],
  reportes: [
    'reporte_existencias',
    'reporte_movimientos_dependencia',
    'reporte_movimientos_producto',
    'reporte_proveedores',
    'reporte_clientes',
    'reporte_proyectos',
    'reporte_creadores',
    'reporte_desempeno',
    'reporte_liquidaciones',
    'reporte_onat',
    'reporte_mincult',
  ],
  administracion: [
    'configuracion',
    'monedas',
    'usuarios',
    'grupos',
    'dependencias',
    'cuentas',
  ],
  home: [],
  dj08: [],
  rrhh: [
    'rrhh_empleados',
    'rrhh_departamentos',
    'rrhh_puestos',
    'rrhh_asistencia',
    'rrhh_solicitudes',
    'rrhh_deducciones',
    'rrhh_bonificaciones',
    'rrhh_nomina',
    'rrhh_pagos',
    'rrhh_evaluaciones',
    'rrhh_catalogos',
    'rrhh_reportes',
    'rrhh_auditoria',
  ],
};

export interface RutaConfig {
  path: string;
  modulo: Modulo;
  /** Si se omite, la ruta solo exige sesión iniciada. */
  funcionalidades?: string[];
  /** Por defecto basta una funcionalidad de la lista. */
  requireAll?: boolean;
  exact?: boolean;
}

const RUTAS_BASE: RutaConfig[] = [
  // Públicas / sin módulo
  { path: '/', modulo: 'home', exact: true },
  { path: '/dashboard', modulo: 'home', exact: true },
  { path: '/perfil', modulo: 'home', exact: true },
  { path: '/logger', modulo: 'administracion', funcionalidades: ['configuracion'], exact: true },

  // Inventario
  { path: '/inventario', modulo: 'inventario', funcionalidades: FUNCIONALIDADES_POR_MODULO.inventario, exact: true },
  { path: '/inventario/existencias', modulo: 'inventario', funcionalidades: ['reporte_existencias'] },
  { path: '/inventario/movimientos-dependencia', modulo: 'inventario', funcionalidades: ['reporte_movimientos_dependencia'] },
  { path: '/inventario/movimientos-producto', modulo: 'inventario', funcionalidades: ['reporte_movimientos_producto'] },
  { path: '/movimientos', modulo: 'inventario', funcionalidades: ['movimientos'], exact: true },
  { path: '/movimientos/pendientes', modulo: 'inventario', funcionalidades: ['pendientes'] },
  { path: '/movimientos/seleccionar-recepcion', modulo: 'inventario', funcionalidades: ['movimientos'] },
  { path: '/productos', modulo: 'inventario', funcionalidades: ['productos'], exact: true },

  // Terceros
  { path: '/terceros', modulo: 'terceros', funcionalidades: FUNCIONALIDADES_POR_MODULO.terceros, exact: true },
  { path: '/terceros/registro-clientes', modulo: 'terceros', funcionalidades: ['reporte_clientes'] },
  { path: '/terceros/registro-proveedores', modulo: 'terceros', funcionalidades: ['reporte_proveedores'] },
  { path: '/terceros/registro-realizadores', modulo: 'terceros', funcionalidades: ['reporte_creadores'] },
  { path: '/clientes', modulo: 'terceros', funcionalidades: ['clientes'] },

  // Compra
  { path: '/compra', modulo: 'compra', funcionalidades: FUNCIONALIDADES_POR_MODULO.compra, exact: true },
  { path: '/compra/clientes', modulo: 'compra', funcionalidades: ['proveedores'] },
  { path: '/compra/proveedores', modulo: 'compra', funcionalidades: ['proveedores'] },
  { path: '/compra/convenios', modulo: 'compra', funcionalidades: ['convenios'] },
  { path: '/compra/anexos', modulo: 'compra', funcionalidades: ['anexos'] },
  { path: '/compra/liquidaciones', modulo: 'compra', funcionalidades: ['liquidaciones'] },
  { path: '/compra/productos-liquidacion', modulo: 'compra', funcionalidades: ['productos_liquidacion'] },
  { path: '/compra/cuentas', modulo: 'compra', funcionalidades: ['proveedores', 'liquidaciones'] },
  { path: '/compra/reporte-proveedores', modulo: 'compra', funcionalidades: ['reporte_proveedores'] },
  { path: '/compra/resumen-liquidaciones', modulo: 'compra', funcionalidades: ['reporte_liquidaciones'] },

  // Tienda / Ventas
  { path: '/venta', modulo: 'venta', funcionalidades: FUNCIONALIDADES_POR_MODULO.venta, exact: true },
  { path: '/ventas/operaciones', modulo: 'venta', funcionalidades: FUNCIONALIDADES_POR_MODULO.venta },
  { path: '/venta/clientes', modulo: 'venta', funcionalidades: ['clientes'] },
  { path: '/ventas/contratos', modulo: 'venta', funcionalidades: ['contratos'] },
  { path: '/ventas/suplementos', modulo: 'venta', funcionalidades: ['contratos'] },
  { path: '/ventas/facturas', modulo: 'venta', funcionalidades: ['facturas'] },
  { path: '/ventas/ofertas', modulo: 'venta', funcionalidades: ['ofertas_tienda'] },
  { path: '/ventas/pre-facturas', modulo: 'venta', funcionalidades: ['pre_facturas_tienda'] },
  { path: '/ventas/efectivo', modulo: 'venta', funcionalidades: ['venta_efectivo'] },
  { path: '/ventas/cuentas', modulo: 'venta', funcionalidades: ['clientes', 'facturas'] },
  { path: '/ventas/registro-clientes', modulo: 'venta', funcionalidades: ['reporte_clientes'] },

  // Proyectos
  { path: '/proyecto', modulo: 'proyecto', funcionalidades: FUNCIONALIDADES_POR_MODULO.proyecto, exact: true },
  { path: '/proyectos/servicios', modulo: 'proyecto', funcionalidades: ['servicios'] },
  { path: '/proyectos/solicitudes', modulo: 'proyecto', funcionalidades: ['solicitudes'] },
  { path: '/proyectos/proyectos', modulo: 'proyecto', funcionalidades: ['proyectos'] },
  { path: '/proyectos/etapas', modulo: 'proyecto', funcionalidades: ['proyectos'] },
  { path: '/proyectos/tareas-etapa', modulo: 'proyecto', funcionalidades: ['proyectos'] },
  { path: '/proyectos/realizadores', modulo: 'proyecto', funcionalidades: ['proyectos'] },
  { path: '/proyectos/facturas-servicio', modulo: 'proyecto', funcionalidades: ['facturas_servicio'] },
  { path: '/proyectos/ofertas', modulo: 'proyecto', funcionalidades: ['ofertas'] },
  { path: '/proyectos/pre-facturas', modulo: 'proyecto', funcionalidades: ['pre_facturas'] },
  { path: '/proyectos/pagos-factura-servicio', modulo: 'proyecto', funcionalidades: ['facturas_servicio'] },
  { path: '/proyectos/liquidaciones', modulo: 'proyecto', funcionalidades: ['liquidaciones_servicio'] },
  { path: '/proyectos/registro-proyectos', modulo: 'proyecto', funcionalidades: ['reporte_proyectos'] },
  { path: '/proyectos/registro-realizadores', modulo: 'proyecto', funcionalidades: ['reporte_creadores'] },
  { path: '/proyectos/informe-desempeno', modulo: 'proyecto', funcionalidades: ['reporte_desempeno'] },
  { path: '/proyectos/certificaciones', modulo: 'proyecto', funcionalidades: ['proyectos'] },

  // Reportes
  { path: '/reportes', modulo: 'reportes', funcionalidades: FUNCIONALIDADES_POR_MODULO.reportes, exact: true },
  { path: '/reportes/existencias', modulo: 'reportes', funcionalidades: ['reporte_existencias'] },
  { path: '/reportes/movimientos-dependencia', modulo: 'reportes', funcionalidades: ['reporte_movimientos_dependencia'] },
  { path: '/reportes/movimientos-producto', modulo: 'reportes', funcionalidades: ['reporte_movimientos_producto'] },
  { path: '/reportes/proveedores', modulo: 'reportes', funcionalidades: ['reporte_proveedores'] },
  { path: '/reportes/registro-clientes', modulo: 'reportes', funcionalidades: ['reporte_clientes'] },
  { path: '/reportes/registro-proyectos', modulo: 'reportes', funcionalidades: ['reporte_proyectos'] },
  { path: '/reportes/registro-creadores', modulo: 'reportes', funcionalidades: ['reporte_creadores'] },
  { path: '/reportes/informe-desempeno', modulo: 'reportes', funcionalidades: ['reporte_desempeno'] },
  { path: '/reportes/resumen-liquidaciones', modulo: 'reportes', funcionalidades: ['reporte_liquidaciones'] },
  { path: '/reportes/ingresos-retenciones', modulo: 'reportes', funcionalidades: ['reporte_liquidaciones'] },
  { path: '/reportes/mincult', modulo: 'reportes', funcionalidades: ['reporte_mincult'] },
  { path: '/reportes/onat', modulo: 'reportes', funcionalidades: ['reporte_onat'] },

  // Administración
  { path: '/administracion', modulo: 'administracion', funcionalidades: FUNCIONALIDADES_POR_MODULO.administracion, exact: true },
  { path: '/configuracion/rrhh', modulo: 'administracion', funcionalidades: ['rrhh_catalogos'] },
  { path: '/configuracion', modulo: 'administracion', funcionalidades: ['configuracion'] },
  { path: '/monedas', modulo: 'administracion', funcionalidades: ['monedas'] },
  { path: '/usuarios', modulo: 'administracion', funcionalidades: ['usuarios'] },
  { path: '/usuarios-credenciales', modulo: 'administracion', funcionalidades: ['usuarios'] },
  { path: '/grupos', modulo: 'administracion', funcionalidades: ['grupos'] },
  { path: '/dependencias', modulo: 'administracion', funcionalidades: ['dependencias'] },
  { path: '/respaldos', modulo: 'administracion', funcionalidades: ['configuracion'] },
  { path: '/cuentas', modulo: 'administracion', funcionalidades: ['cuentas'] },

  // RRHH
  { path: '/rrhh', modulo: 'rrhh', funcionalidades: FUNCIONALIDADES_POR_MODULO.rrhh, exact: true },
  { path: '/rrhh/departamentos', modulo: 'rrhh', funcionalidades: ['rrhh_catalogos'] },
  { path: '/rrhh/puestos', modulo: 'rrhh', funcionalidades: ['rrhh_catalogos'] },
  { path: '/rrhh/catalogos', modulo: 'rrhh', funcionalidades: ['rrhh_catalogos'] },
  { path: '/rrhh/empleados', modulo: 'rrhh', funcionalidades: ['rrhh_empleados'] },
  { path: '/rrhh/asistencia', modulo: 'rrhh', funcionalidades: ['rrhh_asistencia'] },
  { path: '/rrhh/movimientos', modulo: 'rrhh', funcionalidades: FUNCIONALIDADES_POR_MODULO.rrhh },
  { path: '/rrhh/nomina', modulo: 'rrhh', funcionalidades: ['rrhh_nomina'] },
  { path: '/rrhh/pagos-resultado', modulo: 'rrhh', funcionalidades: ['rrhh_pagos', 'rrhh_nomina'] },
  { path: '/rrhh/solicitudes', modulo: 'rrhh', funcionalidades: ['rrhh_solicitudes'] },
  { path: '/rrhh/evaluaciones', modulo: 'rrhh', funcionalidades: ['rrhh_evaluaciones'] },
  { path: '/rrhh/objetivos', modulo: 'rrhh', funcionalidades: ['rrhh_evaluaciones'] },
  { path: '/rrhh/reportes', modulo: 'rrhh', funcionalidades: ['rrhh_reportes'] },
  { path: '/rrhh/auditoria', modulo: 'rrhh', funcionalidades: ['rrhh_auditoria'] },

  // DJ08: no tiene funcionalidad propia en el contrato actual.
  { path: '/dj08', modulo: 'dj08', exact: true },
];

/** Ordenadas de la ruta más específica a la más general. */
export const RUTAS_PROTEGIDAS: RutaConfig[] = [...RUTAS_BASE].sort(
  (a, b) => b.path.length - a.path.length,
);

function normalizarPath(pathname: string): string {
  const sinQuery = pathname.split('?')[0] ?? '/';
  const sinBarraFinal = sinQuery.replace(/\/+$/, '');
  return sinBarraFinal || '/';
}

export function obtenerRuta(pathname: string): RutaConfig | undefined {
  const path = normalizarPath(pathname);
  return RUTAS_PROTEGIDAS.find((ruta) =>
    ruta.exact
      ? path === ruta.path
      : path === ruta.path || path.startsWith(`${ruta.path}/`),
  );
}

export function moduloDeRuta(pathname: string): Modulo | undefined {
  return obtenerRuta(pathname)?.modulo;
}

export function puedeAccederRuta(
  pathname: string,
  hasFuncionalidad: (nombre: string) => boolean,
): boolean {
  const ruta = obtenerRuta(pathname);
  if (!ruta) return false;
  if (!ruta.funcionalidades?.length) return true;
  return ruta.requireAll
    ? ruta.funcionalidades.every(hasFuncionalidad)
    : ruta.funcionalidades.some(hasFuncionalidad);
}
