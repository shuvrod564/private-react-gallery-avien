import { supabase } from '../lib/supabase';
import { ensureConfigured, NotConfiguredError } from './notConfigured';
import { slugify } from '../utils/slugify';
import { DEFAULT_PAGE_SIZE } from '../utils/constants';
import { deleteCloudinaryAsset } from './cloudinaryService';
import { logActivity } from './activityService';

/**
 * Database-side search + filters + sort + pagination. Prefers the list_images
 * RPC (spec §53) but falls back to direct table queries if the RPC hasn't
 * been created yet (migration not applied).
 */
export async function listImages({
  q = '',
  category = '',
  tag = '',
  author = '',
  album = '',
  featured = '',
  status = '',
  dateFrom = '',
  dateTo = '',
  sort = 'newest',
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  publishedOnly = true,
} = {}) {
  if (!supabase) ensureConfigured();

  // Try the RPC first — this is the preferred path (spec §53).
  try {
    const { data, error } = await supabase.rpc('list_images', {
      p_opts: {
        q,
        category,
        tag,
        author,
        album,
        featured,
        status,
        date_from: dateFrom,
        date_to: dateTo,
        sort,
        page,
        page_size: pageSize,
        published_only: publishedOnly,
      },
    });
    if (error) throw error;
    const items = Array.isArray(data) ? data : [];
    return { items, total: Number(items[0]?.total ?? 0) };
  } catch (err) {
    // If the RPC doesn't exist (migration not run), fall back to a direct
    // table query. This keeps the app functional even without the RPC.
    if (err?.message && err.message.includes('does not exist')) {
      return listImagesDirect({
        q, category, tag, author, album, featured, status,
        dateFrom, dateTo, sort, page, pageSize, publishedOnly,
      });
    }
    throw err;
  }
}

/**
 * Fallback direct-table query when the list_images RPC doesn't exist.
 * Supports the same filtering, sorting and pagination.
 */
async function listImagesDirect({
  q, category, tag, author, album, featured, status,
  dateFrom, dateTo, sort, page, pageSize, publishedOnly,
}) {
  const offset = (page - 1) * pageSize;

  // Resolve slugs to IDs for filtering
  let categoryId, authorId, albumId, tagId;
  if (category) {
    const { data: c } = await supabase.from('categories').select('id').eq('slug', category).maybeSingle();
    categoryId = c?.id;
  }
  if (author) {
    const { data: a } = await supabase.from('authors').select('id').eq('slug', author).maybeSingle();
    authorId = a?.id;
  }
  if (album) {
    const { data: a } = await supabase.from('albums').select('id').eq('slug', album).maybeSingle();
    albumId = a?.id;
  }
  if (tag) {
    const { data: t } = await supabase.from('tags').select('id').eq('slug', tag).maybeSingle();
    tagId = t?.id;
  }

  // Build the query with exact count
  let query = supabase
    .from('images')
    .select('id, title, slug, description, caption, alt_text, cloudinary_public_id, secure_url, width, height, format, file_size, category_id, author_id, album_id, sort_order, is_featured, is_published, allow_download, view_count, created_at, updated_at, published_at', { count: 'exact', head: false });

  // Published filter
  if (publishedOnly) query = query.eq('is_published', true);
  if (status === 'draft') query = query.eq('is_published', false);
  if (status === 'published') query = query.eq('is_published', true);

  // ID-based filters
  if (categoryId) query = query.eq('category_id', categoryId);
  if (authorId) query = query.eq('author_id', authorId);
  if (albumId) query = query.eq('album_id', albumId);
  if (featured) query = query.eq('is_featured', featured === 'true');
  if (dateFrom) query = query.gte('created_at', dateFrom);
  if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59Z');

  // Tag filter via subquery on image_tags
  if (tagId) {
    const { data: tagImageIds } = await supabase
      .from('image_tags')
      .select('image_id')
      .eq('tag_id', tagId);
    const ids = tagImageIds?.map((t) => t.image_id) || [];
    query = query.in('id', ids.length > 0 ? ids : [null]);
  }

  // Search via ILIKE
  if (q) {
    const term = `%${q}%`;
    query = query.or(`title.ilike.${term},description.ilike.${term},caption.ilike.${term},alt_text.ilike.${term}`);
  }

  // Sort
  const orders = {
    newest: { column: 'created_at', ascending: false },
    oldest: { column: 'created_at', ascending: true },
    most_viewed: { column: 'view_count', ascending: false },
    recently_updated: { column: 'updated_at', ascending: false },
    title_asc: { column: 'title', ascending: true },
    title_desc: { column: 'title', ascending: false },
  };
  const ord = orders[sort] || orders.newest;
  query = query.order(ord.column, { ascending: ord.ascending, nullsFirst: false });

  // Pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  // Attach tags and related entities as flat references
  const items = (data || []).map((img) => ({
    ...img,
    tags: [],
    category: img.category_id ? { id: img.category_id, name: null, slug: null } : null,
    author: img.author_id ? { id: img.author_id, name: null, slug: null, avatar_url: null } : null,
    album: img.album_id ? { id: img.album_id, name: null, slug: null } : null,
  }));

  return { items, total: count ?? items.length };
}

