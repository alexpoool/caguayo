/**
 * Verifica que el servidor que sirve el frontend comprime y cachea bien.
 *
 * Uso:
 *   pnpm check:carga https://erp.ejemplo.com
 *
 * Comprueba, sobre el index y un asset con hash:
 *   - JS/CSS con `content-encoding: br` o `gzip`.
 *   - Assets con hash: `cache-control` con `immutable` y `max-age` largo.
 *   - HTML: `cache-control` sin cachear (`no-cache` o `max-age=0`).
 *
 * No sustituye a un test de despliegue completo: solo vigila las cabeceras que
 * más afectan a la primera visita.
 */
const base = (process.argv[2] ?? '').replace(/\/$/, '');
if (!base) {
  console.error('check:carga: falta la URL base (ej. https://erp.ejemplo.com).');
  process.exit(2);
}

const errores = [];
const avisos = [];

async function pedir(ruta) {
  try {
    const respuesta = await fetch(`${base}${ruta}`, { redirect: 'follow' });
    return respuesta;
  } catch (error) {
    errores.push(`${ruta}: no se pudo pedir (${error.message})`);
    return null;
  }
}

function comprimido(cabecera) {
  return /(^|,)\s*(br|gzip)\b/i.test(cabecera ?? '');
}

function cacheLarga(cabecera) {
  if (!cabecera) return false;
  const maxAge = cabecera.match(/max-age=(\d+)/i)?.[1];
  return /immutable/i.test(cabecera) && Number(maxAge ?? 0) >= 31536000;
}

function cacheCorta(cabecera) {
  if (!cabecera) return false;
  if (/no-cache|no-store/i.test(cabecera)) return true;
  const maxAge = cabecera.match(/max-age=(\d+)/i)?.[1];
  return maxAge !== undefined && Number(maxAge) === 0;
}

const inicio = await pedir('/');
if (inicio) {
  const html = await inicio.text();
  const cache = inicio.headers.get('cache-control');
  if (inicio.status !== 200) {
    errores.push(`/: respondió ${inicio.status}`);
  }
  if (!cacheCorta(cache)) {
    errores.push(`/: cache-control "${cache ?? 'ausente'}" (se espera no-cache)`);
  }

  const assets = [
    ...new Set(
      [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/g)].map(
        (match) => match[1],
      ),
    ),
  ];
  if (assets.length === 0) {
    avisos.push('/: no se encontraron assets en el HTML; ¿es el index de Vite?');
  }

  for (const asset of assets.slice(0, 4)) {
    const respuesta = await pedir(`/${asset}`);
    if (!respuesta) continue;
    if (respuesta.status !== 200) {
      errores.push(`/${asset}: respondió ${respuesta.status}`);
      continue;
    }
    const encoding = respuesta.headers.get('content-encoding');
    const cache = respuesta.headers.get('cache-control');
    if (!comprimido(encoding)) {
      errores.push(
        `/${asset}: content-encoding "${encoding ?? 'ausente'}" (se espera br o gzip)`,
      );
    }
    if (!cacheLarga(cache)) {
      errores.push(
        `/${asset}: cache-control "${cache ?? 'ausente'}" (se espera immutable con max-age largo)`,
      );
    }
    if (!respuesta.headers.get('vary')?.toLowerCase().includes('accept-encoding')) {
      avisos.push(`/${asset}: falta Vary: Accept-Encoding`);
    }
  }
}

for (const aviso of avisos) console.warn(`aviso: ${aviso}`);

if (errores.length > 0) {
  console.error('check:carga: el servidor no cumple:');
  for (const error of errores) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('check:carga: compresión y caché OK.');
