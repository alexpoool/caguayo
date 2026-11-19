// Medición de velocidad por página con Playwright (Firefox).
// Sirve el dist de producción en :5173 (vite preview) + backend :8000.
import { firefox } from '@playwright/test';

const BASE = 'http://localhost:5173';
const API = 'http://localhost:8000/api/v1';
const RUTAS = [
  '/', '/dashboard', '/terceros', '/clientes', '/productos', '/inventario',
  '/movimientos', '/venta', '/ventas/facturas', '/compra',
  '/compra/liquidaciones', '/proyectos/proyectos', '/proyectos/solicitudes',
  '/rrhh/empleados', '/rrhh/nomina', '/reportes', '/administracion',
  '/configuracion', '/usuarios', '/perfil',
];

const browser = await firefox.launch();

async function datosLogin() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alias: 'admin', contrasenia: 'admin123', base_datos: 'caguayo' }),
  });
  if (!res.ok) throw new Error(`login API ${res.status}`);
  return res.json();
}

const sesion = await datosLogin();

// Contexto con sesión pre-cargada (addInitScript corre antes del app bundle).
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(
  ({ token, usuario, baseDatos, funcionalidades }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(usuario));
    localStorage.setItem('auth_base_datos', baseDatos);
    localStorage.setItem('auth_funcionalidades', JSON.stringify(funcionalidades));
  },
  {
    token: sesion.token,
    usuario: sesion.usuario,
    baseDatos: sesion.base_datos,
    funcionalidades: sesion.funcionalidades,
  },
);

const page = await ctx.newPage();

async function medir(nombre, url, { primera = false } = {}) {
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const tDCL = Date.now() - t0;
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  const tIdle = Date.now() - t0;

  const perf = await page.evaluate(() => {
    const recursos = performance.getEntriesByType('resource');
    const api = recursos.filter((r) =>
      /\/api\/v1\//.test(r.name) && (r.initiatorType === 'fetch' || r.initiatorType === 'xmlhttprequest'),
    );
    const transfer = recursos.reduce((a, r) => a + (r.transferSize || 0), 0);
    const lento = Math.max(0, ...recursos.map((r) => r.duration));
    return { n: recursos.length, api: api.length, transfer, lento: Math.round(lento) };
  });

  const kb = Math.round(perf.transfer / 1024);
  console.log(
    `${primera ? '★' : ' '} ${nombre.padEnd(30)} DCL ${String(tDCL).padStart(5)}ms  idle ${String(tIdle).padStart(5)}ms  req ${String(perf.n).padStart(3)}  api ${String(perf.api).padStart(2)}  ${String(kb).padStart(4)}KB  recurso+Lento ${perf.lento}ms`,
  );
  return { tDCL, tIdle };
}

// M1: arranque sin sesión (contexto frío, redirect a /login)
const ctxFrio = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const pFrio = await ctxFrio.newPage();
let t0 = Date.now();
await pFrio.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await pFrio.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
console.log(`★ ${'(sin sesión → /login)'.padEnd(30)} total ${(Date.now() - t0)}ms  url=${pFrio.url()}`);
await ctxFrio.close();

// M2: arranque con sesión (caché fría, JS completo) — primera medición '★'
console.log('\n== Arranque y páginas (Firefox, dist producción, caché de contexto frío solo en la primera) ==');
await medir('boot con sesión /', BASE + '/', { primera: true });

// M3: warm reload
t0 = Date.now();
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
console.log(`★ ${'(recarga / — caché caliente)'.padEnd(30)} total ${Date.now() - t0}ms`);

// M4: páginas
for (const ruta of RUTAS.slice(1)) {
  await medir(ruta, BASE + ruta);
}

// Resumen: URL final de la última ruta (detección de redirects a /login)
console.log(`\nURL final de la última ruta: ${page.url()}`);

await browser.close();
