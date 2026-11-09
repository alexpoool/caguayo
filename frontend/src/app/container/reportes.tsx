import { crearCasosUsoReportes } from '../../features/reportes/application/casos-uso';
import { reportesApiRepositorio } from '../../features/reportes/infrastructure/reportes-api-repositorio';
import ReporteClientes from '../../features/reportes/ui/ReporteClientes';
import ReporteCreadores from '../../features/reportes/ui/ReporteCreadores';
import ReporteDesempeno from '../../features/reportes/ui/ReporteDesempeno';
import ReporteExistencias from '../../features/reportes/ui/ReporteExistencias';
import ReporteLiquidaciones from '../../features/reportes/ui/ReporteLiquidaciones';
import ReporteMincult from '../../features/reportes/ui/ReporteMincult';
import ReporteMovimientosDependencia from '../../features/reportes/ui/ReporteMovimientosDependencia';
import ReporteMovimientosProducto from '../../features/reportes/ui/ReporteMovimientosProducto';
import ReporteOnat from '../../features/reportes/ui/ReporteOnat';
import ReporteProveedores from '../../features/reportes/ui/ReporteProveedores';
import ReporteProyectos from '../../features/reportes/ui/ReporteProyectos';
import { ReportesHome } from '../../features/reportes/ui/ReportesHome';

/** Composition root de reportes: única unión de puerto y adaptador. */
const casosUsoReportes = crearCasosUsoReportes(reportesApiRepositorio);

export function ReportesHomeContainer() {
  return <ReportesHome casosUso={casosUsoReportes} />;
}

export function ReporteClientesContainer() {
  return <ReporteClientes casosUso={casosUsoReportes} />;
}

export function ReporteCreadoresContainer() {
  return <ReporteCreadores casosUso={casosUsoReportes} />;
}

export function ReporteDesempenoContainer() {
  return <ReporteDesempeno casosUso={casosUsoReportes} />;
}

export function ReporteExistenciasContainer() {
  return <ReporteExistencias casosUso={casosUsoReportes} />;
}

export function ReporteLiquidacionesContainer() {
  return <ReporteLiquidaciones casosUso={casosUsoReportes} />;
}

export function ReporteMincultContainer() {
  return <ReporteMincult casosUso={casosUsoReportes} />;
}

export function ReporteMovimientosDependenciaContainer() {
  return <ReporteMovimientosDependencia casosUso={casosUsoReportes} />;
}

export function ReporteMovimientosProductoContainer() {
  return <ReporteMovimientosProducto casosUso={casosUsoReportes} />;
}

export function ReporteOnatContainer() {
  return <ReporteOnat casosUso={casosUsoReportes} />;
}

export function ReporteProveedoresContainer() {
  return <ReporteProveedores casosUso={casosUsoReportes} />;
}

export function ReporteProyectosContainer() {
  return <ReporteProyectos casosUso={casosUsoReportes} />;
}
