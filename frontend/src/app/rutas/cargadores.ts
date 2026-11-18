/**
 * Cargadores de las páginas del frontend.
 *
 * App.tsx los usa para crear los `lazy()` y el prefetch usa exactamente los
 * mismos thunks: si la ruta ya se precargó, el navegador reutiliza la petición
 * en curso en vez de lanzar otra.
 *
 * Cada página tiene su propio cargador: entrar a "Etapas" no descarga el resto
 * del módulo de proyectos.
 */
export const cargarDashboard = () => import('../container/dashboard');
export const cargarInventario = () => import('../container/inventario');
export const cargarTerceros = () => import('../container/terceros');
export const cargarAdministracion = () => import('../container/administracion');
export const cargarCompra = () => import('../container/compra');
export const cargarVentas = () => import('../container/ventas');
export const cargarReportes = () => import('../container/reportes');
export const cargarDj08 = () => import('../container/dj08');
export const cargarVentaHome = () => import('../layout/VentaHome');
export const cargarProyectosHome = () => import('../layout/ProyectosHome');
export const cargarAdministracionHome = () => import('../layout/AdministracionHome');
export const cargarRrhhHome = () => import('../layout/RrhhHome');

// Proyectos: un chunk por página.
export const cargarProyectosServicios = () =>
  import('../container/proyectos/ServiciosPageContainer');
export const cargarProyectosSolicitudes = () =>
  import('../container/proyectos/SolicitudesPageContainer');
export const cargarProyectosListado = () =>
  import('../container/proyectos/ProyectosPageContainer');
export const cargarProyectosEtapas = () =>
  import('../container/proyectos/EtapasPageContainer');
export const cargarProyectosTareasEtapa = () =>
  import('../container/proyectos/TareasEtapaPageContainer');
export const cargarProyectosRealizadores = () =>
  import('../container/proyectos/RealizadoresPageContainer');
export const cargarProyectosFacturasServicio = () =>
  import('../container/proyectos/FacturasServicioPageContainer');
export const cargarProyectosOfertas = () =>
  import('../container/proyectos/OfertasPageContainer');
export const cargarProyectosPreFacturas = () =>
  import('../container/proyectos/PreFacturasPageContainer');
export const cargarProyectosPagosFacturaServicio = () =>
  import('../container/proyectos/PagosFacturaServicioPageContainer');
export const cargarProyectosLiquidaciones = () =>
  import('../container/proyectos/ProyectoLiquidacionesPageContainer');
export const cargarProyectosCertificaciones = () =>
  import('../container/proyectos/CertificacionesPageContainer');

// RRHH: un chunk por página.
export const cargarRrhhCatalogos = () =>
  import('../container/rrhh/CatalogosPageContainer');
export const cargarRrhhEmpleados = () =>
  import('../container/rrhh/EmpleadosPageContainer');
export const cargarRrhhAsistencia = () =>
  import('../container/rrhh/AsistenciaPageContainer');
export const cargarRrhhMovimientos = () =>
  import('../container/rrhh/MovimientosPageContainer');
export const cargarRrhhNomina = () =>
  import('../container/rrhh/NominaPageContainer');
export const cargarRrhhNominaDetalle = () =>
  import('../container/rrhh/NominaDetallePageContainer');
export const cargarRrhhNominaPagos = () =>
  import('../container/rrhh/NominaPagosPageContainer');
export const cargarRrhhPagosResultado = () =>
  import('../container/rrhh/PagosResultadoPageContainer');
export const cargarRrhhPagoResultadoNuevo = () =>
  import('../container/rrhh/PagoResultadoNuevoPageContainer');
export const cargarRrhhPagoResultadoDetalle = () =>
  import('../container/rrhh/PagoResultadoDetallePageContainer');
export const cargarRrhhSolicitudes = () =>
  import('../container/rrhh/SolicitudesPageContainer');
