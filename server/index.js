// Local development API server (Express).
// Mounts the exact same handlers that Vercel runs as serverless functions
// under /api, so behaviour is identical in dev and production.
//
// During development Vite proxies /api → this server (see vite.config.js).
// If a production build exists in dist/, it is also served here so you can
// run the full app with `npm run build && node server/index.js`.

import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import signHandler from '../api/cloudinary/sign.js';
import deleteHandler from '../api/cloudinary/delete.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.raw({ type: '*/*', limit: '1mb' }));

// --- API routes (identical paths to Vercel) ---
app.post('/api/cloudinary/sign', signHandler);
app.post('/api/cloudinary/delete', deleteHandler);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// --- Serve the production build (optional; Vite serves dev) ---
const dist = path.resolve(__dirname, '../dist');
if (fs.existsSync(path.join(dist, 'index.html'))) {
  app.use(express.static(dist));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[api] listening on http://0.0.0.0:${PORT}`);
});
