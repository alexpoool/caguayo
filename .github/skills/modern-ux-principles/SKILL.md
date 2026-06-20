---
name: modern-ux-principles
description: "Auditoría obligatoria de Experiencia de Usuario (UX) para @ui-designer. Evalúa carga cognitiva, jerarquía de CTA, manejo de estados (loading/error/empty) y prevención de errores ANTES de maquetar. Si el diseño original rompe principios de UX, propone la mejora y aplica el rediseño. Keywords: ux audit, ux principles, user experience, carga cognitiva, cognitive load, chunking, divulgación progresiva, progressive disclosure, CTA hierarchy, loading state, error state, empty state, skeleton loader, feedback inmediato, prevención errores, error prevention, disabled state, helper text, ux review, ux mejora, retención usuario, ui ux, experiencia usuario."
argument-hint: "Activa junto con vision-to-component para auditar el diseño antes de construir. Proporciona la imagen, mockup o descripción del flujo que se debe evaluar."
---

# Modern UX Principles

Auditoría de Experiencia de Usuario que `@ui-designer` DEBE ejecutar **antes de escribir cualquier JSX**. No es opcional — es la fase 0 de cualquier construcción visual.

Carga esta skill **junto con `vision-to-component`** y **`modern-ui-patterns-2026`**: esta skill evalúa si el diseño es correcto para el usuario; las otras dos gobiernan cómo se construye visualmente.

---

## Cuándo ejecutar esta auditoría

**Siempre** que recibas:
- Una imagen, screenshot o mockup de Figma
- Una descripción textual de un flujo o pantalla
- Un requerimiento de nuevo componente con interacción

La auditoría toma 30 segundos mentales. No es una fase de bloqueo — es una fase de diagnóstico rápido que puede mejorar el resultado final.

---

## Principio 1 — Carga Cognitiva

### Diagnóstico
Cuenta los elementos de decisión o inputs que el usuario debe procesar de una vez:

| Señal de alerta | Solución |
|---|---|
| Más de 5 campos en un formulario sin secciones | Chunking: agrupar en pasos o secciones con encabezado |
| Más de 3 opciones de CTA visibles a la vez | Progressive Disclosure: ocultar opciones avanzadas bajo "Más opciones" |
| Tabla de más de 6 columnas en mobile | Columnas colapsables o vista de cards en mobile |
| Texto de más de 3 párrafos sin jerarquía | Dividir con subtítulos H3, listas o callouts |
| Dashboard con más de 6 métricas al mismo nivel | Bento Box: métricas primarias grandes, secundarias pequeñas |

### Chunking (agrupación)
Cuando hay sobrecarga de información, divide en grupos temáticos con separación visual clara:

```jsx
{/* ✅ Información chunked — paso 1 de 3 */}
<section aria-label="Información básica">
  <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">
    Paso 1 de 3 — Información básica
  </h2>
  {/* Solo 2-3 campos relacionados */}
</section>
```

### Progressive Disclosure
Mostrar solo lo esencial; revelar lo avanzado bajo demanda:

```jsx
{/* ✅ Opciones avanzadas ocultas por defecto */}
<button
  onClick={() => setShowAdvanced(!showAdvanced)}
  className="text-sm text-zinc-500 hover:text-zinc-700 flex items-center gap-1"
  aria-expanded={showAdvanced}
>
  {showAdvanced ? 'Ocultar opciones' : 'Opciones avanzadas'}
  <ChevronDownIcon className={cn('w-4 h-4 transition-transform', showAdvanced && 'rotate-180')} />
</button>
{showAdvanced && <AdvancedOptionsSection />}
```

---

## Principio 2 — Jerarquía de CTA

### Diagnóstico
Toda pantalla o componente debe tener **exactamente un botón primario**. El resto son secundarios o terciarios.

**Señal de alerta**: Dos o más botones con el mismo peso visual (mismo color, mismo tamaño).

### Escala de jerarquía visual

| Nivel | Aspecto | Cuándo usar |
|---|---|---|
| **Primario** | Lleno, color de acento, `size="default"` | La única acción principal de la pantalla |
| **Secundario** | Borde/outline, color neutro | Acciones de soporte (cancelar, volver, exportar) |
| **Terciario / Ghost** | Solo texto, sin borde | Acciones destructivas suaves o links in-context |
| **Destructivo** | Rojo / `destructive`, outline hasta confirmar | Eliminar, revocar, desactivar |

