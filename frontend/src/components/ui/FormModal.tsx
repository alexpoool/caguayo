import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ModalOverlay } from './ModalShell';

export type FormModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  size?: FormModalSize;
  footer?: ReactNode;
  children: ReactNode;
  closeOnBackdrop?: boolean;
  ariaLabel?: string;
}

const SIZE_CLASSES: Record<FormModalSize, string> = {
  sm: 'w-full max-w-md h-auto max-h-[90vh] rounded-2xl',
  md: 'w-full max-w-2xl h-auto max-h-[90vh] rounded-2xl',
  lg: 'w-full max-w-4xl h-auto max-h-[90vh] rounded-2xl',
  xl: 'w-full max-w-6xl h-auto max-h-[90vh] rounded-2xl',
  full: 'w-full h-[100dvh] max-w-none rounded-none',
};

export function FormModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = 'full',
  footer,
  children,
  closeOnBackdrop = true,
  ariaLabel,
}: FormModalProps) {
  const isFull = size === 'full';
  const label = ariaLabel ?? (typeof title === 'string' ? title : undefined);

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdrop={closeOnBackdrop}
      ariaLabel={label}
      className={isFull ? 'items-stretch justify-stretch p-0' : undefined}
    >
      <div
        className={cn(
          'relative bg-white shadow-2xl animate-scale-in flex flex-col overflow-hidden',
          SIZE_CLASSES[size],
        )}
      >
        <div className="flex items-center gap-4 px-4 py-4 md:px-6 md:py-5 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50 flex-shrink-0">
          {icon && (
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-700 flex items-center justify-center shrink-0 text-white shadow-lg shadow-teal-500/20">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 truncate">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            title="Cerrar"
            className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-white/70 transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>

        {footer && (
          <div className="flex justify-end gap-3 px-4 py-4 md:px-6 border-t border-gray-200 bg-white/95 backdrop-blur-sm flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
