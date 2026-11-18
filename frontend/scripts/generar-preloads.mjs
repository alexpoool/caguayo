/**
 * Genera `dist/preloads.json`: por cada ruta del SPA, los assets que el
 * servidor debe inyectar como `<link rel="modulepreload">` en el HTML.
 *
 * Sin esto, un deep link (abrir `/proyectos/etapas` en frío) necesita dos
 * rondas: primero el entry, luego el chunk de la ruta. Con los preloads el
 * navegador descarga ambos en paralelo.
 *
 * Se ejecuta después de `vite build`; si algo no se puede resolver avisa y
 * sigue: el preload es una optimización, nunca un requisito para arrancar.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DIST = resolve('dist');
const MANIFEST = join(DIST, '.vite', 'manifest.json');
const APP = resolve('src/App.tsx');
const CARGADORES = resolve('src/app/rutas/cargadores.ts');
const SALIDA = join(DIST, 'preloads.json');

if (!existsSync(MANIFEST)) {
  console.warn('generar-preloads: falta el manifest; se omite.');
  process.exit(0);
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const app = readFileSync(APP, 'utf8');
const cargadores = readFileSync(CARGADORES, 'utf8');

/** Assets que index.html ya carga: no se repiten en los preloads. */
const yaEnHtml = new Set(
  [...readFileSync(join(DIST, 'index.html'), 'utf8').matchAll(
    /(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/g,
  )].map((match) => match[1]),
);

/** Variable del componente lazy → función cargadora. */
const lazyDeVariable = new Map();
for (const match of app.matchAll(
  /const (\w+) = lazy\(\(\) =>\s*(\w+)\(\)/g,
)) {
  lazyDeVariable.set(match[1], match[2]);
}

/** Función cargadora → módulo fuente, relativo a la raíz del proyecto. */
const fuenteDeCargador = new Map();
for (const match of cargadores.matchAll(
  /export const (\w+) = \(\) =>\s*import\('([^']+)'\)/g,
)) {
  const [, nombre, especificador] = match;
  const fuente = especificador.startsWith('.')
    ? resolve('src/app/rutas', especificador).replace(`${process.cwd()}/`, '')
    : especificador;
  fuenteDeCargador.set(nombre, `${fuente}.tsx`);
}

const archivosDe = new Map();
function assetsDeFuente(fuente, visitados = new Set()) {
  const entrada = manifest[fuente];
  if (!entrada || visitados.has(entrada.file)) return [];
  visitados.add(entrada.file);

  const assets = [entrada.file];
  if (entrada.css) assets.push(...entrada.css);
  for (const dependencia of entrada.imports ?? []) {
    // `imports` del manifest son claves del propio manifest.
    const dependenciaEntrada = manifest[dependencia];
    if (!dependenciaEntrada) continue;
    if (dependenciaEntrada.file && !visitados.has(dependenciaEntrada.file)) {
      visitados.add(dependenciaEntrada.file);
      assets.push(dependenciaEntrada.file);
      assets.push(...assetsDeFuente(dependencia, visitados));
    }
  }
  return assets;
}

const rutas = {};
const sinResolver = [];
for (const bloque of app.split('<Route').slice(1)) {
  const ruta = bloque.match(/path="([^"]+)"/)?.[1];
  if (!ruta) continue;
  const componente = [...lazyDeVariable.keys()].find((variable) =>
    bloque.includes(`<${variable}`),
  );
  if (!componente) continue;

  const cargador = lazyDeVariable.get(componente);
  const fuente = fuenteDeCargador.get(cargador);
  if (!fuente || !manifest[fuente]) {
    sinResolver.push(`${ruta} (${componente})`);
    continue;
  }

  const assets = assetsDeFuente(fuente).filter(
    (asset) => !yaEnHtml.has(asset),
  );
  if (assets.length > 0) {
    rutas[ruta] = assets.map((asset) => `/${asset}`);
  }
  archivosDe.set(ruta, assets);
}

writeFileSync(
  SALIDA,
  `${JSON.stringify(
    {
      generado: new Date().toISOString(),
      contrato:
        'Para GET <ruta>, inyecta los assets de la clave exacta (o del prefijo más largo que coincida) como <link rel="modulepreload"> antes del script del entry.',
      rutas,
    },
    null,
    2,
  )}\n`,
);

const total = Object.keys(rutas).length;
console.log(`generar-preloads: ${total} rutas en dist/preloads.json`);
if (sinResolver.length > 0) {
  console.warn(
    `generar-preloads: ${sinResolver.length} rutas sin chunk (no crítico): ${sinResolver
      .slice(0, 5)
      .join(', ')}`,
  );
}
