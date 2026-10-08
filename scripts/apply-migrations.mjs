#!/usr/bin/env node
/**
 * Apply Aiven migrations (aiven/migrations/*.sql) in filename order.
 *
 * Usage:
 *   npm run migrate:aiven
 *
 * - Requires DATABASE_URL in .env (your Aiven PostgreSQL connection string).
 * - Tracks applied files in public.schema_migrations, so it is safe to re-run:
 *   each file is applied at most once.
 * - Each file runs inside a single transaction on ONE dedicated client
 *   (never use Pool.query for BEGIN/COMMIT — different queries may land on
 *   different pool clients). Either the whole file applies or nothing does.
 */

import 'dotenv/config';
import { readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../api/_lib/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../aiven/migrations');

async function main() {
  // One dedicated client for the whole run — keeps transactions intact.
  const client = await db.connect();

  try {
    await client.query(`
      create table if not exists public.schema_migrations (
        filename   text primary key,
        applied_at timestamptz not null default now()
      );
    `);

    const { rows } = await client.query('select filename from public.schema_migrations');
    const done = new Set(rows.map((r) => r.filename));

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No .sql files found in aiven/migrations — nothing to do.');
      return;
    }

    const pending = files.filter((f) => !done.has(f));

    if (pending.length === 0) {
      console.log('All migrations already applied:');
      files.forEach((f) => console.log(`  ✔ ${f}`));
      return;
    }

    for (const file of pending) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      try {
        await client.query('begin');
        await client.query(sql); // multi-statement OK: pg uses the simple query protocol
        await client.query('insert into public.schema_migrations (filename) values ($1)', [file]);
        await client.query('commit');
        console.log(`✔ Applied ${file}`);
      } catch (err) {
        await client.query('rollback');
        console.error(`✖ Failed ${file}: ${err.message}`);
        throw err;
      }
    }

    console.log(`\nDone — ${pending.length} migration(s) applied.`);
  } finally {
    client.release();
  }
}

try {
  await main();
} catch (err) {
  console.error('Migration run aborted:', err.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
