import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const conexiones = [
  {
    id_conexion: 1,
    nombre_database: 'caguayo_demo',
    host: '127.0.0.1',
    puerto: 5432,
  },
];

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', async (route) => {
    await route.fulfill({ status: 200, json: [] });
  });
  await page.route('**/api/v1/conexiones', async (route) => {
    await route.fulfill({ status: 200, json: conexiones });
  });
  await page.route('**/api/v1/conexiones/test', async (route) => {
    await route.fulfill({ status: 200, json: { success: true } });
  });
});

test('login muestra el formulario y no tiene violaciones axe A/AA', async ({
  page,
}) => {
  await page.goto('/login');
  await expect(
    page.getByRole('heading', { name: 'Iniciar Sesión' }),
  ).toBeVisible();
  await expect(page.getByLabel('Base de Datos')).toBeVisible();
  await expect(page.getByLabel('Alias de Usuario')).toBeVisible();
  await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();

  const resultados = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  expect(resultados.violations).toEqual([]);
});

test('login no desborda horizontalmente en móvil, tablet y escritorio', async ({
  page,
}) => {
  await page.goto('/login');

  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const desborde = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(desborde, `desborde a ${width}px`).toBeLessThanOrEqual(1);
  }
});

test('una ruta protegida sin sesión redirige a login', async ({ page }) => {
  await page.goto('/clientes');
  await expect(page).toHaveURL(/\/login/);
});

test('login guarda la sesión y entra al sistema', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        token: 'x.eyJleHAiOjk5OTk5OTk5OTl9.x',
        usuario: {
          id_usuario: 1,
          ci: '00000000000',
          nombre: 'Ana',
          primer_apellido: 'Pérez',
          alias: 'ana',
        },
        funcionalidades: [{ id_funcionalidad: 1, nombre: 'dashboard' }],
        base_datos: 'caguayo_demo',
      },
    });
  });

  await page.goto('/login');
  await page.getByLabel('Base de Datos').selectOption('caguayo_demo');
  await page.getByLabel('Alias de Usuario').fill('ana');
  await page.getByLabel('Contraseña', { exact: true }).fill('secreta');
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

  await expect(page).toHaveURL('http://127.0.0.1:5173/');
  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token).toBe('x.eyJleHAiOjk5OTk5OTk5OTl9.x');
});
