import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const SCROLL_LOCK_SELECTOR = ".overflow-y-auto, .overflow-auto";

const modalStack: symbol[] = [];
let lockCount = 0;
let savedStyles: Array<{ el: HTMLElement; overflowY: string; paddingRight: string }> = [];
let rootWasInert = false;

function scrollLockTargets(): HTMLElement[] {
  const root = document.getElementById("root");
  const appTargets = root ? Array.from(root.querySelectorAll<HTMLElement>(SCROLL_LOCK_SELECTOR)) : [];
  const targets = [document.body, ...appTargets];
  return targets.filter((el, index) => targets.indexOf(el) === index);
}

function acquireLock() {
  lockCount += 1;
  if (lockCount > 1) return;

  savedStyles = scrollLockTargets().map((el) => {
    const overflowY = el.style.overflowY;
    const paddingRight = el.style.paddingRight;
    const scrollbarWidth = el.offsetWidth - el.clientWidth;
    const currentPadding = parseFloat(window.getComputedStyle(el).paddingRight) || 0;
    el.style.overflowY = "hidden";
    if (scrollbarWidth > 0) el.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    return { el, overflowY, paddingRight };
  });

  const root = document.getElementById("root");
  if (root) {
    rootWasInert = root.hasAttribute("inert");
    root.setAttribute("inert", "");
  }
}

function releaseLock() {
  lockCount -= 1;
  if (lockCount > 0) return;
  lockCount = 0;

  for (const { el, overflowY, paddingRight } of savedStyles) {
    el.style.overflowY = overflowY;
    el.style.paddingRight = paddingRight;
  }
  savedStyles = [];

  const root = document.getElementById("root");
  if (root && !rootWasInert) root.removeAttribute("inert");
}

function restoreFocus(element: HTMLElement | null) {
  if (!element || !document.contains(element) || element.closest("[inert]")) return;
  const active = document.activeElement;
  if (active && active !== document.body && document.contains(active)) return;
  element.focus({ preventScroll: true });
}

export interface UseModalLockOptions {
  isOpen: boolean;
  onClose: () => void;
  focusRef?: RefObject<HTMLElement | null>;
}

export function useModalLock({ isOpen, onClose, focusRef }: UseModalLockOptions) {
  const idRef = useRef<symbol>(Symbol("modal"));
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const id = idRef.current;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    modalStack.push(id);
    acquireLock();

    const focusTarget = focusRef?.current;
    if (focusTarget && !focusTarget.contains(document.activeElement)) {
      focusTarget.focus({ preventScroll: true });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (modalStack[modalStack.length - 1] !== id) return;
      event.stopPropagation();
      onCloseRef.current();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      const index = modalStack.lastIndexOf(id);
      if (index !== -1) modalStack.splice(index, 1);
      releaseLock();
      restoreFocus(previouslyFocusedRef.current);
    };
  }, [isOpen, focusRef]);
}
