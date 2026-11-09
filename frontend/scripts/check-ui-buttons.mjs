import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const files = execSync("git ls-files 'src/**/*.{ts,tsx}'", { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const violations = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  if (text.includes('navigate(-1)')) {
    violations.push(`${file}: usa navigate(-1); usa BackButton con destino explícito`);
  }

  const createButtonPattern = /<(Button|button)\b[\s\S]*?<\/\1>/g;
  for (const block of text.match(createButtonPattern) ?? []) {
    if (
      block.includes('<Plus') &&
      (block.includes('from-brand-500') || block.includes('bg-brand-500'))
    ) {
      violations.push(
        `${file}: botón de creación con estilo local; usa CreateButton`,
      );
    }
  }
}

if (violations.length) {
  console.error('Errores de navegación/acciones:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('UI actions guard: OK');
