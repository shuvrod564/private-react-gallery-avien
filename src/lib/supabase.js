import { createClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from './env';

const fetchWithTimeout = async (input, init = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

export const supabase = isSupabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        fetch: fetchWithTimeout,
      },
    })
  : null;

export function getSession() {
  return (
    supabase?.auth.getSession() ??
    Promise.resolve({
      data: { session: null },
      error: null,
    })
  );
}

export function getSessionUser() {
  return getSession().then(({ data }) => data.session?.user ?? null);
}
