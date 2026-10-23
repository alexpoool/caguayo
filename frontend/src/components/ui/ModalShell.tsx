import { useRef } from "react";
import type { ReactNode, WheelEvent } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";
import { useModalLock } from "../../hooks/useModalLock";

export interface ModalOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  closeOnBackdrop?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function ModalOverlay({
  isOpen,
  onClose,
  children,
  closeOnBackdrop = true,
  className,
  ariaLabel,
}: ModalOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  useModalLock({ isOpen, onClose, focusRef: overlayRef });

  if (!isOpen) return null;

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const scroller = overlayRef.current?.querySelector<HTMLElement>(".overflow-y-auto, .overflow-auto");
    if (!scroller) return;
    if (scroller.contains(event.target as Node)) return;
    scroller.scrollTop += event.deltaY;
  };

  return createPortal(
    <div
      ref={overlayRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
      onWheel={handleWheel}
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in focus:outline-none",
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}
