import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  animate?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, leftIcon, rightIcon, animate = true, ...props }, ref) => {
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25 focus:ring-blue-500 active:scale-[0.98]',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 hover:shadow-md focus:ring-gray-500 active:scale-[0.98]',
      outline: 'border-2 border-gray-300 bg-transparent hover:bg-gray-50 hover:border-gray-400 text-gray-700 hover:shadow-md active:scale-[0.98]',
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 hover:shadow-sm active:scale-[0.98]',
      danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/25 focus:ring-red-500 active:scale-[0.98]',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-10 px-4 py-2 gap-2',
      lg: 'h-12 px-8 text-lg gap-2',
      icon: 'h-9 w-9 p-2 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:transform-none',
          animate && 'hover:-translate-y-0.5',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <Loader2 className={cn('h-4 w-4 animate-spin', children && 'mr-2')} />
        ) : (
          leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
        )}
        {children}
        {rightIcon && !isLoading && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
