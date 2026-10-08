// Server-side environment reading. Runs only on Vercel / the local API server,
// so these secrets are never exposed to the browser.

const read = (key) => {
  const v = process.env[key];
  return typeof v === 'string' && v.length > 0 ? v.trim() : '';
};

export const serverEnv = {
  supabaseUrl: read('VITE_SUPABASE_URL'),
  supabaseServiceRoleKey: read('SUPABASE_SERVICE_ROLE_KEY'),
  cloudinaryCloudName: read('VITE_CLOUDINARY_CLOUD_NAME'),
  cloudinaryApiKey: read('CLOUDINARY_API_KEY'),
  cloudinaryApiSecret: read('CLOUDINARY_API_SECRET'),
};

/** Returns true only when all required server-side env vars are present. */
export const serverReady = () => serverEnvErrors().length === 0;

/**
 * Returns an array of error messages listing exactly which env vars are
 * missing. The message hints at where to find each one.
 */
export function serverEnvErrors() {
  const missing = [];
  if (!serverEnv.supabaseUrl)
    missing.push('VITE_SUPABASE_URL (your Supabase project URL)');
  if (!serverEnv.supabaseServiceRoleKey)
    missing.push('SUPABASE_SERVICE_ROLE_KEY (from Supabase Settings → API)');
  if (!serverEnv.cloudinaryCloudName)
    missing.push('VITE_CLOUDINARY_CLOUD_NAME (from Cloudinary Dashboard)');
  if (!serverEnv.cloudinaryApiKey)
    missing.push('CLOUDINARY_API_KEY (from Cloudinary Dashboard)');
  if (!serverEnv.cloudinaryApiSecret)
    missing.push('CLOUDINARY_API_SECRET (from Cloudinary Dashboard — keep secret!)');
  return missing;
}
