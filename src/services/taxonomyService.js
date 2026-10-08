import { supabase } from '../lib/supabase';
import { ensureConfigured } from './notConfigured';
import { slugify, uniqueSlug } from '../utils/slugify';
import { logActivity } from './activityService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Robust check for PostgreSQL unique-violation errors (PostgREST returns 409). */
function isUniqueViolation(err) {
  if (!err) return false;
  if (err?.code === '23505') return true;
  const text = `${err?.message ?? ''} ${err?.details ?? ''} ${err?.hint ?? ''}`;
  return /duplicate key|unique constraint|already exists/i.test(text);
}

/** RLS / permission error surfaced by PostgREST (409). */
function isRlsViolation(err) {
  return err?.code === '42501' || /row-level security|permission denied|not allowed/i.test(`${err?.message ?? ''}`);
}

function friendlyError(err, entityName) {
  if (isUniqueViolation(err)) {
    return new Error(`A ${entityName.toLowerCase()} with this name already exists. Choose a different name.`);
  }
  if (isRlsViolation(err)) {
    return new Error(
      `You don't have permission to modify this ${entityName.toLowerCase()}. Make sure you're signed in as an admin (role = 'admin' in the profiles table).`,
    );
  }
  return err;
}

/**
 * Factory for the four taxonomy services (categories, tags, authors, albums).
 * Keeps the CRUD logic in one place (spec §73 Rule 3 — no duplicated logic).
 *
 * @param {object} cfg
 * @param {string} cfg.table       Supabase table name
 * @param {string} cfg.rpcTable    Value passed to taxonomy_list()
 * @param {string} cfg.entityName  Human label for activity logs ("Category")
 * @param {string[]} cfg.fields    Editable columns besides name
 */
export function createTaxonomyService(cfg) {
  const { table, rpcTable, entityName, fields = [] } = cfg;

  /** All slugs, optionally excluding one row (for unique-rename check). */
  async function listAllSlugs(excludeId) {
    let query = supabase.from(table).select('slug');
    if (excludeId) query = query.neq('id', excludeId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((r) => r.slug).filter(Boolean);
  }

  async function fetchRow(id) {
    const { data, error } = await supabase
      .from(table)
      .select(['id', 'name', 'slug', ...fields].filter(Boolean).join(', '))
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  /** Index pages: each entry with published image count + cover (spec §4). */
  async function listWithCounts() {
    if (!supabase) ensureConfigured();
    try {
      const { data, error } = await supabase.rpc('taxonomy_list', { p_table: rpcTable });
      if (error) throw error;
      return data ?? [];
    } catch (err) {
      // If the taxonomy_list RPC doesn't exist, fall back to listing all
      // entries without counts. Better than breaking the page.
      if (err?.message?.includes('does not exist')) {
        const rows = await listAll();
        return rows.map((r) => ({ ...r, image_count: 0, cover_public_id: null }));
      }
      throw err;
    }
  }

  /** Plain list for form dropdowns (fast, no counts). */
  async function listAll() {
    if (!supabase) ensureConfigured();
    // Tags and authors don't have cover_image_id — only select columns that
    // exist on every taxonomy table, plus any extra ones listed in cfg.fields.
    const baseFields = ['id', 'name', 'slug'];
    const extraFields = fields.filter((f) => f !== 'name' && f !== 'slug' && f !== 'id');
    const selectCols = [...baseFields, ...extraFields].join(', ');
    const { data, error } = await supabase
      .from(table)
      .select(selectCols)
      .order('name');
    if (error) throw error;
    return data ?? [];
  }

  async function getBySlug(slug) {
    if (!supabase) ensureConfigured();
    const cols = ['id', 'name', 'slug', ...fields].filter(Boolean).join(', ');
    const { data, error } = await supabase.from(table).select(cols).eq('slug', slug).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function create(input) {
    if (!supabase) ensureConfigured();
    const name = String(input?.name ?? '').trim();
    if (!name) throw new Error(`${entityName} name is required.`);

    // Deterministic unique slug BEFORE insert (no reliance on error retries).
    const existingSlugs = await listAllSlugs();
    const slug = uniqueSlug(name, existingSlugs);

    const row = { name, slug };
    for (const f of fields) if (input[f] !== undefined) row[f] = input[f] ?? null;

    const { data, error } = await supabase.from(table).insert(row).select().single();
    if (error) {
      // Safety net if a race slipped through.
      if (isUniqueViolation(error)) {
        throw new Error(`A ${entityName.toLowerCase()} named "${name}" already exists. Choose a different name.`);
      }
      throw friendlyError(error, entityName);
    }

    await logActivity(`Created ${entityName}`, table, data.id, { name: data.name });
    return data;
  }

  async function update(id, input) {
    if (!supabase) ensureConfigured();

    const current = await fetchRow(id);
    if (!current) throw new Error(`${entityName} not found. It may have been deleted.`);

    const patch = {};

    // Only touch name/slug when the name actually changed.
    if (input.name !== undefined) {
      const nextName = String(input.name ?? '').trim();
      if (!nextName) throw new Error(`${entityName} name is required.`);

      const nextSlug = slugify(nextName);
      if (nextSlug !== current.slug) {
        // Renaming to a slug that another row already owns → friendly 409.
        const existingSlugs = await listAllSlugs(id);
        if (existingSlugs.includes(nextSlug)) {
          throw new Error(`A ${entityName.toLowerCase()} named "${nextName}" already exists. Choose a different name.`);
        }
        patch.name = nextName;
        patch.slug = nextSlug;
      }
      // If the name didn't change, skip slug entirely (avoids pointless
      // UPDATEs and any 409 from self-collisions).
    }

    for (const f of fields) if (input[f] !== undefined) patch[f] = input[f] ?? null;

    if (Object.keys(patch).length === 0) {
      // Nothing changed — no-op, return current row.
      return current;
    }

    const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single();
    if (error) {
      throw friendlyError(error, entityName);
    }

    await logActivity(`Updated ${entityName}`, table, id, { name: data.name });
    return data;
  }

  async function remove(id) {
    if (!supabase) ensureConfigured();
    const { data: existing } = await supabase.from(table).select('name').eq('id', id).maybeSingle();
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw friendlyError(error, entityName);
    await logActivity(`Deleted ${entityName}`, table, id, existing ? { name: existing.name } : null);
  }

  return { listWithCounts, listAll, getBySlug, create, update, remove };
}
