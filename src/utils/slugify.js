// "My Beautiful Sunset!" → "my-beautiful-sunset"
export function slugify(input) {
  if (!input) return '';
  return String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric (keep spaces & dashes)
    .replace(/[\s_-]+/g, '-') // collapse whitespace/separators to a single dash
    .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes
}

/**
 * Produce a unique slug against a list of existing slugs.
 * "sunset" + ["sunset"] → "sunset-2"
 */
export function uniqueSlug(base, existing = []) {
  const baseSlug = slugify(base);
  if (!existing.includes(baseSlug)) return baseSlug;
  let i = 2;
  while (existing.includes(`${baseSlug}-${i}`)) i += 1;
  return `${baseSlug}-${i}`;
}
