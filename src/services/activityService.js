import { supabase } from '../lib/supabase';

/**
 * Record an admin activity (spec §63). The database function is
 * security-definer and silently no-ops for non-admins, so a leaked call
 * cannot write rows the caller shouldn't be able to.
 */
export async function logActivity(action, entityType = null, entityId = null, metadata = null) {
  if (!supabase) return;
  try {
    await supabase.rpc('log_activity', {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_metadata: metadata,
    });
  } catch {
    // Activity logging must never break the primary operation.
  }
}
