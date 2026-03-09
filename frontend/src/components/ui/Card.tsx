import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  clickable?: boolean;
  animate?: boolean;
}

export function Card({ className, hover = true, clickable = false, animate = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200 shadow-sm text-gray-900 transition-all duration-300 ease-out',
        hover && 'hover:shadow-lg hover:-translate-y-1 hover:border-gray-300',
        clickable && 'cursor-pointer active:scale-[0.99]',
        animate && 'animate-fade-in-up',
        className
      )}
      style={animate ? { animationFillMode: 'both' } : undefined}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: CardProps) {
  return (
    <h3
      className={cn('font-semibold leading-none tracking-tight flex items-center gap-2', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: CardProps) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  );
}