```jsx
{/* ✅ Jerarquía correcta */}
<div className="flex gap-3">
  <Button variant="ghost" onClick={onCancel}>Cancelar</Button>        {/* terciario */}
  <Button variant="outline" onClick={onSaveDraft}>Guardar borrador</Button> {/* secundario */}
  <Button variant="default" onClick={onSubmit}>Publicar</Button>         {/* ÚNICO primario */}
</div>

{/* ❌ Problema: dos primarios compiten */}
<div className="flex gap-3">
  <Button variant="default" onClick={onSaveDraft}>Guardar</Button>
  <Button variant="default" onClick={onSubmit}>Publicar</Button>
</div>
```

### Regla de botón destructivo
Nunca mostrar el botón de acción destructiva como primario. Siempre inicia como `variant="outline"` y solo escala a rojo en el paso de confirmación:

```jsx
{/* Paso 1: botón de alerta, no primary */}
<Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={openConfirm}>
  Eliminar cuenta
</Button>

{/* Paso 2 (modal de confirmación): ahí sí, destructive */}
<Button variant="destructive" onClick={onConfirmDelete}>Sí, eliminar permanentemente</Button>
```

---

## Principio 3 — Manejo de Estados

### Diagnóstico
Todo componente que muestra datos dinámicos DEBE contemplar los 4 estados del ciclo de vida del dato:

| Estado | Pregunta | Sin el estado |
|---|---|---|
| **Loading** | ¿Qué ve el usuario mientras carga? | Layout shift, pantalla en blanco → rebote |
| **Error** | ¿Qué ve si la petición falla? | Pantalla rota, usuario confundido |
| **Empty** | ¿Qué ve si no hay datos? | Pantalla vacía, parece bug |
| **Populated** | ¿Qué ve con datos reales? | El caso feliz — siempre se diseña |

### Si el Contrato de Datos no incluye los estados → reportar a @nextjs-dev

```
⚠️ CONTRATO INCOMPLETO — Estados de ciclo de vida ausentes

El Contrato de Datos actual no incluye las props necesarias para manejar
todos los estados del componente.

Props faltantes sugeridas:
- isLoading: boolean         → para mostrar skeleton loader
- error: string | null       → para mostrar mensaje de error
- isEmpty?: boolean          → para mostrar empty state (si aplica)

@nextjs-dev: ¿Actualizas el contrato con estas props antes de continuar?
```

### Implementación de Skeleton Loader
```jsx
// Skeleton del mismo layout que el componente real — evita layout shift
if (isLoading) return (
  <div className="rounded-3xl p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 animate-pulse">
    <div className="h-5 w-2/3 bg-zinc-200 dark:bg-zinc-700 rounded-lg mb-3" />
    <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded mb-2" />
    <div className="h-4 w-4/5 bg-zinc-200 dark:bg-zinc-700 rounded mb-4" />
    <div className="h-10 w-full bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
  </div>
)
```

### Implementación de Error State
```jsx
if (error) return (
  <div
    role="alert"
    className="rounded-3xl p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-center"
  >
    <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
      Algo salió mal
    </p>
    <p className="text-xs text-red-600/70 dark:text-red-400/70">{error}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-3 text-xs text-red-700 dark:text-red-400 underline hover:no-underline"
      >
        Intentar de nuevo
      </button>
    )}
  </div>
)
```

### Implementación de Empty State
```jsx
if (isEmpty || items.length === 0) return (
  <div className="rounded-3xl p-10 border-2 border-dashed border-zinc-200 dark:border-zinc-700 text-center">
    {/* Icono representativo del contenido vacío */}
    <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
      <InboxIcon className="w-6 h-6 text-zinc-400" />
    </div>
    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
      Aún no hay {contentLabel}
    </p>
    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
      {emptyDescription}
    </p>
    {onEmptyAction && (
      <Button variant="outline" size="sm" onClick={onEmptyAction}>
        {emptyActionLabel}
      </Button>
    )}
  </div>
)
```

---

## Principio 4 — Prevención de Errores

