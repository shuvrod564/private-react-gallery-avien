#!/usr/bin/env node
/**
 * Verify the Aiven schema after running `npm run migrate:aiven`.
 *
 * Usage:
 *   node scripts/check-aiven-schema.mjs
 *
 * Checks, against the database in DATABASE_URL:
 *   1. Every expected table exists in the public schema
 *   2. Every expected RPC function exists
 *   3. Key columns are present (profiles.password_hash, images.*, …)
 *   4. Row counts per table (so you can see the data landed)
 */

import 'dotenv/config';
import { db } from '../api/_lib/db.js';

const EXPECTED_TABLES = [
  'schema_migrations',
  'profiles',
  'settings',
  'categories',
  'tags',
  'authors',
  'albums',
  'images',
  'image_tags',
  'image_views',
  'activity_logs',
];

const EXPECTED_FUNCTIONS = [
  'list_images',
  'get_image_by_slug',
  'record_image_view',
  'log_activity',
  'dashboard_stats',
  'taxonomy_list',
  'handle_updated_at',
];

const EXPECTED_KEY_COLUMNS = {
  profiles: ['id', 'email', 'role', 'password_hash', 'display_name'],
  images: [
    'id', 'title', 'slug', 'cloudinary_public_id', 'secure_url',
    'category_id', 'author_id', 'album_id', 'is_featured', 'is_published',
    'view_count', 'published_at',
  ],
  settings: ['id', 'site_title', 'images_per_page', 'social_links'],
};

let failures = 0;
const check = (label, ok, extra = '') => {
  console.log(`  ${ok ? '✔' : '✖'} ${label}${extra ? ` — ${extra}` : ''}`);
  if (!ok) failures += 1;
};

try {
  // 1. Tables
  console.log('\n[1/4] Tables in public schema');
  const { rows: tables } = await db.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name;
  `);
  const found = tables.map((t) => t.table_name);
  for (const t of EXPECTED_TABLES) check(`table ${t}`, found.includes(t));
  const unexpected = found.filter((t) => !EXPECTED_TABLES.includes(t));
  if (unexpected.length) console.log(`  ℹ other tables present: ${unexpected.join(', ')}`);

  // 2. Functions
  console.log('\n[2/4] RPC / helper functions in public schema');
  const { rows: fns } = await db.query(`
    select distinct proname
    from pg_proc
    where pronamespace = 'public'::regnamespace
    order by proname;
  `);
  const foundFns = fns.map((f) => f.proname);
  for (const f of EXPECTED_FUNCTIONS) check(`function ${f}()`, foundFns.includes(f));

  // 3. Key columns
  console.log('\n[3/4] Key columns');
  for (const [table, cols] of Object.entries(EXPECTED_KEY_COLUMNS)) {
    const { rows } = await db.query(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = $1;`,
      [table],
    );
    const present = rows.map((r) => r.column_name);
    for (const c of cols) check(`${table}.${c}`, present.includes(c));
  }

  // 4. Row counts
  console.log('\n[4/4] Row counts');
  for (const t of EXPECTED_TABLES.filter((x) => x !== 'schema_migrations')) {
    const { rows } = await db.query(`select count(*)::int as n from public.${t}`);
    console.log(`  • ${t.padEnd(14)} ${rows[0].n} row(s)`);
  }

  // Extensions
  const { rows: ext } = await db.query(
    `select extname from pg_extension where extname = 'pg_trgm';`,
  );
  check('extension pg_trgm', ext.length === 1);

  console.log(
    failures === 0
      ? '\n✅ Schema verification PASSED — the Aiven database is ready.'
      : `\n❌ ${failures} check(s) failed. Run "npm run migrate:aiven" first.`,
  );
} catch (error) {
  console.error('Schema check failed:', error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
