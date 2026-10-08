#!/usr/bin/env node
/**
 * Functional test of the Aiven schema RPCs (the Aiven replacement for
 * scripts/test-db.sql, which relies on Supabase-only features).
 *
 * Usage:
 *   npm run test:aiven:functions
 *
 * Creates temporary fixtures, verifies the RPC behaviour, then removes them.
 * Safe to run against any database — everything it creates is prefixed with
 * "__aiven_test_" or deleted at the end.
 */

import 'dotenv/config';
import { db } from '../api/_lib/db.js';

let failures = 0;
function check(label, ok, extra = '') {
  console.log(`  ${ok ? '✔' : '✖'} ${label}${extra ? ` — ${extra}` : ''}`);
  if (!ok) failures += 1;
}

async function main() {
  // --- Fixtures -------------------------------------------------------------
  await db.query('begin');
  const { rows: catRows } = await db.query(
    `insert into public.categories (name, slug) values ('__Test Nature', '__test-nature') returning id`,
  );
  const categoryId = catRows[0].id;

  const { rows: tagRows } = await db.query(
    `insert into public.tags (name, slug) values ('__testsunset', '__testsunset') returning id`,
  );
  const tagId = tagRows[0].id;

  const { rows: imgRows } = await db.query(
    `insert into public.images (title, slug, cloudinary_public_id, secure_url, category_id, is_published, view_count)
     values
       ('__Test Sunset', '__test-sunset', 'test/sunset', 'https://example.com/sunset.jpg', $1, true, 10),
       ('__Test Draft',  '__test-draft',  'test/draft',  'https://example.com/draft.jpg',  $1, false, 0)
     returning id, slug`,
    [categoryId],
  );
  const publishedId = imgRows.find((r) => r.slug === '__test-sunset').id;
  const draftId = imgRows.find((r) => r.slug === '__test-draft').id;

  await db.query(
    `insert into public.image_tags (image_id, tag_id) values ($1, $2)`,
    [publishedId, tagId],
  );
  await db.query('commit');

  try {
    // --- 1. list_images: public view hides drafts ---------------------------
    const { rows: pub } = await db.query(
      `select * from public.list_images($1::jsonb)`,
      [JSON.stringify({ published_only: true })],
    );
    check(
      'list_images(public) hides drafts',
      pub.some((r) => r.slug === '__test-sunset') && !pub.some((r) => r.slug === '__test-draft'),
    );
    check('list_images total count present', Number(pub[0]?.total) >= 1, `total=${pub[0]?.total}`);

    // --- 2. list_images: admin view sees drafts -----------------------------
    const { rows: all } = await db.query(
      `select * from public.list_images($1::jsonb)`,
      [JSON.stringify({ published_only: false })],
    );
    check('list_images(admin) sees drafts', all.some((r) => r.slug === '__test-draft'));

    // --- 3. list_images: tag filter -----------------------------------------
    const { rows: byTag } = await db.query(
      `select * from public.list_images($1::jsonb)`,
      [JSON.stringify({ tag: '__testsunset' })],
    );
    check(
      'list_images(tag filter)',
      byTag.length === 1 && byTag[0].slug === '__test-sunset',
    );
    check(
      'list_images returns joined tags',
      Array.isArray(byTag[0]?.tags) && byTag[0].tags[0]?.slug === '__testsunset',
    );

    // --- 4. list_images: search ---------------------------------------------
    const { rows: searched } = await db.query(
      `select * from public.list_images($1::jsonb)`,
      [JSON.stringify({ q: 'sunset', published_only: false })],
    );
    check(
      'list_images search q=sunset',
      searched.some((r) => r.slug === '__test-sunset'),
    );

    // --- 5. get_image_by_slug: draft hidden by default ----------------------
    const { rows: slugPub } = await db.query(
      `select public.get_image_by_slug('__test-draft') as r`,
    );
    check('get_image_by_slug hides draft by default', slugPub[0].r === null);

    const { rows: slugAdmin } = await db.query(
      `select public.get_image_by_slug('__test-draft', true) as r`,
    );
    check('get_image_by_slug(include_drafts) returns draft', slugAdmin[0].r?.slug === '__test-draft');

    const { rows: slugFull } = await db.query(
      `select public.get_image_by_slug('__test-sunset') as r`,
    );
    const full = slugFull[0].r;
    check(
      'get_image_by_slug joins category + tags',
      full?.category?.slug === '__test-nature' && full?.tags?.[0]?.slug === '__testsunset',
    );

    // --- 6. record_image_view dedupes per session ---------------------------
    await db.query(`select public.record_image_view($1, '__test-session-a')`, [publishedId]);
    await db.query(`select public.record_image_view($1, '__test-session-a')`, [publishedId]);
    await db.query(`select public.record_image_view($1, '__test-session-b')`, [publishedId]);
    const { rows: viewed } = await db.query(
      `select view_count from public.images where id = $1`,
      [publishedId],
    );
    check('record_image_view dedupes per session (10+2=12)', viewed[0].view_count === 12, `got ${viewed[0].view_count}`);

    // --- 7. taxonomy_list ----------------------------------------------------
    // NOTE: `setof jsonb` in raw SQL returns rows wrapped in a column named
    // after the function ({ taxonomy_list: {...} }). The future API layer must
    // unwrap `.taxonomy_list` (PostgREST/supabase.rpc did this automatically).
    const { rows: taxRaw } = await db.query(`select * from public.taxonomy_list('tags')`);
    const tax = taxRaw.map((r) => r.taxonomy_list ?? r);
    const testTag = tax.find((t) => t.slug === '__testsunset');
    check(
      'taxonomy_list(tags) counts published only',
      testTag && Number(testTag.image_count) === 1,
      `count=${testTag?.image_count}`,
    );

    // --- 8. log_activity + dashboard_stats -----------------------------------
    const { rows: prof } = await db.query(
      `insert into public.profiles (email, role, password_hash)
       values ('__test-admin@example.com', 'admin', 'x') returning id`,
    );
    await db.query(
      `select public.log_activity($1, 'Test action', 'image', $2, '{"t":1}'::jsonb)`,
      [prof[0].id, publishedId],
    );
    const { rows: acts } = await db.query(
      `select * from public.activity_logs where action = 'Test action'`,
    );
    check('log_activity inserts audit row', acts.length === 1);

    const { rows: stats } = await db.query(`select * from public.dashboard_stats()`);
    check(
      'dashboard_stats returns all counters',
      stats[0] && ['total_images', 'published_images', 'draft_images', 'categories', 'tags', 'total_views']
        .every((k) => stats[0][k] !== undefined),
    );

    // --- 9. updated_at trigger ------------------------------------------------
    await db.query(`update public.images set title = '__Test Sunset v2' where id = $1`, [publishedId]);
    const { rows: upd } = await db.query(
      `select created_at < updated_at as bumped from public.images where id = $1`,
      [publishedId],
    );
    check('updated_at trigger fires on update', upd[0].bumped === true);
  } finally {
    // --- Cleanup --------------------------------------------------------------
    await db.query('begin');
    await db.query(`delete from public.images where slug like '__test-%'`);
    await db.query(`delete from public.tags where slug = '__testsunset'`);
    await db.query(`delete from public.categories where slug = '__test-nature'`);
    await db.query(`delete from public.profiles where email = '__test-admin@example.com'`);
    await db.query(`delete from public.activity_logs where action = 'Test action'`);
    await db.query('commit');
  }

  console.log(
    failures === 0
      ? '\n✅ All functional RPC tests PASSED'
      : `\n❌ ${failures} functional test(s) FAILED`,
  );
}

try {
  await main();
} catch (err) {
  console.error('Functional test crashed:', err.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
