import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const src = join(root, 'src');

const printFiles = new Set([
  'src/features/compra/ui/LiquidacionesPage.tsx',
  'src/features/proyectos/ui/LiquidacionesPage.tsx',
  'src/features/proyectos/ui/facturaDocumento.ts',
  'src/features/ventas/ui/facturas/FacturasPage.tsx',
  'src/features/ventas/ui/ofertas/OfertasPage.tsx',
]);

const allowedHex = (file) =>
  file === 'src/config/paleta.ts' || printFiles.has(file);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const violations = [];
for (const absolute of walk(src)) {
  if (!/\.(ts|tsx)$/.test(absolute) || /\.test\.(ts|tsx)$/.test(absolute)) continue;
  const file = relative(root, absolute).replaceAll('\\', '/');
  const text = readFileSync(absolute, 'utf8');

  if (/(?:bg|text|border|ring|from|to|via|fill|stroke)-(?:teal|cyan)-/.test(text)) {
    violations.push(`${file}: usa teal/cyan como color de interfaz; usa brand`);
  }

  if (!allowedHex(file) && /#[0-9a-fA-F]{6}\b/.test(text)) {
    violations.push(`${file}: contiene hex de color; usa PALETA o una clase Tailwind`);
  }
}

if (violations.length) {
  console.error('Errores de paleta:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Palette guard: OK');
