import React from 'react';
import { cn } from '@/shared/ui/utils/cn';

type IconButtonVariant = 'ghost' | 'outline' | 'danger';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Nombre accesible. Se usa como aria-label y como title por defecto. */
  label: string;
  icon: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

const VARIANTS: Record<IconButtonVariant, string> = {
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400',
  danger: 'text-red-600 hover:bg-red-50 hover:text-red-700',
};

const SIZES: Record<IconButtonSize, string> = {
  // En móvil todo botón de icono mantiene 44 px de área táctil.
  sm: 'h-11 w-11 sm:h-8 sm:w-8',
  md: 'h-11 w-11 sm:h-9 sm:w-9',
  lg: 'h-12 w-12',
};

/**
 * Botón de solo icono con nombre accesible y área táctil mínima de 44 px en móvil.
 * Para acciones de fila y cabecera. No usar `<Button size="icon">` con `h-8 w-8`
 * porque anula el mínimo táctil.
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, icon, variant = 'ghost', size = 'md', className, title, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={title ?? label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  ),
);

IconButton.displayName = 'IconButton';
