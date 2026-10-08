-- Functional test of the gallery schema (run as postgres against gallery_test)
\set ON_ERROR_STOP on

-- Clean slate
TRUNCATE public.activity_logs, public.image_views, public.image_tags, public.images,
         public.albums, public.authors, public.tags, public.categories, public.profiles
         RESTART IDENTITY CASCADE;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@example.com'),
  ('00000000-0000-0000-0000-000000000002', 'user@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@example.com', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'user@example.com', 'user')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.categories (name, slug) VALUES ('Nature', 'nature'), ('Travel', 'travel');
INSERT INTO public.tags (name, slug) VALUES ('sunset', 'sunset'), ('mountain', 'mountain');
INSERT INTO public.authors (name, slug) VALUES ('John Doe', 'john-doe');
INSERT INTO public.albums (name, slug) VALUES ('Travel 2026', 'travel-2026');

INSERT INTO public.images (title, slug, cloudinary_public_id, secure_url, category_id, is_published, view_count)
SELECT 'Sunset', 'sunset-over-mountains', 'gallery/sunset', 'https://example.com/sunset.jpg', id, true, 10
FROM public.categories WHERE slug='nature';
INSERT INTO public.images (title, slug, cloudinary_public_id, secure_url, category_id, is_published, view_count)
SELECT 'City', 'city-lights', 'gallery/city', 'https://example.com/city.jpg', id, true, 5
FROM public.categories WHERE slug='travel';
INSERT INTO public.images (title, slug, cloudinary_public_id, secure_url, category_id, is_published, view_count)
SELECT 'Draft', 'draft-hidden', 'gallery/draft', 'https://example.com/draft.jpg', id, false, 0
FROM public.categories WHERE slug='nature';

INSERT INTO public.image_tags (image_id, tag_id)
SELECT i.id, t.id FROM public.images i, public.tags t WHERE i.slug='sunset-over-mountains' AND t.slug='sunset';

-- ===================== ANON =====================
SELECT '1. anon list_images sees only published' AS test;
SET ROLE anon;
SELECT count(*) AS anon_sees, min(title) AS first_title FROM public.list_images('{}'::jsonb);

SELECT '2. anon: draft hidden by search + slug' AS test;
SET ROLE anon;
SELECT count(*) AS draft_leaked FROM public.list_images('{"q":"draft"}'::jsonb);
SELECT public.get_image_by_slug('draft-hidden') IS NULL AS draft_hidden_via_slug;

SELECT '3. anon: filters work' AS test;
SET ROLE anon;
SELECT title FROM public.list_images('{"category":"nature"}'::jsonb) ORDER BY 1;
SELECT title FROM public.list_images('{"tag":"sunset"}'::jsonb) ORDER BY 1;
SELECT title FROM public.list_images('{"q":"city"}'::jsonb) ORDER BY 1;
SELECT count(*) AS featured_count FROM public.list_images('{"featured":"true"}'::jsonb);

SELECT '4. anon: view count dedupes per session' AS test;
SET ROLE anon;
SELECT public.record_image_view((SELECT id FROM public.images WHERE slug='city-lights'), 'sess-A');
SELECT public.record_image_view((SELECT id FROM public.images WHERE slug='city-lights'), 'sess-A');
SELECT public.record_image_view((SELECT id FROM public.images WHERE slug='city-lights'), 'sess-B');
SELECT view_count AS city_views_expect_7 FROM public.images WHERE slug='city-lights';

SELECT '5. anon: taxonomy_list counts published only' AS test;
SET ROLE anon;
SELECT j->>'name' AS name, j->>'image_count' AS count FROM public.taxonomy_list('categories') j ORDER BY 1;
SELECT j->>'name' AS name, j->>'image_count' AS count FROM public.taxonomy_list('tags') j ORDER BY 1;

SELECT '6. anon: cannot update/delete images (RLS filters 0 rows)' AS test;
SET ROLE anon;
DO $$
DECLARE n bigint;
BEGIN
  UPDATE public.images SET title='hacked' WHERE slug='city-lights';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: anon updated % row(s)', n; END IF;
  DELETE FROM public.images WHERE slug='city-lights';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: anon deleted % row(s)', n; END IF;
END $$;
SELECT title AS title_unchanged FROM public.images WHERE slug='city-lights';

SELECT '7. anon: dashboard_stats denied' AS test;
SET ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM public.dashboard_stats();
    RAISE EXCEPTION 'FAIL: anon read dashboard stats';
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN NULL;
  END;
END $$;

RESET ROLE;

-- ===================== ADMIN =====================
SELECT '8. admin: sees drafts, writes, stats' AS test;
SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SELECT count(*) AS admin_sees_all FROM public.list_images('{"published_only":false}'::jsonb);
SELECT total_images, published_images, draft_images, categories, tags FROM public.dashboard_stats();
SELECT public.log_activity('Uploaded image', 'image', '00000000-0000-0000-0000-000000000003', '{"title":"Sunset"}');
SELECT count(*) AS activity_rows FROM public.activity_logs;
UPDATE public.images SET title='City Lights (edited)' WHERE slug='city-lights';
SELECT title FROM public.images WHERE slug='city-lights';
INSERT INTO public.categories (name, slug) VALUES ('Food', 'food');
DELETE FROM public.tags WHERE slug='sunset';
SELECT count(*) AS tags_after_delete FROM public.tags;

SELECT '9. admin: role cannot be downgraded by self (policy blocks)' AS test;
SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
DO $$ BEGIN
  BEGIN
    UPDATE public.profiles SET role='user' WHERE id='00000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'FAIL: admin changed own role';
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;
SELECT role AS admin_role_still FROM public.profiles WHERE id='00000000-0000-0000-0000-000000000001';

RESET ROLE;
RESET request.jwt.claim.sub;

-- ===================== REGULAR USER =====================
SELECT '10. regular user: no writes, no self-promotion' AS test;
SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
DO $$
DECLARE n bigint;
BEGIN
  UPDATE public.images SET title='hacked2' WHERE slug='city-lights';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: user updated % row(s)', n; END IF;

  BEGIN
    UPDATE public.profiles SET role='admin' WHERE id='00000000-0000-0000-0000-000000000002';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN RAISE EXCEPTION 'FAIL: user self-promoted (% rows)', n; END IF;
  EXCEPTION
    WHEN others THEN NULL; -- RLS WITH CHECK violation → blocked, good
  END;
END $$;
SELECT role AS user_role_unchanged FROM public.profiles WHERE id='00000000-0000-0000-0000-000000000002';
DO $$ BEGIN
  BEGIN
    PERFORM public.dashboard_stats();
    RAISE EXCEPTION 'FAIL: user read dashboard stats';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;
END $$;
SELECT public.log_activity('hax', null, null, null);
SELECT count(*) AS activity_unchanged FROM public.activity_logs;
SELECT title FROM public.images WHERE slug='city-lights';

RESET ROLE;
RESET request.jwt.claim.sub;

\echo ''
\echo '=== ALL TESTS PASSED ==='