export async function getImageBySlug(slug) {
  if (!supabase) ensureConfigured();
  // Try the RPC first, fall back to direct query
  try {
    const { data, error } = await supabase.rpc('get_image_by_slug', { p_slug: slug });
    if (error) throw error;
    return Array.isArray(data) && data.length ? data[0] : null;
  } catch (err) {
    if (err?.message && err.message.includes('does not exist')) {
      const { data, error } = await supabase
        .from('images')
        .select('id, title, slug, description, caption, alt_text, cloudinary_public_id, secure_url, width, height, format, file_size, category_id, author_id, album_id, sort_order, is_featured, is_published, allow_download, view_count, created_at, updated_at, published_at')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      // Fetch tags
      const { data: tagRows } = await supabase
        .from('image_tags')
        .select('tag_id')
        .eq('image_id', data.id);
      let tags = [];
      if (tagRows?.length) {
        const { data: tagData } = await supabase
          .from('tags')
          .select('id, name, slug')
          .in('id', tagRows.map((r) => r.tag_id));
        tags = tagData || [];
      }

      // Fetch category name/slug
      let category = null;
      if (data.category_id) {
        const { data: c } = await supabase.from('categories').select('id, name, slug').eq('id', data.category_id).maybeSingle();
        category = c;
      }

      // Fetch author
      let author = null;
      if (data.author_id) {
        const { data: a } = await supabase.from('authors').select('id, name, slug, bio, avatar_url, website_url').eq('id', data.author_id).maybeSingle();
        author = a;
      }

      // Fetch album
      let album = null;
      if (data.album_id) {
        const { data: a } = await supabase.from('albums').select('id, name, slug, description').eq('id', data.album_id).maybeSingle();
        album = a;
      }

      return { ...data, tags, category, author, album };
    }
    throw err;
  }
}

/** Admin: fetch a single image by id with its tag ids (RLS permits admins). */
export async function getImageById(id) {
  if (!supabase) ensureConfigured();
  const { data, error } = await supabase
    .from('images')
    .select('id, title, slug, description, caption, alt_text, cloudinary_public_id, secure_url, width, height, format, file_size, category_id, author_id, album_id, sort_order, is_featured, is_published, allow_download, view_count, created_at, updated_at, published_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  // Fetch tag IDs
  const { data: tagRows } = await supabase
    .from('image_tags')
    .select('tag_id')
    .eq('image_id', id);
  const tagIds = (tagRows || []).map((t) => t.tag_id);

  return {
    ...data,
    tagIds,
    category: data.category_id ? { id: data.category_id } : null,
  };
}

/** Related images: same category first, otherwise sharing a tag (spec §4). */
export async function getRelatedImages(image, { limit = 8 } = {}) {
  if (!image) return [];
  const { items: byCategory } = await listImages({
    category: image.category?.slug || '',
    sort: 'newest',
    pageSize: limit + 1,
  });
  const withoutSelf = byCategory.filter((i) => i.id !== image.id);
  if (withoutSelf.length >= limit) return withoutSelf.slice(0, limit);

  const tagSlug = image.tags?.[0]?.slug || '';
  if (tagSlug) {
    const { items: byTag } = await listImages({ tag: tagSlug, sort: 'newest', pageSize: limit + 1 });
    const rest = byTag.filter((i) => i.id !== image.id && !withoutSelf.some((x) => x.id === i.id));
    return [...withoutSelf, ...rest].slice(0, limit);
  }
  return withoutSelf.slice(0, limit);
}

/** Prev/next navigation within the same filtered set. */
export async function getAdjacentImages(image, filters = {}) {
  if (!image) return { prev: null, next: null };
  const { items } = await listImages({
    ...filters,
    q: filters.q || '',
    sort: filters.sort || 'newest',
    pageSize: 100,
  });
  const idx = items.findIndex((i) => i.id === image.id);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? items[idx - 1] : null,
    next: idx < items.length - 1 ? items[idx + 1] : null,
  };
}

