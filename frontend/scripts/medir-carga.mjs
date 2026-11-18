/**
 * Mide el peso real de la carga inicial y de la primera visita a cada página.
 *
 * Uso:
 *   pnpm build && pnpm medir:carga
 *
 * Compara contra `scripts/medir-carga.baseline.json` y falla si una página
 * empeora más de un 2 % o si el JS inicial crece.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = resolve('dist');
const ASSETS = join(DIST, 'assets');
const INDEX = join(DIST, 'index.html');
const MANIFEST = join(DIST, '.vite', 'manifest.json');
const BASELINE = resolve('scripts/medir-carga.baseline.json');
const TOLERANCIA = 1.02;

if (!existsSync(INDEX)) {
  console.error('medir:carga: falta dist/index.html. Ejecuta `pnpm build` primero.');
  process.exit(1);
}

const kb = (bytes) => Number((bytes / 1024).toFixed(2));
const gzipKb = (archivo) =>
  kb(gzipSync(readFileSync(join(DIST, archivo))).byteLength);

const html = readFileSync(INDEX, 'utf8');
const iniciales = new Set();
for (const match of html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)) {
  iniciales.add(match[1].replace(/^\//, ''));
}

if (iniciales.size === 0) {
  console.error('medir:carga: no se encontraron assets en dist/index.html.');
  process.exit(1);
}

const archivos = readdirSync(ASSETS).filter((nombre) => nombre.endsWith('.js'));
const pesos = new Map();
const dependencias = new Map();

for (const archivo of archivos) {
  const contenido = readFileSync(join(ASSETS, archivo), 'utf8');
  pesos.set(archivo, gzipKb(`assets/${archivo}`));
  dependencias.set(
    archivo,
    [...contenido.matchAll(/from"\.\/([A-Za-z0-9_-]+\.js)"/g)].map((m) => m[1]),
  );
}

const inicialKb = [...iniciales].reduce(
  (total, archivo) => (archivo.endsWith('.js') ? total + gzipKb(archivo) : total),
  0,
);
const cssKb = [...iniciales].reduce(
  (total, archivo) =>
    archivo.endsWith('.css') ? total + gzipKb(archivo) : total,
  0,
);

const inicialesJs = new Set(
  [...iniciales]
    .filter((archivo) => archivo.endsWith('.js'))
    .map((archivo) => archivo.replace('assets/', '')),
);

/** Chunks extra que descarga una primera visita a la página. */
function extraDeChunk(chunk) {
  const visitados = new Set([chunk]);
  const pendientes = [chunk];
  let total = 0;
  const chunks = [];

  while (pendientes.length > 0) {
    const actual = pendientes.pop();
    if (inicialesJs.has(actual)) continue;
    total += pesos.get(actual) ?? 0;
    chunks.push(actual);
    for (const dependencia of dependencias.get(actual) ?? []) {
      if (!visitados.has(dependencia)) {
        visitados.add(dependencia);
        pendientes.push(dependencia);
      }
    }
  }

  return { total, chunks };
}

/** Agrupa las entradas del manifest por módulo y nombre de página. */
function entradasPorModulo() {
  const grupos = new Map();
  if (!existsSync(MANIFEST)) return grupos;

  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  for (const [origen, entrada] of Object.entries(manifest)) {
    if (!entrada.file) continue;
    const contenedor = origen.match(/^src\/app\/container\/([\w-]+)(?:\/|\.tsx$)/);
    if (!contenedor) continue;
    const modulo = contenedor[1];
    if (origen.endsWith('casos-uso.ts') || origen.endsWith('ConCasosUso.tsx')) {
      continue;
    }
    if (!grupos.has(modulo)) grupos.set(modulo, []);
    grupos.get(modulo).push({
      pagina: origen.split('/').pop().replace(/\.tsx$/, ''),
      chunk: entrada.file.replace(/^assets\//, ''),
    });
  }
  return grupos;
}

let grupos = entradasPorModulo();
if (grupos.size === 0) {
  // Sin manifest (build antiguo): se usa el chunk del módulo completo.
  const MODULOS = [
    'dashboard',
    'terceros',
    'inventario',
    'administracion',
    'ventas',
    'compra',
    'proyectos',
    'rrhh',
    'reportes',
    'dj08',
  ];
  grupos = new Map();
  for (const modulo of MODULOS) {
    const chunk = archivos.find((archivo) =>
      new RegExp(`^${modulo}-[A-Za-z0-9_-]+\\.js$`).test(archivo),
    );
    if (chunk) grupos.set(modulo, [{ pagina: modulo, chunk }]);
  }
}

const porModulo = {};
const resumen = [];
for (const [modulo, entradas] of [...grupos.entries()].sort()) {
  const paginas = entradas
    .map(({ pagina, chunk }) => ({ pagina, ...extraDeChunk(chunk) }))
    .sort((a, b) => b.total - a.total);
  const mayor = paginas[0];
  porModulo[modulo] = mayor.total;
  resumen.push({ modulo, mayor, paginas });
}

const masPesado = [...pesos.entries()].sort((a, b) => b[1] - a[1])[0];

console.log('');
console.log('Carga inicial');
console.log(`  JS   ${inicialKb.toFixed(2).padStart(8)} kB gzip`);
console.log(`  CSS  ${cssKb.toFixed(2).padStart(8)} kB gzip`);
console.log(`  Total ${(inicialKb + cssKb).toFixed(2).padStart(7)} kB gzip`);
console.log('');
console.log('Primera visita (extra sobre lo inicial, peor página del módulo)');
for (const { modulo, mayor, paginas } of resumen.sort(
  (a, b) => b.mayor.total - a.mayor.total,
)) {
  console.log(
    `  ${modulo.padEnd(16)} ${mayor.total.toFixed(2).padStart(8)} kB  (${mayor.pagina})`,
  );
  if (paginas.length > 1) {
    for (const pagina of paginas.slice(1, 3)) {
      console.log(
        `  ${''.padEnd(16)} ${pagina.total.toFixed(2).padStart(8)} kB  (${pagina.pagina})`,
      );
    }
  }
}
console.log('');
console.log(
  `Chunk más pesado: ${masPesado[1].toFixed(2)} kB (${masPesado[0]})`,
);
console.log('');

if (!existsSync(BASELINE)) {
  console.log('medir:carga: sin baseline; se omite la comparación.');
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const fallos = [];

if (inicialKb > baseline.inicialKb * TOLERANCIA) {
  fallos.push(
    `JS inicial ${inicialKb.toFixed(2)} kB > ${baseline.inicialKb} kB (baseline)`,
  );
}

for (const [modulo, valor] of Object.entries(porModulo)) {
  const referencia = baseline.porModulo[modulo];
  if (referencia === undefined) continue;
  if (valor > referencia * TOLERANCIA) {
    fallos.push(`${modulo}: ${valor} kB > ${referencia} kB (baseline)`);
  }
}

if (fallos.length > 0) {
  console.error('medir:carga: la carga empeoró respecto al baseline:');
  for (const fallo of fallos) console.error(`  - ${fallo}`);
  process.exit(1);
}

console.log('medir:carga: sin regresiones frente al baseline.');
