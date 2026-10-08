import { isFullyConfigured } from '../../lib/env';

/**
 * Shown only when real backend credentials are missing. This is the honest
 * "not configured" state — the app ships no mock data.
 */
export function ConfigBanner() {
  if (isFullyConfigured) return null;
  return (
    <div className="bg-amber-500 px-4 py-2 text-center text-xs font-medium text-amber-950">
      ⚠ Backend not configured — add your Supabase & Cloudinary keys to{' '}
      <code className="rounded bg-amber-400/60 px-1">.env</code> (see README.md). No sample data is included.
    </div>
  );
}
