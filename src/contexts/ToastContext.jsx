import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, message, opts = {}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-4), { id, type, message }]);
      if (opts.duration !== 0) {
        setTimeout(() => dismiss(id), opts.duration ?? 4000);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toast: {
        success: (m, o) => push('success', m, o),
        error: (m, o) => push('error', m, o),
        info: (m, o) => push('info', m, o),
      },
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-stone-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur animate-scale-in dark:border-stone-700 dark:bg-stone-900/95"
            >
              <Icon
                className={`mt-0.5 h-5 w-5 shrink-0 ${
                  t.type === 'success'
                    ? 'text-emerald-500'
                    : t.type === 'error'
                      ? 'text-red-500'
                      : 'text-brand-500'
                }`}
              />
              <p className="flex-1 text-sm text-stone-700 dark:text-stone-200">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}
