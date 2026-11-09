# Componentes compartidos de UI

## Acciones

### `CreateButton`

Único botón para crear. No reimplementes el estilo en cada pantalla.

- `variant="solid"`: acción principal de la pantalla, alineada a la derecha del `PageHeader`.
- `variant="inline"`: crear al vuelo dentro de un formulario o selector.
- Etiqueta contextual, con género y mayúscula inicial: `Nuevo cliente`, `Nueva factura`.
- Usa `from-brand-500 to-brand-600`; no uses teal/cyan para la acción principal.

```tsx
<CreateButton label="Nuevo cliente" onClick={abrirFormulario} />
```

### `BackButton`

Vuelve siempre a un destino explícito. Nunca uses `navigate(-1)`.

```tsx
<BackButton to="/clientes" label="Volver a clientes" />
```

### `PageHeader`

Orden fijo: volver arriba, título y subtítulo debajo, acciones a la derecha.

```tsx
<PageHeader
  back={<BackButton to="/clientes" />}
  title="Clientes"
  subtitle="Gestión de clientes y proveedores"
  actions={<CreateButton label="Nuevo cliente" onClick={abrir} />}
/>
```

En móvil las acciones pasan debajo del título.

## Paleta

`brand` es el color primario global. Teal, cyan, azules sueltos, índigos y
púrpuras no se usan para acciones ni navegación primaria.

| Token | Uso |
| --- | --- |
| `brand-50` / `brand-100` | fondos suaves, selección, hover de navegación |
| `brand-500` / `brand-600` | acción principal, foco, enlaces |
| `brand-700` | hover de acción principal |
| `brand-800` / `brand-900` | texto sobre fondos claros y estados activos |
| `success` / `warning` / `danger` | estados semánticos; nunca como color de marca |
| `chart-1`–`chart-6` | series de gráficos; no usar en botones ni navegación |
| `gray` | texto, bordes, fondos neutros |

Contraste sobre blanco:

| Token | Ratio | Uso permitido |
| --- | ---: | --- |
| `brand-400` (`#5b8df7`) | 3,18:1 | solo texto grande, iconos decorativos, bordes o fondos |
| `brand-500` (`#2f6cf5`) | 4,58:1 | texto normal y enlaces |
| `brand-600` (`#1f52d6`) | 6,49:1 | texto normal, botones |
| `brand-700` (`#183fa8`) | 9,07:1 | texto pequeño y hover |

No agregues hex sueltos en componentes. Para recharts, canvas, PDFs y estilos
inline usa `PALETA` de `src/config/paleta.ts`; para clases usa los tokens de
`tailwind.config.js`. `pnpm check:palette` detecta colores fuera de la paleta.

## Breakpoints

| Nombre | Ancho | Uso |
|---|---|---|
| base | 320–639 px | teléfono, una columna |
| `sm` | 640 px | tablet pequeña, dos columnas |
| `md` | 768 px | tablet |
| `lg` | 1024 px | escritorio, sidebar fija |
| `xl` | 1280 px | escritorio amplio |

Reglas:

- Móvil primero: parte de una columna y añade breakpoints.
- `main` usa `p-4 md:p-8`.
- Formularios: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
- Tablas: contenedor con `overflow-x-auto` y `min-w`; no provoques scroll horizontal de página.
- Modales: hoja a pantalla completa por debajo de `sm`; centrados desde `sm`.
- Usa `dvh` para alturas de pantalla completa.
- Objetivos táctiles mínimos: 44×44 px.
- Texto informativo mínimo: 12 px (`text-xs`).
