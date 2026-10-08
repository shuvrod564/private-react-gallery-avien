// POST /api/cloudinary/delete
// Permanently destroys a Cloudinary asset by public_id. Admin-only.
// Returns Cloudinary's raw result so the client can retry on failure
// (spec §28 — never pretend a failed deletion succeeded).

import { requireAdmin } from '../_lib/auth.js';
import { json, readJsonBody, route } from '../_lib/http.js';
import { cloudinary } from '../_lib/cloudinary.js';
import { serverReady } from '../_lib/env.js';

const handler = route(async (req, res) => {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed.' });
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) return json(res, auth.status, { error: auth.error });

  if (!serverReady()) {
    return json(res, 503, { error: 'Server is not configured.' });
  }

  const body = await readJsonBody(req);
  const publicId = typeof body.public_id === 'string' ? body.public_id.trim() : '';

  if (!publicId) {
    return json(res, 400, { error: 'public_id is required.' });
  }

  const result = await cloudinary.uploader.destroy(publicId);

  if (result.result === 'not found') {
    // Idempotent success — the asset is already gone.
    return json(res, 200, { ok: true, result, alreadyMissing: true });
  }
  if (result.result !== 'ok') {
    return json(res, 502, {
      error: 'Failed to delete the image from the CDN.',
      result,
    });
  }

  json(res, 200, { ok: true, result });
});

export default handler;
