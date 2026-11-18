# Presupuesto de bundle y carga inicial

Medido el 2026-11-18 con `pnpm build && pnpm medir:carga` (KiB gzip).

## Presupuesto

| Medida | Límite | Resultado |
| --- | ---: | ---: |
| JS inicial (scripts y `modulepreload` de `dist/index.html`) | 250 kB gzip | 151,02 kB gzip |
| Cualquier chunk individual | 500 kB gzip | 87,05 kB gzip (`recharts`) |

El margen del JS inicial es de ~99 kB gzip. Cualquier dependencia nueva que entre
en el arranque debe justificarse y, si supera el límite, moverse a carga diferida.

## Qué entra en la primera visita

| Momento | Qué se descarga |
| --- | --- |
| HTML inicial | `index`, `react`, `vendor`, `react-query`, `lucide` y CSS |
| Después del login, en tiempo muerto | chunks de `/dashboard`, `/movimientos`, `/productos`, `/clientes`, `/ventas/facturas` |
| Hover o foco sobre un enlace del menú | chunk de la página destino |
| Al abrir una ruta | solo el chunk de esa página y sus dependencias |

El prefetch se salta cuando `navigator.connection.saveData` está activo o la red
es `slow-2g`/`2g`. `App.tsx` usa `cargarRuta()` para resolver el chunk y
`SidebarLink`/botones de módulo lo disparan en `pointerenter`, `focus` y
`touchstart`.

## Chunks principales

| Chunk | gzip |
| --- | ---: |
| `vendor` | 58,54 kB |
| `react` | 45,76 kB |
| `index` | 30,13 kB |
| `recharts` | 87,05 kB |
| `react-query` | 10,80 kB |
| `lucide` | 9,42 kB |
| CSS | 13,34 kB |

`recharts` no está en el arranque: los gráficos de dashboard y reportes se
importan con `React.lazy` y muestran un esqueleto hasta que su chunk llega.

## Primera visita por módulo

Extra sobre la carga inicial; se muestra la peor página del módulo.

| Módulo | gzip |
| --- | ---: |
| ventas | 48,57 kB |
| compra | 44,94 kB |
| administracion | 35,26 kB |
| inventario | 28,27 kB |
| terceros | 25,82 kB |
| proyectos | 24,57 kB |
| rrhh | 23,06 kB |
| reportes | 20,93 kB |
| dj08 | 15,11 kB |
| dashboard | 4,35 kB |

Cada página de proyectos y RRHH tiene su propio contenedor y su propio chunk:
entrar a "Etapas" ya no descarga el módulo completo. El resto de módulos usa un
contenedor compartido por módulo.

## Comprobación

```bash
pnpm build
pnpm check:size      # presupuesto duro: 250 kB inicial / 500 kB por chunk
pnpm medir:carga     # tabla por módulo + comparación con el baseline
```

`medir:carga` compara contra `scripts/medir-carga.baseline.json` y falla si el
JS inicial o una página empeora más de un 2 %. Leyenda del baseline: antes del
plan de carga inicial el JS inicial era 147,04 kB, dashboard 90,36 kB, reportes
106,28 kB, proyectos 81,08 kB y rrhh 67,49 kB; el inicial subió 4 kB por los
cargadores y el prefetch, a cambio de ~85 kB menos en dashboard/reportes y
~57 kB menos en proyectos.

`pnpm check` incluye typecheck, lint, arquitectura, UI, paleta, tests, build,
`check:size` y `medir:carga`.
