import { env } from './env';

// Builds optimized Cloudinary delivery URLs (spec §10).
// Transformations stay client-side (they are signed with the cloud name only,
// which is public); destructive operations go through the serverless API.

const BASE = () => `https://res.cloudinary.com/${env.cloudinaryCloudName}/image/upload`;

/**
 * Build a responsive Cloudinary URL.
 *
 * @param {object} opts
 * @param {string} opts.publicId  Cloudinary public_id
 * @param {number} [opts.width]   desired display width (px)
 * @param {number} [opts.height]  optional fixed height
 * @param {'fill'|'crop'|'fit'} [opts.crop]
 * @param {number} [opts.quality] 1-100
 * @returns {string}
 */
export function cloudinaryUrl({ publicId, width, height, crop = 'fill', quality }) {
  if (!publicId) return '';
  const parts = ['f_auto', 'q_auto'];
  if (quality) parts.push(`q_${quality}`);
  if (width && height) parts.push(`w_${width}`, `h_${height}`, `c_${crop}`);
  else if (width) parts.push(`w_${width}`);
  return `${BASE()}/${parts.join(',')}/${publicId}`;
}

/** Full-resolution (no transformation) URL — for lightbox zoom / download. */
export function cloudinaryOriginal(publicId) {
  return publicId ? `${BASE()}/${publicId}` : '';
}

/** Small placeholder used as blur-up / loading placeholder. */
export function cloudinaryBlur(publicId) {
  return publicId ? `${BASE()}/w_20,q_10,e_blur:200/${publicId}` : '';
}

/**
 * Best-effort face/center-cropped square — handy for avatars & covers.
 * Falls back to a standard crop if no publicId.
 */
export function cloudinarySquare(publicId, size = 256) {
  return publicId ? `${BASE()}/w_${size},h_${size},c_fill,g_auto/${publicId}` : '';
}

/**
 * Pick an appropriately sized thumbnail for a gallery card of the given
 * container width (keeps the CDN lean; spec §52).
 */
export function galleryImage(image, width) {
  return cloudinaryUrl({ publicId: image?.cloudinary_public_id, width });
}