El mejor error es el que nunca ocurre. El sistema debe guiar al usuario hacia acciones válidas.

### Diagnóstico
| Señal de alerta | Solución |
|---|---|
| Botón de submit siempre activo aunque el form esté vacío | Deshabilitar `disabled={!isValid}` |
| Input sin placeholder ni label descriptivo | Agregar `placeholder` + `helper text` debajo |
| Acción destructiva sin confirmación | Modal/popover de confirmación con descripción del impacto |
| Formulario que solo falla al enviar | Validación en tiempo real con feedback inline |

### Botón deshabilitado con feedback
```jsx
<button
  type="submit"
  disabled={!isValid || isSubmitting}
  aria-disabled={!isValid || isSubmitting}
  className={cn(
    'w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200',
    isValid && !isSubmitting
      ? 'bg-violet-600 text-white hover:bg-violet-500 hover:scale-[1.01] active:scale-95'
      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
  )}
>
  {isSubmitting ? (
    <span className="flex items-center justify-center gap-2">
      <Spinner className="w-4 h-4 animate-spin" />
      Guardando...
    </span>
  ) : 'Guardar'}
</button>
```

### Helper text y validación inline
```jsx
<div className="space-y-1">
  <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
    Correo electrónico
  </label>
  <input
    id="email"
    type="email"
    aria-describedby="email-error email-hint"
    aria-invalid={!!emailError}
    className={cn(
      'w-full rounded-xl border px-3 py-2 text-sm transition-colors duration-200',
      'focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500',
      emailError
        ? 'border-red-400 bg-red-50 dark:bg-red-500/5'
        : 'border-zinc-300 dark:border-zinc-600'
    )}
  />
  {/* Hint siempre visible */}
  <p id="email-hint" className="text-xs text-zinc-500 dark:text-zinc-400">
    Recibirás la confirmación en este correo.
  </p>
  {/* Error condicional, usa role="alert" para screen readers */}
  {emailError && (
    <p id="email-error" role="alert" className="text-xs text-red-600 dark:text-red-400">
      {emailError}
    </p>
  )}
</div>
```

---

## Protocolo de Auditoría — Ejecutar Antes de Maquetar

### Paso 1: Diagnóstico rápido (30 segundos)
Responde mentalmente:

- [ ] ¿Más de 5 inputs o 3 CTAs visibles a la vez? → Aplicar chunking o progressive disclosure
- [ ] ¿Hay un único CTA primario claro? → Si no, redefinir jerarquía
- [ ] ¿El Contrato de Datos incluye `isLoading`, `error`, y empty state? → Si no, reportar a @nextjs-dev
- [ ] ¿El submit puede dispararse con datos inválidos? → Aplicar `disabled` + validación inline

### Paso 2: Comunicar cambios propuestos
Si el diseño original rompe algún principio, comunícalo **antes de escribir código**:

```
🔍 UX Audit — Cambios propuestos antes de maquetar

El diseño original presenta los siguientes problemas de UX:

1. [PROBLEMA]: [descripción concisa — 1 línea]
   [IMPACTO]: [qué le pasa al usuario si no se corrige]
   [SOLUCIÓN APLICADA]: [qué cambia en el código]

2. [PROBLEMA]: ...

Voy a aplicar estas mejoras en el componente generado.
¿Alguna objeción antes de continuar?
```

### Paso 3: Maquetar con los principios corregidos
Construye el componente con las mejoras ya integradas, no como un parche posterior.

---

## Árbol de Decisión UX

```
¿El diseño tiene > 5 inputs o > 3 CTAs visibles?
├── SÍ → Proponer chunking / progressive disclosure antes de maquetar
└── NO → Continuar

¿Hay un único CTA primario?
├── NO → Redefinir jerarquía: 1 primario, resto secondary/ghost
└── SÍ → Continuar

¿El Contrato de Datos incluye isLoading, error y empty state?
├── NO → Reportar a @nextjs-dev con props sugeridas. Pausar o maquetar con props propuestas
└── SÍ → Continuar

¿El botón de acción puede dispararse con datos inválidos?
├── SÍ → Aplicar disabled dinámico + helper text + validación inline
└── NO → Continuar

→ Maquetar con modern-ui-patterns-2026 + vision-to-component con mejoras UX integradas
```
