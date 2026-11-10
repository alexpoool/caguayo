import React from 'react';
import { cn } from '@/shared/ui/utils/cn';

export interface MobileRecordField {
  label: string;
  value: React.ReactNode;
}

export interface MobileRecordCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badges?: React.ReactNode;
  fields?: MobileRecordField[];
  actions?: React.ReactNode;
  onOpen?: () => void;
  openLabel?: string;
  tone?: 'default' | 'warning';
  className?: string;
}

/**
 * Tarjeta de registro para listados en móvil.
 * Sustituye a la tabla ancha por debajo de `md`; la tabla sigue visible desde `md`.
 * Si recibe `onOpen`, el título actúa como botón para abrir el detalle.
 */
export function MobileRecordCard({
  title,
  subtitle,
  icon,
  badges,
  fields = [],
  actions,
  onOpen,
  openLabel = 'Ver detalle',
  tone = 'default',
  className,
}: MobileRecordCardProps) {
  return (
    <article
      className={cn(
        'rounded-xl border bg-white p-4 shadow-sm',
        tone === 'warning' ? 'border-amber-300 bg-amber-50/60' : 'border-gray-200',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {onOpen ? (
            <button
              type="button"
              onClick={onOpen}
              aria-label={openLabel}
              className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              <span className="block truncate font-semibold text-gray-900">{title}</span>
              {subtitle && <span className="mt-0.5 block truncate text-xs text-gray-500">{subtitle}</span>}
            </button>
          ) : (
            <>
              <p className="truncate font-semibold text-gray-900">{title}</p>
              {subtitle && <p className="mt-0.5 truncate text-xs text-gray-500">{subtitle}</p>}
            </>
          )}
          {badges && <div className="mt-2 flex flex-wrap items-center gap-1.5">{badges}</div>}
        </div>
      </div>

      {fields.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-gray-100 pt-3">
          {fields.map((field) => (
            <div key={field.label} className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {field.label}
              </dt>
              <dd className="mt-0.5 truncate text-sm text-gray-800">{field.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {actions && <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div>}
    </article>
  );
}
