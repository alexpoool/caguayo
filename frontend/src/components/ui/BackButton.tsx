import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';
import { cn } from '../../lib/utils';

export interface BackButtonProps {
  /** Destino explícito. Nunca se usa el historial del navegador. */
  to: string;
  label?: string;
  className?: string;
}

export function BackButton({ to, label = 'Volver', className }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => navigate(to)}
      leftIcon={<ArrowLeft className="h-4 w-4" />}
      aria-label={label}
      className={cn('gap-2', className)}
    >
      {label}
    </Button>
  );
}
