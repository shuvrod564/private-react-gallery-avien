// Small HTTP helpers that work identically under Vercel serverless functions
// and the local Express dev server.

export function json(res, status, body) {
  if (res.headersSent) return;
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  if (typeof res.json === 'function') return res.json(body);
  res.end(JSON.stringify(body));
}

/**
 * Read and JSON.parse the request body (max ~1 MB).
 *
 * Handles three scenarios:
 * 1. Express `express.json()` has already parsed → returns the object directly.
 * 2. Express `express.raw()` stored a Buffer → parse it now.
 * 3. No middleware / Vercel serverless → read from the raw stream.
 */
export function readJsonBody(req) {
  return new Promise((resolve) => {
    // Case 1: Already parsed as JSON object by express.json() middleware.
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      resolve(req.body);
      return;
    }
    // Case 2: Parsed as raw Buffer by express.raw() middleware.
    if (req.body && Buffer.isBuffer(req.body) && req.body.length > 0) {
      try {
        resolve(JSON.parse(req.body.toString('utf8')));
      } catch {
        resolve({});
      }
      return;
    }
    // Case 3: No middleware — read the raw stream (Vercel or plain Node).
    let data = '';
    const onData = (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) req.destroy();
    };
    const onEnd = () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { resolve({}); }
    };
    const onError = () => resolve({});
    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);

    // If body was already consumed before we attached listeners, end silently.
    if (req.complete || req.readableEnded) {
      req.removeListener('data', onData);
      req.removeListener('end', onEnd);
      req.removeListener('error', onError);
      resolve({});
    }
  });
}

/** Wrap an async handler with try/catch → consistent 500 responses. */
export function route(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error('[api] unhandled error:', err);
      json(res, 500, { error: 'Something went wrong. Please try again.' });
    }
  };
}
