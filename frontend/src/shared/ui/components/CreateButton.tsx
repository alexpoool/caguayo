import { Plus } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/shared/ui/utils/cn';

export interface CreateButtonProps {
  label: string;
  onClick?: () => void;
  variant?: 'solid' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

/**
 * Único botón de creación de la interfaz.
 * `solid` para la acción principal de una pantalla; `inline` para crear al vuelo.
 */
export function CreateButton({
  label,
  onClick,
  variant = 'solid',
  size = 'md',
  disabled,
  isLoading,
  className,
  type = 'button',
}: CreateButtonProps) {
  return (
    <Button
      type={type}
      onClick={onClick}
      size={variant === 'inline' ? 'sm' : size}
      disabled={disabled}
      isLoading={isLoading}
      leftIcon={<Plus className="h-4 w-4" />}
      className={cn(
        'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-sm',
        'hover:from-brand-600 hover:to-brand-700 hover:shadow-brand-600/25',
        'focus:ring-brand-500',
        variant === 'inline' && 'h-9 px-3 text-sm',
        className,
      )}
    >
      {label}
    </Button>
  );
}
