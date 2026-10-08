import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-600 focus-visible:ring-brand-400 shadow-sm disabled:hover:bg-brand-500',
  secondary:
    'bg-stone-900 text-white hover:bg-stone-700 focus-visible:ring-stone-400 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white',
  outline:
    'border border-stone-300 bg-transparent text-stone-700 hover:bg-stone-100 focus-visible:ring-stone-400 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800',
  ghost:
    'bg-transparent text-stone-600 hover:bg-stone-100 focus-visible:ring-stone-400 dark:text-stone-300 dark:hover:bg-stone-800',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-400 shadow-sm disabled:hover:bg-red-600',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-9 w-9 p-0',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, className = '', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-stone-950 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
