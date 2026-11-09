import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = resolve('dist');
const INDEX = join(DIST, 'index.html');
const MAX_INITIAL_KB = 250;
const MAX_CHUNK_KB = 500;

if (!existsSync(INDEX)) {
  console.error('check:size: falta dist/index.html. Ejecuta `pnpm build` primero.');
  process.exit(1);
}

const html = readFileSync(INDEX, 'utf8');
const references = new Set();
const pattern = /(?:src|href)="([^"]+\.js)"/g;
let match;
while ((match = pattern.exec(html)) !== null) {
  references.add(match[1]);
}

if (references.size === 0) {
  console.error('check:size: no se encontraron chunks JS en dist/index.html.');
  process.exit(1);
}

const gzipKb = (file) =>
  gzipSync(readFileSync(join(DIST, file))).byteLength / 1024;

let initialKb = 0;
for (const reference of references) {
  const file = reference.startsWith('/') ? reference.slice(1) : reference;
  initialKb += gzipKb(file);
}

const jsDir = join(DIST, 'assets');
const chunks = existsSync(jsDir) ? readdirSync(jsDir).filter((name) => name.endsWith('.js')) : [];

let failed = false;

console.log(`Inicial JS: ${initialKb.toFixed(2)} kB gzip (presupuesto ${MAX_INITIAL_KB} kB)`);
if (initialKb > MAX_INITIAL_KB) {
  console.error(`check:size: el JS inicial supera ${MAX_INITIAL_KB} kB gzip.`);
  failed = true;
}

for (const file of chunks) {
  const kb = gzipKb(`assets/${file}`);
  if (kb > MAX_CHUNK_KB) {
    console.error(`check:size: assets/${file} pesa ${kb.toFixed(2)} kB gzip (máximo ${MAX_CHUNK_KB} kB).`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`check:size: OK, ningún chunk supera ${MAX_CHUNK_KB} kB gzip.`);
