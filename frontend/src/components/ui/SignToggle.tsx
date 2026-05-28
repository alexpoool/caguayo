import React from 'react';
import { cn } from '../../lib/utils';

interface SignToggleProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export const SignToggle: React.FC<SignToggleProps> = ({ value, onChange, className }) => {
  const isPositive = value >= 0;

  return (
    <button
      type="button"
      onClick={() => onChange(isPositive ? -Math.abs(value || 0) : Math.abs(value || 0))}
      className={cn(
        'w-7 h-7 flex items-center justify-center rounded-md text-sm font-bold transition-all border',
        isPositive
          ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
          : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100',
        className
      )}
      title={isPositive ? 'Aumento' : 'Descuento'}
    >
      {isPositive ? '+' : '−'}
    </button>
  );
};
