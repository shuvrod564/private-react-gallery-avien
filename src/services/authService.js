import { supabase } from '../lib/supabase';
import { NotConfiguredError } from './notConfigured';

/**
 * Sign in with email + password (Supabase Auth — no custom hashing, spec §5).
 * @returns {{ profile: object|null, error: string|null }}
 */
export async function signIn(email, password) {
  if (!supabase) return { profile: null, error: 'Not configured' };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { profile: null, error: error?.message || 'Invalid credentials.' };
  }
  const profile = await fetchProfile(data.user.id);
  return { profile, error: null };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/** Send a password reset email. */
export async function requestPasswordReset(email) {
  if (!supabase) return { error: 'Not configured' };
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  return { error: error?.message || null };
}

/** Complete a password reset (called from the recovery redirect page). */
export async function updatePassword(newPassword) {
  if (!supabase) return { error: 'Not configured' };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error: error?.message || null };
}

/** Current signed-in profile (admin check happens against this). */
export async function fetchProfile(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, role, avatar_url')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function getCurrentProfile() {
  if (!supabase) {
    throw new NotConfiguredError();
  }
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user ?? null;
  if (!user) return { user: null, profile: null };
  const profile = await fetchProfile(user.id);
  return { user, profile };
}
