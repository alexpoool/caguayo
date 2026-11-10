import { expect, test } from '@playwright/test';

const token = 'x.eyJleHAiOjk5OTk5OTk5OTl9.x';

const funcionalidades = [
  'dashboard',
  'movimientos',
  'pendientes',
  'productos',
  'clientes',
  'contratos',
  'proveedores',
  'convenios',
  'anexos',
  'liquidaciones',
  'productos_liquidacion',
  'facturas',
  'venta_efectivo',
  'ofertas_tienda',
  'pre_facturas_tienda',
  'servicios',
  'solicitudes',
  'proyectos',
  'facturas_servicio',
  'ofertas',
  'pre_facturas',
  'liquidaciones_servicio',
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
  'configuracion',
  'monedas',
  'usuarios',
  'grupos',
  'dependencias',
  'cuentas',
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
].map((nombre, index) => ({ id_funcionalidad: index + 1, nombre }));

const sesion = {
  token,
  usuario: {
    id_usuario: 1,
    ci: '00000000000',
    nombre: 'Ana',
    primer_apellido: 'Pérez',
    alias: 'ana',
  },
  funcionalidades,
  base_datos: 'caguayo_demo',
};

const rutas = [
  '/',
  '/dashboard',
  '/inventario',
  '/movimientos',
  '/movimientos/pendientes',
  '/productos',
  '/terceros',
  '/clientes',
  '/compra',
  '/compra/proveedores',
  '/compra/anexos',
  '/compra/liquidaciones',
  '/compra/productos-liquidacion',
  '/venta',
  '/ventas/contratos',
  '/ventas/suplementos',
  '/ventas/facturas',
  '/ventas/ofertas',
  '/ventas/efectivo',
  '/proyectos/proyectos',
  '/proyectos/solicitudes',
  '/proyectos/realizadores',
  '/proyectos/certificaciones',
  '/reportes',
  '/reportes/existencias',
  '/reportes/registro-clientes',
  '/reportes/registro-proyectos',
  '/reportes/onat',
  '/administracion',
  '/configuracion',
  '/monedas',
  '/usuarios',
  '/grupos',
  '/dependencias',
  '/respaldos',
  '/cuentas',
  '/rrhh',
  '/rrhh/empleados',
  '/rrhh/asistencia',
  '/rrhh/solicitudes',
  '/rrhh/nomina',
  '/rrhh/reportes',
  '/dj08',
];

const anchos = [320, 390, 768, 1024, 1440];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ token: tokenGuardado, usuario, baseDatos }) => {
      localStorage.setItem('auth_token', tokenGuardado);
      localStorage.setItem('auth_user', JSON.stringify(usuario));
      localStorage.setItem('auth_base_datos', baseDatos);
    },
    {
      token,
      usuario: sesion.usuario,
      baseDatos: sesion.base_datos,
    },
  );

  await page.route('**/api/v1/**', async (route) => {
    await route.fulfill({ status: 200, json: [] });
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({ status: 200, json: sesion });
  });
});

test('las rutas principales no desbordan horizontalmente en ningún ancho', async ({
  page,
}) => {
  for (const ruta of rutas) {
    await page.goto(ruta);

    for (const width of anchos) {
      await page.setViewportSize({ width, height: 900 });
      const desborde = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(
        desborde,
        `${ruta} desborda a ${width}px`,
      ).toBeLessThanOrEqual(1);
    }
  }
});

test('el header móvil muestra los nombres de los módulos y áreas táctiles de 44 px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const nav = page.getByRole('navigation', { name: 'Módulos' });
  await expect(nav.getByRole('button', { name: 'Inventario' })).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Tienda' })).toBeVisible();

  const inventario = nav.getByRole('button', { name: 'Inventario' });
  const caja = await inventario.boundingBox();
  expect(caja?.height ?? 0).toBeGreaterThanOrEqual(44);
});

test('en tablet el sidebar queda como riel y en escritorio se expande', async ({
  page,
}) => {
  await page.goto('/');
  const sidebar = page.locator('#sidebar-mobile');

  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(sidebar).toBeVisible();
  expect((await sidebar.boundingBox())?.width ?? 0).toBeLessThanOrEqual(80);

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(sidebar).toBeVisible();
  expect((await sidebar.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(240);
});
