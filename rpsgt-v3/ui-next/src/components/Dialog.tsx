import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  initialFocus?: 'container' | 'first';
  testId?: string;
}

const focusableSelector =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Shared accessible modal: focus enters, Tab stays inside, Escape closes,
 * background does not scroll, and focus returns to its launching control.
 */
export function Dialog({
  isOpen, onClose, title, description, children,
  initialFocus = 'container', testId,
}: DialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => {
      const panel = containerRef.current;
      if (initialFocus === 'first') {
        const first = panel?.querySelector<HTMLElement>(focusableSelector);
        (first ?? panel)?.focus();
      } else panel?.focus();
    });
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = containerRef.current;
      if (!panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector))
        .filter(node => node.getClientRects().length > 0);
      if (!nodes.length) { event.preventDefault(); panel.focus(); return; }
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [isOpen, initialFocus]);

  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6"
      data-testid={testId ? testId + '-backdrop' : undefined}
      onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={containerRef} role="dialog" aria-modal="true"
        aria-label={title} aria-description={description} tabIndex={-1}
        data-testid={testId}
        className="max-h-[min(92dvh,840px)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl outline-none sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
          </div>
          <button type="button" aria-label="Close dialog" onClick={onClose}
            className="rounded-lg p-2 text-slate-300 outline-offset-2 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-cyan-400">
            <X aria-hidden="true" size={19}/>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
