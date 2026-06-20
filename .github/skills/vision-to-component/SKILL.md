---
name: vision-to-component
description: "Guía a @ui-designer para maquetar una UI: validar el Contrato de Datos (TypeScript Interface) entregado por @nextjs-dev, analizar el diseño visual (imagen/mockup/descripción) y escribir el componente presentacional React + Tailwind/MUI/RN estrictamente según el contrato. Se detiene si el diseño requiere datos ausentes en el contrato y notifica a @nextjs-dev. Keywords: vision to component, mockup to code, maquetación, maquetar UI, componente presentacional, diseño a código, ui-designer, Contrato de Datos, TypeScript interface, Tailwind component, MUI component, componente visual, diseño visual, imagen a componente, figma to code."
argument-hint: "Proporciona: 1) el Contrato de Datos (TypeScript Interface de @nextjs-dev), 2) imagen/mockup o descripción del diseño visual."
---

# Vision to Component

Flujo completo para convertir un diseño visual en un componente React presentacional de producción, respetando estrictamente el Contrato de Datos.

## Cuándo usar esta skill
- Cuando @ui-designer recibe un mockup, imagen de Figma, captura de pantalla o descripción textual de un diseño
- Cuando @nextjs-dev ha entregado un Contrato de Datos y hay un diseño que implementar
- Cuando hay que traducir "así se ve" en "así se codea"

---

## Fase 1 — Validar el Contrato de Datos

**Este paso es obligatorio antes de escribir código.**

### 1.1 Verificar recepción
Confirma que tienes una TypeScript Interface explícita. Ejemplo mínimo válido:

```typescript
interface HeroSectionProps {
  title: string
  subtitle: string
  ctaLabel: string
  onCtaClick: () => void
  backgroundImageUrl?: string
}
```

### 1.2 Si NO hay contrato
Detente completamente y responde:

```
⛔ SKILL BLOQUEADA — Contrato de Datos ausente

No puedo iniciar la maquetación sin el Contrato de Datos.

@nextjs-dev: Por favor entrega la TypeScript Interface completa de este
componente antes de continuar. Necesito saber exactamente qué props recibirá.
```

### 1.3 Registrar el contrato
Anota mentalmente cada prop:
- Nombre exacto
- Tipo exacto (string, number, boolean, callback, union type, etc.)
- Si es opcional (`?`) o requerida

---

## Fase 2 — Análisis del Diseño Visual

Examina el input visual (imagen, mockup, o descripción) y extrae:

| Elemento | Qué extraer |
|----------|-------------|
| **Layout** | Flex/Grid, columnas, gaps, alineación |
| **Tipografía** | Jerarquía (H1/H2/body), pesos, tamaños relativos |
| **Color** | Fondos, textos, bordes, acentos — mapear a tokens del proyecto |
| **Espaciado** | Padding/margin en escala (4, 8, 12, 16, 24, 32...) |
| **Componentes base** | Botones, cards, badges, inputs que ya existen en el proyecto |
| **Interacciones** | Áreas clicables, elementos de formulario, toggles |
| **Breakpoints** | ¿Cómo cambia el layout en mobile vs desktop? |

---

## Fase 3 — Auditoría de Paridad Contrato ↔ Diseño

**Este es el punto de control crítico.**

Recorre cada elemento visual del diseño y verifica si tiene una prop en el contrato:

```
✅ título visible  →  prop "title: string"           → OK
✅ subtítulo       →  prop "subtitle: string"         → OK
⚠️ badge de estado →  NO HAY prop en el contrato     → ALERTA
```

### 3.1 Si hay datos visuales sin prop en el contrato

**Detente** y reporta a @nextjs-dev con precisión quirúrgica:

```
⚠️ CONTRATO INCOMPLETO — Maquetación pausada

El diseño visual requiere datos que NO están en el Contrato de Datos actual.

Datos faltantes detectados:
- [nombre sugerido]: [descripción del dato] — Aparece en [ubicación en el diseño]
- [nombre sugerido]: [descripción del dato] — Aparece en [ubicación en el diseño]

@nextjs-dev: ¿Actualizas el contrato con estas props? Una vez confirmado,
continúo la maquetación.
```

### 3.2 Si hay props en el contrato que no aparecen en el diseño
No las ignores — intégralas de forma invisible si son de comportamiento (callbacks, flags) o pregunta al usuario si hay un slot visual no mostrado en el mockup.

---

## Fase 4 — Detección de Stack

Lee el proyecto activo para determinar el sistema de diseño:

1. Busca `package.json` en el workspace activo
2. Determina stack según prioridad:

