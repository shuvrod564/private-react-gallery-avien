import { supabase } from '../lib/supabase';
import { ensureConfigured } from './notConfigured';
import { logActivity } from './activityService';

export async function getSettings() {
  if (!supabase) ensureConfigured();
  const { data, error } = await supabase.from('settings').select('*').limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateSettings(patch) {
  if (!supabase) ensureConfigured();
  const { data, error } = await supabase.from('settings').update(patch).eq('id', patch.id).select().single();
  if (error) throw error;
  await logActivity('Updated settings', 'settings', null, { fields: Object.keys(patch) });
  return data;
}
