/**
 * Valores de color que no se pueden expresar como clase Tailwind:
 * recharts, canvas, PDFs en pantalla y estilos inline.
 *
 * Los componentes usan clases (`text-brand-600`, `bg-success-500`) o estos
 * tokens. No agregues hex sueltos en componentes.
 */
export const PALETA = {
  brand: {
    50: '#eef3ff',
    100: '#dce8ff',
    200: '#bdd4ff',
    300: '#8db4fb',
    400: '#5b8df7',
    500: '#2f6cf5',
    600: '#1f52d6',
    700: '#183fa8',
    800: '#143384',
    900: '#102a69',
  },
  success: {
    500: '#10b981',
    600: '#059669',
    700: '#047857',
  },
  warning: {
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },
  danger: {
    300: '#fca5a5',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },
  neutral: {
    grid: '#e5e7eb',
    axis: '#6b7280',
    tooltipBorder: '#e5e7eb',
  },
  charts: ['#2f6cf5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
} as const;

export const CHART_COLORS = PALETA.charts;

export const CHART_NEUTRALS = PALETA.neutral;
