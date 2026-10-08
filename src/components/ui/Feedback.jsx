import { AlertTriangle, ImageOff, PlugZap, RefreshCw, SearchX } from 'lucide-react';
import { Button } from './Button';

export function Spinner({ className = 'h-6 w-6' }) {
  return (
    <div role="status" aria-label="Loading" className="flex items-center justify-center py-10">
      <span className={`inline-block animate-spin rounded-full border-2 border-stone-300 border-t-brand-500 ${className}`} />
    </div>
  );
}

export function EmptyState({ title, description, icon: Icon = SearchX, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-stone-300 px-6 py-16 text-center dark:border-stone-700">
      <div className="rounded-full bg-stone-100 p-4 dark:bg-stone-800">
        <Icon className="h-8 w-8 text-stone-400 dark:text-stone-500" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-100">{title}</h3>
      {description && <p className="max-w-sm text-sm text-stone-500 dark:text-stone-400">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong. Please try again.', onRetry, icon: Icon = AlertTriangle }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50/50 px-6 py-16 text-center dark:border-red-900 dark:bg-red-950/30">
      <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/40">
        <Icon className="h-8 w-8 text-red-500" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Something went wrong</h3>
      <p className="max-w-sm text-sm text-red-600 dark:text-red-300">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> Try again
        </Button>
      )}
    </div>
  );
}

export function ImageBroken({ className = 'h-8 w-8' }) {
  return <ImageOff className={`${className} text-stone-300 dark:text-stone-600`} aria-hidden />;
}

/**
 * Shown when the app runs without real Supabase/Cloudinary keys.
 * This is an honest "not configured" state — there is no mock data.
 */
export function ConfigMissing({ message }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-amber-300 bg-amber-50 px-6 py-12 text-center dark:border-amber-800 dark:bg-amber-950/40">
        <div className="rounded-full bg-amber-100 p-4 dark:bg-amber-900/40">
          <PlugZap className="h-8 w-8 text-amber-600 dark:text-amber-300" aria-hidden />
        </div>
        <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">Backend not configured yet</h3>
        <p className="max-w-md text-sm text-amber-800 dark:text-amber-200">{message}</p>
        <p className="max-w-md text-xs text-amber-700 dark:text-amber-300">
          This application uses real Supabase and Cloudinary integrations only — no sample data is shipped. See{' '}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">README.md</code> and the{' '}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">.env.example</code> for the setup guide.
        </p>
      </div>
    </div>
  );
}
