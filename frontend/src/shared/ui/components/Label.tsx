import React from 'react';
import { cn } from '@/shared/ui/utils/cn';

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 mb-1.5 block',
          className
        )}
        {...props}
      />
    );
  }
);

Label.displayName = 'Label';