export async function getFeaturedImages(limit = 6) {
  const { items } = await listImages({ featured: 'true', sort: 'newest', pageSize: limit });
  return items;
}

export async function getLatestImages(limit = 12) {
  const { items } = await listImages({ sort: 'newest', pageSize: limit });
  return items;
}

export async function getMostViewedImages(limit = 6) {
  const { items } = await listImages({ sort: 'most_viewed', pageSize: limit });
  return items;
}

/** One view per session per image (spec §23). */
export async function recordImageView(imageId) {
  if (!supabase) return;
  let sessionKey = localStorage.getItem('gallery_session_id');
  if (!sessionKey) {
    sessionKey = crypto.randomUUID();
    localStorage.setItem('gallery_session_id', sessionKey);
  }
  try {
    await supabase.rpc('record_image_view', {
      p_image_id: imageId,
      p_session_key: sessionKey,
    });
  } catch {
    // Silently ignore — view counting is non-critical.
  }
}

// ---------------------------------------------------------------------------
// Admin CRUD (authorization enforced by RLS — admin-only policies)
// ---------------------------------------------------------------------------

/** Robust check for PostgreSQL unique-violation errors (PostgREST returns 409). */
function isUniqueViolation(err) {
  if (!err) return false;
  if (err?.code === '23505') return true;
  const text = `${err?.message ?? ''} ${err?.details ?? ''} ${err?.hint ?? ''}`;
  return /duplicate key|unique constraint|already exists/i.test(text);
}

/** Find a slug that isn't taken by another image row. */
async function nextAvailableSlug(baseSlug, excludeId) {
  let slug = baseSlug || 'untitled';
  let i = 2;
  for (;;) {
    let query = supabase.from('images').select('id').eq('slug', slug);
    if (excludeId) query = query.neq('id', excludeId);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return slug;
    slug = `${baseSlug || 'untitled'}-${i}`;
    i += 1;
    if (i > 30) return `${slug}-${Date.now().toString(36)}`;
  }
}

export async function createImage({ tags = [], ...payload }) {
  if (!supabase) ensureConfigured();

  // Resolve a unique slug BEFORE the insert — duplicate titles just get a
  // "-2", "-3", … suffix instead of failing (spec §67).
  const baseSlug = slugify(payload.title) || 'untitled';
  const slug = await nextAvailableSlug(baseSlug);

  const base = {
    title: payload.title,
    slug,
    description: payload.description || null,
    caption: payload.caption || null,
    alt_text: payload.alt_text || null,
    cloudinary_public_id: payload.cloudinary_public_id,
    cloudinary_url: payload.cloudinary_url || null,
    secure_url: payload.secure_url,
    thumbnail_url: payload.thumbnail_url || null,
    width: payload.width || null,
    height: payload.height || null,
    format: payload.format || null,
    file_size: payload.file_size || null,
    category_id: payload.category_id || null,
    author_id: payload.author_id || null,
    album_id: payload.album_id || null,
    sort_order: payload.sort_order ?? 0,
    is_featured: Boolean(payload.is_featured),
    is_published: Boolean(payload.is_published),
    allow_download: Boolean(payload.allow_download),
    published_at: payload.is_published ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase.from('images').insert(base).select('id').single();
  if (error) {
    if (isUniqueViolation(error)) {
      // Race condition fallback: re-resolve and retry once.
      const slug2 = await nextAvailableSlug(baseSlug);
      const retry = await supabase
        .from('images')
        .insert({ ...base, slug: slug2 })
        .select('id')
        .single();
      if (retry.error) throw retry.error;
      await replaceImageTags(retry.data.id, tags);
      await logActivity('Uploaded image', 'image', retry.data.id, { title: payload.title });
      return retry.data;
    }
    throw error;
  }

  await replaceImageTags(data.id, tags);
  await logActivity('Uploaded image', 'image', data.id, { title: payload.title });
  return data;
}

export async function updateImage(id, { tags, ...payload }) {
  if (!supabase) ensureConfigured();
  const patch = {};
  const map = {
    title: 'title',
    description: 'description',
    caption: 'caption',
    alt_text: 'alt_text',
    cloudinary_public_id: 'cloudinary_public_id',
    cloudinary_url: 'cloudinary_url',
    secure_url: 'secure_url',
    thumbnail_url: 'thumbnail_url',
    width: 'width',
    height: 'height',
    format: 'format',
    file_size: 'file_size',
    category_id: 'category_id',
    author_id: 'author_id',
    album_id: 'album_id',
    sort_order: 'sort_order',
    is_featured: 'is_featured',
    is_published: 'is_published',
    allow_download: 'allow_download',
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in payload) patch[col] = payload[key];
  }
  if ('title' in patch) {
    // Never collide: re-renaming to an existing title gets a "-2" suffix.
    patch.slug = await nextAvailableSlug(slugify(patch.title) || 'untitled', id);
  }

  const { data, error } = await supabase.from('images').update(patch).eq('id', id).select().single();
  if (error) {
    if (isUniqueViolation(error) && patch.slug) {
      throw new Error(
        'Another image already uses that title/slug. Change the title slightly (the system auto-appends -2, -3… to keep slugs unique).',
      );
    }
    throw error;
  }

  if (tags) await replaceImageTags(id, tags);

  // Keep published_at meaningful: set when first published, keep when re-published.
  if (patch.is_published !== undefined && data.published_at === null && patch.is_published) {
    await supabase.from('images').update({ published_at: new Date().toISOString() }).eq('id', id);
  }

  await logActivity('Updated image', 'image', id, { title: data.title });
  return data;
}

