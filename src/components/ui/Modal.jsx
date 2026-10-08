import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Accessible modal: focus trap, Escape to close, aria-modal, backdrop click
 * to dismiss (spec §41).
 */
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    dialogRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const nodes = dialogRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!nodes?.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`relative z-10 w-full ${sizes[size]} max-h-[92vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl outline-none animate-scale-in sm:rounded-2xl dark:bg-stone-900`}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 dark:border-stone-700">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-stone-200 px-6 py-4 dark:border-stone-700">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