| Indicador en package.json | Stack |
|---------------------------|-------|
| `tailwindcss` + `@radix-ui/*` o `class-variance-authority` | Tailwind + Shadcn/Radix |
| `tailwindcss` (sin Radix) | Tailwind puro |
| `@mui/material` | Material UI v7 |
| `react-native` | React Native + StyleSheet |

3. Busca componentes similares ya existentes en el proyecto (`search` en `src/components/`) para reutilizar patrones de import y naming.

---

## Fase 5 — Construcción del Componente

### 5.1 Estructura base

```tsx
// [ruta según convenciones del proyecto]
// Stack: [Tailwind / MUI / RN]

interface [NombreDelComponente]Props {
  // COPIAR EXACTAMENTE el Contrato de Datos recibido — sin modificaciones
}

export function [NombreDelComponente]({
  prop1,
  prop2,
  // ... todas las props del contrato
}: [NombreDelComponente]Props) {
  // Solo estado UI local permitido:
  // const [isHovered, setIsHovered] = useState(false)
  // const [activeTab, setActiveTab] = useState(0)
  // NUNCA: fetch, useContext, useSelector, imports de services/hooks de datos

  return (
    // JSX visual aquí
  )
}
```

### 5.2 Reglas de implementación

**Props: contrato exacto**
- Usa cada prop exactamente como se llama en el contrato (`title`, no `heading`)
- Respeta los tipos: si es `number`, no lo formatees como string sin conversión explícita
- Las props opcionales (`?`) deben tener fallback visual (texto placeholder, `hidden`, etc.)

**Callbacks: solo invocar, nunca decidir**
```tsx
// ✅ Correcto
<button onClick={onCtaClick}>{ctaLabel}</button>

// ❌ Incorrecto — estás añadiendo lógica
<button onClick={() => { validate(); onCtaClick(); }}>...</button>
```

**Estado local: solo UI**
```tsx
// ✅ Permitido
const [isMenuOpen, setIsMenuOpen] = useState(false)
const [focusedIndex, setFocusedIndex] = useState(-1)

// ❌ Prohibido
const [userData, setUserData] = useState(null) // → esto es lógica de datos
```

### 5.3 Estados visuales obligatorios

Para cada elemento interactivo, implementa los estados que apliquen:

| Estado | Tailwind | MUI sx |
|--------|----------|--------|
| hover | `hover:bg-blue-600` | `'&:hover': { bgcolor: 'primary.dark' }` |
| focus-visible | `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none` | `'&:focus-visible': { outline: '2px solid' }` |
| disabled | `disabled:opacity-50 disabled:cursor-not-allowed` | `'&:disabled': { opacity: 0.5 }` |
| active | `active:scale-95` | `'&:active': { transform: 'scale(0.95)' }` |
| loading | spinner o skeleton según contexto | mismo |

Solo añade los que tengan sentido en el contexto del elemento.

### 5.4 Accesibilidad WCAG 2.1 AA (checklist mínimo)

- [ ] `aria-label` en iconos sin texto visible
- [ ] `role` + `tabIndex` en elementos div/span clicables
- [ ] `alt` descriptivo en `<img>` (o `alt=""` si decorativa)
- [ ] `<label htmlFor>` asociado a cada `<input>`
- [ ] Contraste de color suficiente (verifica con tokens del proyecto)
- [ ] Navegación por teclado funcional en listas, tabs, menús

### 5.5 Mobile-First (Tailwind)

```tsx
// Siempre desde lo más pequeño hacia arriba:
className="flex-col gap-3 p-4 text-sm   // mobile (default)
           sm:flex-row sm:gap-4          // 640px+
           md:p-6 md:text-base           // 768px+
           lg:gap-6"                     // 1024px+
```

---

## Fase 6 — Entrega

Entrega el componente con este formato:

### Componente
El archivo completo, listo para copiar en el proyecto.

### Notas de diseño (máx. 3 bullets)
- Token/clase clave usada y por qué
- Decisión de layout no obvia
- Breakpoint principal y su comportamiento

### Checklist WCAG del componente
Lista los 3 puntos de accesibilidad aplicados más relevantes para este componente específico.

### Advertencias (si aplica)
Cualquier decisión tomada por falta de información, marcada con `⚠️` para revisión de @nextjs-dev.

---

## Árbol de Decisión Rápido

```
¿Tengo el Contrato de Datos?
├── NO → Bloquear. Solicitar a @nextjs-dev. FIN.
└── SÍ → ¿El diseño requiere datos sin prop en el contrato?
          ├── SÍ → Pausar. Reportar props faltantes a @nextjs-dev. FIN.
          └── NO → Detectar stack → Construir componente → Entregar con notas
```
