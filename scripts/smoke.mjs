// Quick end-to-end smoke test against the running dev server.
// Visits every route and reports console/page errors.
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173';
const routes = [
  '/',
  '/gallery',
  '/categories',
  '/tags',
  '/authors',
  '/albums',
  '/category/nature',
  '/tag/sunset',
  '/author/john',
  '/album/travel',
  '/image/some-slug',
  '/admin/login',
  '/admin',
  '/admin/images',
  '/admin/categories',
  '/admin/settings',
  '/does-not-exist',
];

const browser = await chromium.launch();
let failures = 0;

for (const route of routes) {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(400);
    const title = await page.title();
    const body = (await page.textContent('body'))?.trim().slice(0, 120).replace(/\s+/g, ' ');
    const status = errors.length === 0 ? 'OK  ' : 'FAIL';
    if (errors.length) failures += 1;
    console.log(`[${status}] ${route.padEnd(24)} title="${title}" | body="${body}"`);
    errors.forEach((e) => console.log(`         ↳ ${e}`));
  } catch (err) {
    failures += 1;
    console.log(`[FAIL] ${route} — ${err.message}`);
  } finally {
    await page.close();
  }
}

await browser.close();
console.log(`\n${failures === 0 ? '✅ All routes OK' : `❌ ${failures} route(s) with errors`}`);
process.exit(failures === 0 ? 0 : 1);