export async function setImageFeatured(id, isFeatured) {
  if (!supabase) ensureConfigured();
  const { error } = await supabase.from('images').update({ is_featured: isFeatured }).eq('id', id);
  if (error) throw error;
}

export async function setImagePublished(id, isPublished) {
  if (!supabase) ensureConfigured();
  const { error } = await supabase
    .from('images')
    .update({ is_published: isPublished, published_at: isPublished ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}

/** Bulk ops (spec §25). */
export async function bulkUpdateImages(ids, patch) {
  if (!supabase || !ids.length) return;
  const clean = {};
  if ('is_published' in patch) {
    clean.is_published = patch.is_published;
    clean.published_at = patch.is_published ? new Date().toISOString() : null;
  }
  if ('is_featured' in patch) clean.is_featured = patch.is_featured;
  if ('category_id' in patch) clean.category_id = patch.category_id || null;
  if ('album_id' in patch) clean.album_id = patch.album_id || null;
  const { error } = await supabase.from('images').update(clean).in('id', ids);
  if (error) throw error;
}

export async function bulkAddTags(ids, tagIds) {
  if (!supabase) return;
  const rows = [];
  for (const imageId of ids) {
    for (const tagId of tagIds) rows.push({ image_id: imageId, tag_id: tagId });
  }
  const { error } = await supabase.from('image_tags').upsert(rows, { onConflict: 'image_id,tag_id' });
  if (error) throw error;
}

export async function bulkRemoveTags(ids, tagIds) {
  if (!supabase) return;
  const { error } = await supabase
    .from('image_tags')
    .delete()
    .in('image_id', ids)
    .in('tag_id', tagIds);
  if (error) throw error;
}

async function replaceImageTags(imageId, tagIds = []) {
  if (!supabase) return;
  const { error: del } = await supabase.from('image_tags').delete().eq('image_id', imageId);
  if (del) throw del;
  if (tagIds.length) {
    const rows = tagIds.map((tagId) => ({ image_id: imageId, tag_id: tagId }));
    const { error: ins } = await supabase.from('image_tags').insert(rows);
    if (ins) throw ins;
  }
}

/**
 * Delete an image: DB row first (image_tags cascade), then the Cloudinary
 * asset. If the CDN delete fails we report it so the UI can offer a retry —
 * we never pretend the deletion succeeded (spec §28).
 */
export async function deleteImage(id) {
  if (!supabase) ensureConfigured();

  const { data: existing } = await supabase
    .from('images')
    .select('id, title, cloudinary_public_id')
    .eq('id', id)
    .maybeSingle();
  const publicId = existing?.cloudinary_public_id;

  const { error: del } = await supabase.from('images').delete().eq('id', id);
  if (del) throw del;

  await logActivity('Deleted image', 'image', id, existing ? { title: existing.title } : null);

  if (!publicId) return { ok: true, cloudinary: null };
  try {
    const result = await deleteCloudinaryAsset(publicId);
    return { ok: true, cloudinary: result };
  } catch (err) {
    return {
      ok: false,
      cloudinary: null,
      cloudinaryError: err.message || 'Failed to delete from CDN.',
    };
  }
}

export async function getDashboardStats() {
  if (!supabase) ensureConfigured();
  const { data, error } = await supabase.rpc('dashboard_stats');
  if (error) throw error;
  return Array.isArray(data) && data.length ? data[0] : null;
}

export async function getRecentActivity(limit = 10) {
  if (!supabase) ensureConfigured();
  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, action, entity_type, entity_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export { NotConfiguredError };
