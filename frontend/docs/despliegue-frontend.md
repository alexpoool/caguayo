# Despliegue del frontend

`dist/` lo genera `pnpm build` y debe servirse como SPA: cualquier ruta que no sea
un asset devuelve `dist/index.html`.

## Artefactos generados

| Archivo | Para qué |
| --- | --- |
| `dist/index.html` | Entry con `modulepreload` de los chunks que necesita el login. |
| `dist/assets/*` | JS y CSS con hash de contenido. |
| `dist/.vite/manifest.json` | Mapa fuente → asset; lo usa el generador de preloads. |
| `dist/preloads.json` | Mapa ruta → assets para inyectar `modulepreload` en deep links. |

### Contrato de `preloads.json`

```json
{
  "rutas": {
    "/proyectos/etapas": ["/assets/EtapasPageContainer-abc123.js", "..."]
  }
}
```

Para un `GET` de una ruta del SPA, el servidor busca la clave exacta y, si no
existe, la clave más larga que sea prefijo de la URL pedida. Inyecta esos assets
como `<link rel="modulepreload" crossorigin href="...">` en el `<head>`, antes
del script del entry, y elimina los que ya estén en el `index.html`.

Sin esta inyección la app funciona igual: el `index.html` arranca, el router pide
el chunk de la ruta y el usuario ve el `SkeletonPagina` mientras llega. Con la
inyección, el chunk viaja en paralelo con el entry y se ahorra una ronda.

## Cabeceras esperadas

| Recurso | `Cache-Control` | Compresión |
| --- | --- | --- |
| `/index.html`, `/` | `no-cache` (o `max-age=0, must-revalidate`) | gzip o brotli |
| `/assets/*` (tienen hash) | `public, max-age=31536000, immutable` | gzip o brotli |
| `preloads.json`, `manifest.json` | `no-cache` | gzip o brotli |

Activa `Vary: Accept-Encoding` en todo lo comprimido. Sirve por HTTP/2 o HTTP/3
para que el entry y los preloads viajen sin el límite de conexiones de HTTP/1.1.

Ejemplo de nginx:

```nginx
gzip on;
gzip_types text/css application/javascript application/json image/svg+xml;
brotli on;
brotli_types text/css application/javascript application/json image/svg+xml;

location = /index.html { add_header Cache-Control "no-cache"; }
location /assets/   { add_header Cache-Control "public, max-age=31536000, immutable"; }
location /          { try_files $uri $uri/ /index.html; }
```

## Verificación

```bash
pnpm build
pnpm check:carga https://<host>
```

`check:carga` falla si el HTML se cachea, si un asset no trae `content-encoding`
o si no declara caché inmutable. Ejecútalo después de cada despliegue: las
pruebas locales no ven las cabeceras del servidor real.