export const cargarRrhhEvaluaciones = () =>
  import('../container/rrhh/EvaluacionesPageContainer');
export const cargarRrhhEvaluacionDetalle = () =>
  import('../container/rrhh/EvaluacionDetallePageContainer');
export const cargarRrhhObjetivos = () =>
  import('../container/rrhh/ObjetivosPageContainer');
export const cargarRrhhReportes = () =>
  import('../container/rrhh/ReportesPageContainer');
export const cargarRrhhAuditoria = () =>
  import('../container/rrhh/AuditoriaPageContainer');

export interface EntradaPrecarga {
  prefijo: string;
  cargar: () => Promise<unknown>;
  /** Si es `true`, solo coincide la ruta exacta (no sus subrutas). */
  exacto?: boolean;
}

/**
 * Prefijos ordenados de más específico a más genérico: el primer prefijo que
 * coincide gana. Las rutas de reportes viven dentro de otros módulos, por eso
 * van antes que el prefijo del módulo contenedor.
 */
const PRECARGA: EntradaPrecarga[] = [
  // Reportes alojados en otras secciones
  { prefijo: '/terceros/registro-clientes', cargar: cargarReportes },
  { prefijo: '/terceros/registro-proveedores', cargar: cargarReportes },
  { prefijo: '/terceros/registro-realizadores', cargar: cargarReportes },
  { prefijo: '/compra/reporte-proveedores', cargar: cargarReportes },
  { prefijo: '/compra/resumen-liquidaciones', cargar: cargarReportes },
  { prefijo: '/inventario/existencias', cargar: cargarReportes },
  { prefijo: '/inventario/movimientos-dependencia', cargar: cargarReportes },
  { prefijo: '/inventario/movimientos-producto', cargar: cargarReportes },
  { prefijo: '/proyectos/registro-proyectos', cargar: cargarReportes },
  { prefijo: '/proyectos/registro-realizadores', cargar: cargarReportes },
  { prefijo: '/proyectos/informe-desempeno', cargar: cargarReportes },
  { prefijo: '/ventas/registro-clientes', cargar: cargarReportes },
  { prefijo: '/reportes', cargar: cargarReportes },

  // Terceros / clientes compartidos con compra y venta
  { prefijo: '/compra/clientes', cargar: cargarTerceros },
  { prefijo: '/compra/proveedores', cargar: cargarTerceros },
  { prefijo: '/compra/cuentas', cargar: cargarTerceros },
  { prefijo: '/terceros', cargar: cargarTerceros },
  { prefijo: '/clientes', cargar: cargarTerceros },

  // Administración (el catálogo de RRHH se sirve desde administración)
  { prefijo: '/configuracion/rrhh', cargar: cargarRrhhCatalogos },
  { prefijo: '/configuracion', cargar: cargarAdministracion },
  { prefijo: '/administracion', cargar: cargarAdministracionHome },
  { prefijo: '/monedas', cargar: cargarAdministracion },
  { prefijo: '/usuarios-credenciales', cargar: cargarAdministracion },
  { prefijo: '/usuarios', cargar: cargarAdministracion },
  { prefijo: '/grupos', cargar: cargarAdministracion },
  { prefijo: '/dependencias', cargar: cargarAdministracion },
  { prefijo: '/respaldos', cargar: cargarAdministracion },
  { prefijo: '/cuentas', cargar: cargarAdministracion },

  // Inventario
  { prefijo: '/inventario', cargar: cargarInventario },
  { prefijo: '/movimientos', cargar: cargarInventario },
  { prefijo: '/productos', cargar: cargarInventario },

  // Compra
  { prefijo: '/compra', cargar: cargarCompra },

  // Tienda / ventas
  { prefijo: '/ventas', cargar: cargarVentas },
  { prefijo: '/venta', cargar: cargarVentaHome },

  // Proyectos: cada página con su chunk
  { prefijo: '/proyectos/servicios', cargar: cargarProyectosServicios },
  { prefijo: '/proyectos/solicitudes', cargar: cargarProyectosSolicitudes },
  { prefijo: '/proyectos/proyectos', cargar: cargarProyectosListado },
  { prefijo: '/proyectos/etapas', cargar: cargarProyectosEtapas },
  { prefijo: '/proyectos/tareas-etapa', cargar: cargarProyectosTareasEtapa },
  { prefijo: '/proyectos/realizadores', cargar: cargarProyectosRealizadores },
  {
    prefijo: '/proyectos/facturas-servicio',
    cargar: cargarProyectosFacturasServicio,
  },
  { prefijo: '/proyectos/ofertas', cargar: cargarProyectosOfertas },
  { prefijo: '/proyectos/pre-facturas', cargar: cargarProyectosPreFacturas },
  {
    prefijo: '/proyectos/pagos-factura-servicio',
    cargar: cargarProyectosPagosFacturaServicio,
  },
  { prefijo: '/proyectos/liquidaciones', cargar: cargarProyectosLiquidaciones },
  {
    prefijo: '/proyectos/certificaciones',
    cargar: cargarProyectosCertificaciones,
  },
  { prefijo: '/proyectos', cargar: cargarProyectosListado },
  { prefijo: '/proyecto', cargar: cargarProyectosHome },

  // RRHH: cada página con su chunk
  { prefijo: '/rrhh/catalogos', cargar: cargarRrhhCatalogos },
  { prefijo: '/rrhh/empleados', cargar: cargarRrhhEmpleados },
  { prefijo: '/rrhh/asistencia', cargar: cargarRrhhAsistencia },
  { prefijo: '/rrhh/movimientos', cargar: cargarRrhhMovimientos },
  { prefijo: '/rrhh/nomina', exacto: true, cargar: cargarRrhhNomina },
  { prefijo: '/rrhh/nomina', cargar: cargarRrhhNominaDetalle },
  { prefijo: '/rrhh/pagos-resultado/nuevo', cargar: cargarRrhhPagoResultadoNuevo },
  {
    prefijo: '/rrhh/pagos-resultado',
    exacto: true,
    cargar: cargarRrhhPagosResultado,
  },
  { prefijo: '/rrhh/pagos-resultado', cargar: cargarRrhhPagoResultadoDetalle },
  { prefijo: '/rrhh/evaluaciones', exacto: true, cargar: cargarRrhhEvaluaciones },
  { prefijo: '/rrhh/evaluaciones', cargar: cargarRrhhEvaluacionDetalle },
  { prefijo: '/rrhh/solicitudes', cargar: cargarRrhhSolicitudes },
  { prefijo: '/rrhh/objetivos', cargar: cargarRrhhObjetivos },
  { prefijo: '/rrhh/reportes', cargar: cargarRrhhReportes },
  { prefijo: '/rrhh/auditoria', cargar: cargarRrhhAuditoria },
  { prefijo: '/rrhh', cargar: cargarRrhhHome },

  // Resto de módulos
  { prefijo: '/dj08', cargar: cargarDj08 },
  { prefijo: '/dashboard', cargar: cargarDashboard },
];

/** Rutas que se precargan en tiempo muerto tras iniciar sesión. */
export const RUTAS_PRECARGA_INICIAL = [
  '/dashboard',
  '/movimientos',
  '/productos',
  '/clientes',
  '/ventas/facturas',
];

/** Devuelve el cargador de la página que sirve `pathname`, o `null` si no aplica. */
export function cargarRuta(pathname: string): (() => Promise<unknown>) | null {
  const ruta = pathname.split('?')[0].split('#')[0];
  for (const entrada of PRECARGA) {
    const coincide = entrada.exacto
      ? ruta === entrada.prefijo
      : ruta === entrada.prefijo || ruta.startsWith(`${entrada.prefijo}/`);
    if (coincide) return entrada.cargar;
  }
  return null;
}
