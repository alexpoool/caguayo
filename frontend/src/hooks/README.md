# Búsqueda y paginación

`useInfiniteList` es el único hook para listas paginadas por cursor/skip.

## Contrato

```ts
const { items, total, hasMore, loadMore, searchTerm, setSearch } =
  useInfiniteList<Cliente>({
    queryKeyBase: 'clientes',
    queryFn: (skip, limit, search, onTotal) =>
      clientesService.getClientes(skip, limit, onTotal, search),
  });
```

- `skip` y `limit` son obligatorios.
- `search` se envía al backend. No filtres la página recibida en el cliente:
  solo verías la página actual y el total quedaría incorrecto.
- `onTotal` se llama con el total real del backend, no con `items.length`.
- Todo parámetro extra de filtro va en `extraQueryKeyParams`.
- Cambiar `searchTerm` reinicia a la primera página.
- `gcTime` está acotado para no retener páginas indefinidamente.

## Reglas

1. Una pantalla con buscador envía `search` al endpoint o no muestra buscador.
2. Los conteos derivados se calculan con `Map`/`Set` en una pasada.
3. Pagina antes de virtualizar. Virtualiza solo cuando la página siga siendo
   costosa después de reducirla a 100 filas.
4. Fechas de calendario: `hoyLocal()` y `toISODateLocal()`; nunca
   `toISOString().split('T')[0]`.
5. Montos que se envían al backend: `Decimal`; no encadenes `Number` con
   división/multiplicación para importes.
