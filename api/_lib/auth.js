import { supabaseAdmin } from './supabase.js';
import { serverEnvErrors } from './env.js';

/**
 * Authenticate a request's Supabase access token and verify the caller is an
 * admin. The browser role value is never trusted — we resolve the real role
 * from the `profiles` table via the service-role client (spec §34, §64).
 *
 * @param {object} req - Incoming request
 * @returns {Promise<{ok: true, user: object, profile: object} | {ok: false, status: number, error: string}>}
 */
export async function requireAdmin(req) {
  if (!supabaseAdmin) {
    const vars = serverEnvErrors().filter((v) => v.includes('SUPABASE'));
    return {
      ok: false,
      status: 503,
      error: `Server not configured. Missing Supabase server-side variables: ${vars.join(', ') || 'SUPABASE_SERVICE_ROLE_KEY and/or VITE_SUPABASE_URL'}. Add them to your .env file (server-only section, never exposed in the browser).`,
    };
  }

  const header = req.headers?.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return { ok: false, status: 401, error: 'Authentication required.' };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, status: 401, error: 'Invalid or expired session.' };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role, display_name')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, status: 500, error: 'Failed to verify administrator.' };
  }

  if (!profile || profile.role !== 'admin') {
    return { ok: false, status: 403, error: 'Administrator access required.' };
  }

  return { ok: true, user: data.user, profile };
}

/** Shared JSON response helpers (works for both Vercel & Express). */
export function json(res, status, body) {
  res.status(status);
  res.setHeader?.('Content-Type', 'application/json');
  if (typeof res.json === 'function') return res.json(body);
  res.end(JSON.stringify(body));
}
