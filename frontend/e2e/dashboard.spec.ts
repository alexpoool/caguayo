import { expect, test } from '@playwright/test';

const token = 'x.eyJleHAiOjk5OTk5OTk5OTl9.x';

const sesion = {
  token,
  usuario: {
    id_usuario: 1,
    ci: '00000000000',
    nombre: 'Ana',
    primer_apellido: 'Pérez',
    alias: 'ana',
  },
  funcionalidades: [{ id_funcionalidad: 1, nombre: 'dashboard' }],
  base_datos: 'caguayo_demo',
};

const stats = {
  total_productos: 120,
  total_ventas: 45,
  total_clientes: 18,
  total_categorias: 6,
  total_monedas: 3,
  ventas_hoy: 1250.5,
  ventas_hoy_cantidad: 4,
  ventas_ayer: 1000,
  ventas_crecimiento_porcentaje: 25,
  ventas_pendientes: 2,
  ventas_completadas: 1,
  ventas_anuladas: 1,
  ticket_promedio: 312.63,
  productos_stock_bajo: [
    {
      id_producto: 1,
      nombre: 'Producto de prueba con nombre largo',
      descripcion: null,
      precio_compra: 10,
      precio_venta: 20,
      precio_minimo: 15,
      cantidad: 0,
      id_subcategoria: 1,
    },
  ],
  productos_agotados: 1,
  valor_inventario_compra: 5000,
  valor_inventario_venta: 8000,
  ultimas_ventas: [
    {
      id_venta: 1,
      total: 120.5,
      estado: 'COMPLETADA',
      fecha: '2026-11-09',
      cliente: { nombre: 'Cliente de prueba' },
    },
  ],
  clientes_recientes: [
    {
      id_cliente: 1,
      nombre: 'Cliente de prueba',
      fecha_registro: '2026-11-09',
    },
  ],
  top_productos: [
    {
      id_producto: 1,
      nombre: 'Producto de prueba',
      cantidad_vendida: 8,
      monto_total: 160,
      porcentaje: 40,
    },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ token: tokenGuardado, sesion: sesionGuardada }) => {
      localStorage.setItem('auth_token', tokenGuardado);
      localStorage.setItem('auth_user', JSON.stringify(sesionGuardada.usuario));
      localStorage.setItem('auth_base_datos', sesionGuardada.base_datos);
    },
    { token, sesion },
  );

  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ status: 200, json: sesion }),
  );
  await page.route('**/api/v1/dashboard/stats', (route) =>
    route.fulfill({ status: 200, json: stats }),
  );
  await page.route('**/api/v1/dashboard/trends?dias=7', (route) =>
    route.fulfill({
      status: 200,
      json: {
        fechas: ['2026-11-03', '2026-11-04'],
        montos: [100, 200],
        cantidades: [1, 2],
        periodo: '7d',
      },
    }),
  );
  await page.route('**/api/v1/dashboard/movimientos-trends?dias=7', (route) =>
    route.fulfill({
      status: 200,
      json: {
        fechas: ['2026-11-03', '2026-11-04'],
        recepciones: [1, 2],
        mermas: [0, 1],
        donaciones: [0, 0],
        devoluciones: [0, 1],
        periodo: '7d',
      },
    }),
  );
});

test('dashboard no desborda horizontalmente en móvil, tablet y escritorio', async ({
  page,
}) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Tendencia de Movimientos')).toBeVisible();

  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const desborde = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(desborde, `desborde a ${width}px`).toBeLessThanOrEqual(1);
  }
});
