import React from 'react';
import { cn } from '../../lib/utils';

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  animation?: 'fade-in' | 'fade-in-up' | 'slide-in-right' | 'slide-in-left' | 'scale-in';
  delay?: number;
  hover?: boolean;
  clickable?: boolean;
}

export function AnimatedCard({
  children,
  className,
  animation = 'fade-in-up',
  delay = 0,
  hover = true,
  clickable = false,
  ...props
}: AnimatedCardProps) {
  const animations = {
    'fade-in': 'animate-fade-in',
    'fade-in-up': 'animate-fade-in-up',
    'slide-in-right': 'animate-slide-in-right',
    'slide-in-left': 'animate-slide-in-left',
    'scale-in': 'animate-scale-in',
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200 shadow-sm',
        animations[animation],
        hover && 'hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out',
        clickable && 'cursor-pointer',
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: 'both',
      }}
      {...props}
    >
      {children}
    </div>
  );
}

interface StaggerContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  staggerDelay?: number;
  initialDelay?: number;
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 50,
  initialDelay = 0,
  ...props
}: StaggerContainerProps) {
  return (
    <div className={cn('contents', className)} {...props}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            style: {
              animationDelay: `${initialDelay + index * staggerDelay}ms`,
              ...child.props.style,
            },
          });
        }
        return child;
      })}
    </div>
  );
}

export function AnimatedPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('animate-fade-in-up', className)}
      style={{ animationFillMode: 'both' }}
    >
      {children}
    </div>
  );
}

export function AnimatedSection({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn('animate-fade-in-up', className)}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: 'both',
      }}
    >
      {children}
    </div>
  );
}
