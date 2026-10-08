// Shared constants used across the app.

export const GALLERY_LAYOUTS = ['grid', 'masonry'];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'most_viewed', label: 'Most viewed' },
  { value: 'recently_updated', label: 'Recently updated' },
  { value: 'title_asc', label: 'Title A–Z' },
  { value: 'title_desc', label: 'Title Z–A' },
];

export const DEFAULT_PAGE_SIZE = 20;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

export const SESSION_KEY = 'gallery_session_id';

export const ROLES = ['user', 'admin'];

export const PUBLIC_ROUTES = [
  { path: '/', label: 'Home' },
  { path: '/gallery', label: 'Gallery' },
  { path: '/categories', label: 'Categories' },
  { path: '/tags', label: 'Tags' },
  { path: '/authors', label: 'Authors' },
  { path: '/albums', label: 'Albums' },
];
