import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const SRC = 'src';
const violations = [];

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function importsOf(text) {
  const imports = [];
  const pattern = /(?:from\s+|import\s*\()(['"])([^'"]+)\1/g;
  let match;
  while ((match = pattern.exec(text)) !== null) imports.push(match[2]);
  return imports;
}

/** Normaliza imports relativos y el alias `@/` a una ruta lógica `src/...`. */
function importPath(file, specifier) {
  if (specifier.startsWith('@/')) return `${SRC}/${specifier.slice(2)}`;
  if (!specifier.startsWith('.')) return specifier;
  return relative('.', resolve(dirname(file), specifier)).replaceAll('\\', '/');
}

function featureOf(path) {
  const parts = path.split(/[\\/]/);
  const index = parts.indexOf('features');
  return index === -1 ? null : parts[index + 1];
}

function layerOf(path) {
  const parts = path.split(/[\\/]/);
  const index = parts.indexOf('features');
  return index === -1 || parts.length <= index + 2 ? null : parts[index + 2];
}

for (const file of walk(SRC)) {
  const text = readFileSync(file, 'utf8');
  const imports = importsOf(text);
  const feature = featureOf(file);
  const layer = layerOf(file);
  const isShared = file.includes(`${SRC}/shared/`) || file.includes(`${SRC}\\shared\\`);
  const isSharedDomain = file.includes('shared/domain') || file.includes('shared\\domain');
  const isSharedUi = file.includes('shared/ui') || file.includes('shared\\ui');

  for (const specifier of imports) {
    const resolved = importPath(file, specifier);

    if (feature) {
      const other = resolved.match(/(?:^|\/)features\/([^/]+)/);
      if (other && other[1] !== feature) {
        violations.push(`${relative('.', file)}: importa la feature ${other[1]} desde ${feature}`);
      }
      if (
        layer === 'ui' &&
        (resolved.includes('infrastructure') || resolved.includes('/services/'))
      ) {
        violations.push(`${relative('.', file)}: ui importa infraestructura (${specifier})`);
      }
      if (
        layer === 'application' &&
        (resolved.includes('infrastructure') || resolved.includes('/services/'))
      ) {
        violations.push(`${relative('.', file)}: application importa infraestructura (${specifier})`);
      }
      if (
        layer === 'domain' &&
        (resolved.includes('infrastructure') ||
          resolved.includes('/services/') ||
          resolved.includes('/ui/'))
      ) {
        violations.push(`${relative('.', file)}: domain importa una capa externa (${specifier})`);
      }
    }

    if (isShared && resolved.includes('features')) {
      violations.push(`${relative('.', file)}: shared importa una feature (${specifier})`);
    }

    if (
      isSharedUi &&
      (resolved.includes('/infrastructure/') ||
        resolved.includes('/services/') ||
        resolved.includes('/pages/') ||
        resolved.includes('/context/'))
    ) {
      violations.push(`${relative('.', file)}: shared/ui importa una capa no compartida (${specifier})`);
    }
  }

  if (isSharedDomain && /from ['"]react['"]|from ['"]axios['"]/.test(text)) {
    violations.push(`${relative('.', file)}: domain importa React o axios`);
  }
}

if (violations.length) {
  console.error('Errores de arquitectura:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Arquitectura: fronteras OK');
