import { supabase } from '../lib/supabase';
import { env } from '../lib/env';

// All destructive/signed Cloudinary operations go through our serverless API
// (/api) — the API secret never leaves the server (spec §9, §18).

async function apiFetch(path, body) {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured on the frontend. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.',
    );
  }

  // Get the admin's Supabase session token to authorize the API call.
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token || '';

  // AbortController timeout — fetch should never hang indefinitely.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || `API request failed (${res.status}).`);
    }
    return json;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(
        'The upload request timed out. Check that the API server is running (npm run dev starts both Vite and the API on :3001). If it is, verify your server-side environment variables in .env (SUPABASE_SERVICE_ROLE_KEY, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).',
      );
    }
    throw err;
  }
}

/**
 * Signed upload: ask our server for signature, then POST the file straight to
 * Cloudinary. Returns normalized asset metadata (spec §9, §68).
 *
 * @param {File} file
 * @param {object} [opts] { folder }
 */
export async function uploadToCloudinary(file, { folder, onProgress: _onProgress } = {}) {
  const signed = await apiFetch('/api/cloudinary/sign', {
    folder: folder || env.cloudinaryUploadFolder,
  });

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', signed.api_key);
  form.append('timestamp', String(signed.timestamp));
  form.append('signature', signed.signature);
  form.append('folder', signed.folder);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${signed.cloud_name}/image/upload`;

  const uploadController = new AbortController();
  const uploadTimeout = setTimeout(() => uploadController.abort(), 60000); // 60s for the actual CDN upload

  try {
    const res = await fetch(uploadUrl, {
      method: 'POST',
      body: form,
      signal: uploadController.signal,
    });
    clearTimeout(uploadTimeout);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Cloudinary upload failed.');
    }
    const asset = await res.json();

    return {
      cloudinary_public_id: asset.public_id,
      cloudinary_url: asset.url,
      secure_url: asset.secure_url,
      width: asset.width ?? null,
      height: asset.height ?? null,
      format: asset.format ?? null,
      file_size: asset.bytes ?? null,
    };
  } catch (err) {
    clearTimeout(uploadTimeout);
    if (err.name === 'AbortError') {
      throw new Error(
        'Upload to Cloudinary timed out after 60 seconds. Check your Cloudinary configuration (VITE_CLOUDINARY_CLOUD_NAME + server-side CLOUDINARY_API_KEY/API_SECRET).',
      );
    }
    throw err;
  }
}

/** Permanently remove a Cloudinary asset (admin-only, server-verified). */
export async function deleteCloudinaryAsset(publicId) {
  return apiFetch('/api/cloudinary/delete', { public_id: publicId });
}
