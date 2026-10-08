// Central place for reading + validating environment configuration.
// Only VITE_* values are ever available in the browser.

const read = (key) => {
  const v = import.meta.env[key];
  return typeof v === 'string' && v.length > 0 ? v.trim() : '';
};

export const env = {
  supabaseUrl: read('VITE_SUPABASE_URL'),
  supabaseAnonKey: read('VITE_SUPABASE_ANON_KEY'),
  cloudinaryCloudName: read('VITE_CLOUDINARY_CLOUD_NAME'),
  cloudinaryUploadFolder: read('VITE_CLOUDINARY_UPLOAD_FOLDER') || 'personal-gallery',
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const isCloudinaryConfigured = Boolean(env.cloudinaryCloudName);

export const isFullyConfigured = isSupabaseConfigured && isCloudinaryConfigured;
