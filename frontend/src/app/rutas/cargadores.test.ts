import { describe, expect, it } from 'vitest';
import {
  cargarAdministracion,
  cargarAdministracionHome,
  cargarCompra,
  cargarDashboard,
  cargarDj08,
  cargarInventario,
  cargarProyectosEtapas,
  cargarProyectosHome,
  cargarProyectosListado,
  cargarProyectosServicios,
  cargarReportes,
  cargarRrhhCatalogos,
  cargarRrhhEvaluacionDetalle,
  cargarRrhhEvaluaciones,
  cargarRrhhHome,
  cargarRrhhNomina,
  cargarRrhhNominaDetalle,
  cargarRrhhPagoResultadoNuevo,
  cargarRrhhPagosResultado,
  cargarRuta,
  cargarTerceros,
  cargarVentaHome,
  cargarVentas,
  RUTAS_PRECARGA_INICIAL,
} from './cargadores';

describe('cargarRuta', () => {
  it('resuelve la ruta exacta de cada módulo', () => {
    expect(cargarRuta('/dashboard')).toBe(cargarDashboard);
    expect(cargarRuta('/movimientos')).toBe(cargarInventario);
    expect(cargarRuta('/productos')).toBe(cargarInventario);
    expect(cargarRuta('/clientes')).toBe(cargarTerceros);
    expect(cargarRuta('/compra')).toBe(cargarCompra);
    expect(cargarRuta('/ventas/facturas')).toBe(cargarVentas);
    expect(cargarRuta('/reportes')).toBe(cargarReportes);
    expect(cargarRuta('/dj08')).toBe(cargarDj08);
  });

  it('carga solo la página de proyectos pedida', () => {
    expect(cargarRuta('/proyectos/etapas')).toBe(cargarProyectosEtapas);
    expect(cargarRuta('/proyectos/servicios')).toBe(cargarProyectosServicios);
    expect(cargarRuta('/proyectos/desconocida')).toBe(cargarProyectosListado);
  });

  it('distingue rutas de RRHH con identificadores', () => {
    expect(cargarRuta('/rrhh/nomina')).toBe(cargarRrhhNomina);
    expect(cargarRuta('/rrhh/nomina/12')).toBe(cargarRrhhNominaDetalle);
    expect(cargarRuta('/rrhh/evaluaciones')).toBe(cargarRrhhEvaluaciones);
    expect(cargarRuta('/rrhh/evaluaciones/9')).toBe(
      cargarRrhhEvaluacionDetalle,
    );
    expect(cargarRuta('/rrhh/pagos-resultado')).toBe(cargarRrhhPagosResultado);
    expect(cargarRuta('/rrhh/pagos-resultado/nuevo')).toBe(
      cargarRrhhPagoResultadoNuevo,
    );
  });

  it('prefiere el prefijo más específico', () => {
    // Los reportes alojados en otros módulos cargan el chunk de reportes.
    expect(cargarRuta('/inventario/existencias')).toBe(cargarReportes);
    expect(cargarRuta('/compra/resumen-liquidaciones')).toBe(cargarReportes);
    expect(cargarRuta('/proyectos/registro-proyectos')).toBe(cargarReportes);
    expect(cargarRuta('/terceros/registro-clientes')).toBe(cargarReportes);
    // Clientes compartidos con compra cargan terceros, no compra.
    expect(cargarRuta('/compra/clientes')).toBe(cargarTerceros);
    expect(cargarRuta('/compra/cuentas')).toBe(cargarTerceros);
    // El catálogo de RRHH se sirve desde rrhh.
    expect(cargarRuta('/configuracion/rrhh/departamentos')).toBe(
      cargarRrhhCatalogos,
    );
    expect(cargarRuta('/configuracion/usuarios')).toBe(cargarAdministracion);
  });

  it('resuelve las homes de módulo y las rutas con anidamiento', () => {
    expect(cargarRuta('/venta')).toBe(cargarVentaHome);
    expect(cargarRuta('/proyecto')).toBe(cargarProyectosHome);
    expect(cargarRuta('/administracion')).toBe(cargarAdministracionHome);
    expect(cargarRuta('/rrhh')).toBe(cargarRrhhHome);
    expect(cargarRuta('/clientes/42')).toBe(cargarTerceros);
  });

  it('ignora query string y hash', () => {
    expect(cargarRuta('/ventas/facturas?pagina=2')).toBe(cargarVentas);
    expect(cargarRuta('/proyectos/etapas#tarea-3')).toBe(
      cargarProyectosEtapas,
    );
  });

  it('devuelve null para rutas sin módulo asociado', () => {
    expect(cargarRuta('/')).toBeNull();
    expect(cargarRuta('/perfil')).toBeNull();
    expect(cargarRuta('/login')).toBeNull();
    expect(cargarRuta('/desconocida')).toBeNull();
  });

  it('no confunde prefijos parciales', () => {
    // `/clientesalgo` no es una subruta de `/clientes`.
    expect(cargarRuta('/clientesalgo')).toBeNull();
    expect(cargarRuta('/productosx')).toBeNull();
  });

  it('solo precarga rutas que tienen cargador', () => {
    for (const ruta of RUTAS_PRECARGA_INICIAL) {
      expect(cargarRuta(ruta)).not.toBeNull();
    }
  });
});
