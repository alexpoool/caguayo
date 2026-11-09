import { ReactNode } from 'react';
import { cn } from '@/shared/ui/utils/cn';

export interface PageHeaderProps {
  back?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ back, title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-5 md:mb-6', className)}>
      {back && <div className="mb-3">{back}</div>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
