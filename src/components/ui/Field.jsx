import { forwardRef } from 'react';

const controlClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:ring-brand-900';

export function Field({ label, htmlFor, hint, error, required, children }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-stone-700 dark:text-stone-200">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-stone-500 dark:text-stone-400">{hint}</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export const Input = forwardRef(function Input({ invalid = false, className = '', ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`${controlClass} ${invalid ? 'border-red-400 focus:border-red-400 focus:ring-red-200 dark:border-red-500' : ''} ${className}`}
      {...props}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ invalid = false, className = '', ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={`${controlClass} ${invalid ? 'border-red-400 focus:border-red-400 focus:ring-red-200 dark:border-red-500' : ''} ${className}`}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select(
  { invalid = false, className = '', placeholder, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={`${controlClass} ${invalid ? 'border-red-400 focus:border-red-400 focus:ring-red-200 dark:border-red-500' : ''} ${className}`}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {children}
    </select>
  );
});