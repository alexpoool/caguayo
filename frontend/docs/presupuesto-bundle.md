# Presupuesto de bundle

Medido el 2026-11-07 con `pnpm build && pnpm check:size`.

## Presupuesto

| Medida | Límite | Resultado |
| --- | ---: | ---: |
| JS inicial (scripts y `modulepreload` de `dist/index.html`) | 250 kB gzip | 241,19 kB gzip |
| Cualquier chunk individual | 500 kB gzip | 87,05 kB gzip (`recharts`) |

El chunk más pesado es `recharts` y solo se carga en pantallas que usan gráficos.
El margen del JS inicial es de 8,81 kB gzip. Cualquier dependencia nueva que entre
en el arranque debe justificarse y, si supera el límite, moverse a carga diferida.

## Comprobación

```bash
pnpm build
pnpm check:size
```

`check:size` falla si el JS inicial supera 250 kB gzip o si un chunk supera
500 kB gzip. También forma parte de `pnpm check`.

## Chunks principales

| Chunk | gzip |
| --- | ---: |
| `index` | 36,84 kB |
| `vendor` | 57,10 kB |
| `react` | 45,77 kB |
| `recharts` | 87,05 kB |
| `react-query` | 10,80 kB |
| `lucide` | 9,42 kB |
| CSS | 12,88 kB |

Las rutas de páginas se cargan con `React.lazy`; los módulos pesados no forman
parte del arranque.
