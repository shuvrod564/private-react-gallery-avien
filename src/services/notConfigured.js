// When the app runs without real Supabase credentials we must fail honestly
// (no mock data). This error is caught by UI states and rendered as a clear
// "configuration missing" message instead of a crash.
export const NOT_CONFIGURED_MSG =
  'This app is not connected to a backend yet. Add your Supabase keys to .env (see README.md).';

export class NotConfiguredError extends Error {
  constructor() {
    super(NOT_CONFIGURED_MSG);
    this.name = 'NotConfiguredError';
    this.isNotConfigured = true;
  }
}

export function ensureConfigured() {
  throw new NotConfiguredError();
}
