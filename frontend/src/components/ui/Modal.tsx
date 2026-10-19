import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { ModalOverlay } from './ModalShell';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function Modal({ isOpen, onClose, children, className = '', ariaLabel }: ModalProps) {
  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose} ariaLabel={ariaLabel}>
      <div
        className={`relative w-full max-w-lg bg-white rounded-2xl shadow-2xl animate-scale-in max-h-[90vh] flex flex-col ${className}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          title="Cerrar"
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-slate-50 z-10"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="overflow-y-auto flex-1 min-h-0">{children}</div>
      </div>
    </ModalOverlay>
  );
}
