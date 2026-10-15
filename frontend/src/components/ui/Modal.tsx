import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, children, className = '' }: ModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`relative w-full max-w-lg bg-white rounded-2xl shadow-2xl animate-scale-in max-h-[90vh] flex flex-col ${className}`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-slate-50 z-10"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="overflow-y-auto flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
