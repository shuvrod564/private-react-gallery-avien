import { createClient } from '@supabase/supabase-js';
import { serverEnv } from './env.js';

// Service-role client — server only. Bypasses RLS intentionally; every caller
// is authenticated as an admin *before* it reaches any data access.
export const supabaseAdmin =
  serverEnv.supabaseUrl && serverEnv.supabaseServiceRoleKey
    ? createClient(serverEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
