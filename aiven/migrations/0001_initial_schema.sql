-- ============================================================================
-- Personal Image Gallery — Initial schema (AIVEN for PostgreSQL)
-- ============================================================================
-- This is the Aiven-compatible adaptation of
--   supabase/migrations/0001_initial_schema.sql
--
-- Removed (Supabase-only, they do not exist on Aiven):
--   * references to auth.users            → profiles is now a standalone table
--   * auth.uid()                          → server enforces identity via JWT
--   * anon / authenticated roles          → the app connects with ONE db role
--   * Row Level Security policies         → authorization moves to the API layer
--   * trigger on auth.users (signup)      → admins are created via a script
--
-- Changed:
--   * profiles gained password_hash + unique email (custom auth, bcrypt in Node)
--   * activity_logs.user_id now references profiles(id)
--   * log_activity() takes an explicit p_user_id instead of auth.uid()
--   * get_image_by_slug() gained p_include_drafts (server decides; RLS is gone)
--   * dashboard_stats() no longer checks is_admin() (API layer enforces it)
--
-- How to run (pick one):
--   1) npm run migrate:aiven          (recommended — tracks applied files in
--                                      schema_migrations, safe to re-run)
--   2) psql "$DATABASE_URL" -f aiven/migrations/0001_initial_schema.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
--   pg_trgm powers the ILIKE search indexes. On Aiven, avnadmin is allowed
--   to create it (it is on the Aiven approved-extension list).
-- ---------------------------------------------------------------------------
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Migration bookkeeping (used by scripts/apply-migrations.mjs)
-- ---------------------------------------------------------------------------
create table if not exists public.schema_migrations (
  filename   text primary key,
  applied_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles (standalone — replaces Supabase auth.users + profiles)
--   password_hash: bcrypt hash created/verified in Node (scripts/create-admin,
--   POST /api/auth/login). NEVER store a plaintext password here.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  display_name  text,
  role          text not null default 'user' check (role in ('user', 'admin')),
  avatar_url    text,
  password_hash text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Settings (single row)
-- ---------------------------------------------------------------------------
create table public.settings (
  id               bigint generated always as identity primary key,
  site_title       text not null default 'Personal Gallery',
  site_description text not null default '',
  logo_url         text,
  favicon_url      text,
  default_layout   text not null default 'grid' check (default_layout in ('grid', 'masonry')),
  images_per_page  int not null default 20 check (images_per_page between 1 and 100),
  allow_download   boolean not null default false,
  social_links     jsonb not null default '{}'::jsonb,
  contact_email    text,
  contact_phone    text,
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  slug           text not null unique,
  description    text,
  cover_image_id uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------
create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Authors
-- ---------------------------------------------------------------------------
create table public.authors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  bio         text,
  avatar_url  text,
  website_url text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Albums
-- ---------------------------------------------------------------------------
create table public.albums (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  slug           text not null unique,
  description    text,
  cover_image_id uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Images (metadata only — binaries live in Cloudinary)
-- ---------------------------------------------------------------------------
create table public.images (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  slug                text not null unique,
  description         text,
  caption             text,
  alt_text            text,
  cloudinary_public_id text not null,
  cloudinary_url      text,
  secure_url          text not null,
  thumbnail_url       text,
  width               int,
  height              int,
  format              text,
  file_size           bigint,
  category_id         uuid references public.categories (id) on delete set null,
  author_id           uuid references public.authors (id) on delete set null,
  album_id            uuid references public.albums (id) on delete set null,
  sort_order          int not null default 0,
  is_featured         boolean not null default false,
  is_published        boolean not null default false,
  allow_download      boolean not null default false,
  view_count          int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  published_at        timestamptz
);

-- Cover image foreign keys (added after images exists to break the cycle)
alter table public.categories
  add constraint categories_cover_image_id_fkey
  foreign key (cover_image_id) references public.images (id) on delete set null;

alter table public.albums
  add constraint albums_cover_image_id_fkey
  foreign key (cover_image_id) references public.images (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Image <-> Tag junction
-- ---------------------------------------------------------------------------
create table public.image_tags (
  image_id uuid not null references public.images (id) on delete cascade,
  tag_id   uuid not null references public.tags (id) on delete cascade,
  primary key (image_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- Image views (dedupe: one view per session per image)
-- ---------------------------------------------------------------------------
create table public.image_views (
  image_id    uuid not null references public.images (id) on delete cascade,
  session_key text not null,
  viewed_at   timestamptz not null default now(),
  primary key (image_id, session_key)
);

-- ---------------------------------------------------------------------------
-- Activity log (admin audit trail)
-- ---------------------------------------------------------------------------
create table public.activity_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.profiles (id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index images_slug_idx on public.images (slug);
create index images_category_id_idx on public.images (category_id);
create index images_author_id_idx on public.images (author_id);
create index images_album_id_idx on public.images (album_id);
create index images_created_at_idx on public.images (created_at desc);
create index images_published_at_idx on public.images (published_at desc);
create index images_is_published_idx on public.images (is_published);
create index images_is_featured_idx on public.images (is_featured);
create index images_title_trgm_idx on public.images using gin (title gin_trgm_ops);
create index images_description_trgm_idx on public.images using gin (coalesce(description, '') gin_trgm_ops);

create index tags_slug_idx on public.tags (slug);
create index tags_name_trgm_idx on public.tags using gin (name gin_trgm_ops);
create index categories_slug_idx on public.categories (slug);
create index categories_name_trgm_idx on public.categories using gin (name gin_trgm_ops);
create index authors_slug_idx on public.authors (slug);
create index authors_name_trgm_idx on public.authors using gin (name gin_trgm_ops);
create index albums_slug_idx on public.albums (slug);
create index albums_name_trgm_idx on public.albums using gin (name gin_trgm_ops);

create index image_views_image_id_idx on public.image_views (image_id);
create index activity_logs_created_at_idx on public.activity_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- Helper: keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Main gallery query: search + filters + sort + pagination
--   (logic identical to the Supabase version; authorization is enforced by
--    the API layer — the server only passes published_only=false for admins)
-- ---------------------------------------------------------------------------
create or replace function public.list_images(p_opts jsonb default '{}')
returns table (
  id uuid,
  title text,
  slug text,
  description text,
  caption text,
  alt_text text,
  cloudinary_public_id text,
  secure_url text,
  width int,
  height int,
  format text,
  file_size bigint,
  category_id uuid,
  author_id uuid,
  album_id uuid,
  sort_order int,
  is_featured boolean,
  is_published boolean,
  allow_download boolean,
  view_count int,
  created_at timestamptz,
  updated_at timestamptz,
  published_at timestamptz,
  category jsonb,
  author jsonb,
  album jsonb,
  tags jsonb,
  total bigint
)
language plpgsql
stable
set search_path = public
as $$
declare
  v_q text := lower(coalesce(p_opts ->> 'q', ''));
  v_category text := coalesce(p_opts ->> 'category', '');
  v_tag text := coalesce(p_opts ->> 'tag', '');
  v_author text := coalesce(p_opts ->> 'author', '');
  v_album text := coalesce(p_opts ->> 'album', '');
  v_featured text := coalesce(p_opts ->> 'featured', '');
  v_status text := coalesce(p_opts ->> 'status', '');
  v_sort text := coalesce(p_opts ->> 'sort', 'newest');
  v_date_from text := coalesce(p_opts ->> 'date_from', '');
  v_date_to text := coalesce(p_opts ->> 'date_to', '');
  v_published_only boolean := coalesce((p_opts ->> 'published_only')::boolean, true);
  v_page int := greatest(coalesce((p_opts ->> 'page')::int, 1), 1);
  v_page_size int := greatest(coalesce((p_opts ->> 'page_size')::int, 20), 1);
begin
  return query
  with base as (
    select
      i.id, i.title, i.slug, i.description, i.caption, i.alt_text,
      i.cloudinary_public_id, i.secure_url, i.width, i.height, i.format, i.file_size,
      i.category_id, i.author_id, i.album_id, i.sort_order,
      i.is_featured, i.is_published, i.allow_download, i.view_count,
      i.created_at, i.updated_at, i.published_at,
      case when c.id is null then null else jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug) end as category,
      case when a.id is null then null else jsonb_build_object('id', a.id, 'name', a.name, 'slug', a.slug, 'avatar_url', a.avatar_url) end as author,
      case when al.id is null then null else jsonb_build_object('id', al.id, 'name', al.name, 'slug', al.slug) end as album,
      coalesce((
        select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug) order by t.name)
        from public.image_tags it
        join public.tags t on t.id = it.tag_id
        where it.image_id = i.id
      ), '[]'::jsonb) as tags
    from public.images i
    left join public.categories c on c.id = i.category_id
    left join public.authors a on a.id = i.author_id
    left join public.albums al on al.id = i.album_id
    where
      (not v_published_only or i.is_published)
      and (v_status = ''
           or (v_status = 'published' and i.is_published)
           or (v_status = 'draft' and not i.is_published))
      and (v_category = '' or c.slug = v_category)
      and (v_author = '' or a.slug = v_author)
      and (v_album = '' or al.slug = v_album)
      and (v_featured = '' or i.is_featured = (v_featured = 'true'))
      and (v_date_from = '' or i.created_at::date >= v_date_from::date)
      and (v_date_to = '' or i.created_at::date <= v_date_to::date)
      and (v_tag = '' or exists (
            select 1
            from public.image_tags it2
            join public.tags t2 on t2.id = it2.tag_id
            where it2.image_id = i.id and t2.slug = v_tag))
      and (v_q = ''
           or i.title ilike '%' || v_q || '%'
           or coalesce(i.description, '') ilike '%' || v_q || '%'
           or coalesce(i.caption, '') ilike '%' || v_q || '%'
           or coalesce(i.alt_text, '') ilike '%' || v_q || '%'
           or exists (
               select 1
               from public.image_tags it3
               join public.tags t3 on t3.id = it3.tag_id
               where it3.image_id = i.id and t3.name ilike '%' || v_q || '%')
           or c.name ilike '%' || v_q || '%'
           or a.name ilike '%' || v_q || '%')
  )
  select
    b.id, b.title, b.slug, b.description, b.caption, b.alt_text,
    b.cloudinary_public_id, b.secure_url, b.width, b.height, b.format, b.file_size,
    b.category_id, b.author_id, b.album_id, b.sort_order,
    b.is_featured, b.is_published, b.allow_download, b.view_count,
    b.created_at, b.updated_at, b.published_at,
    b.category, b.author, b.album, b.tags,
    (select count(*)::bigint from base) as total
  from base b
  order by
    case when v_sort = 'newest' then b.created_at end desc nulls last,
    case when v_sort = 'oldest' then b.created_at end asc nulls last,
    case when v_sort = 'most_viewed' then b.view_count end desc nulls last,
    case when v_sort = 'recently_updated' then b.updated_at end desc nulls last,
    case when v_sort = 'title_asc' then lower(b.title) end asc nulls last,
    case when v_sort = 'title_desc' then lower(b.title) end desc nulls last,
    b.created_at desc
  limit v_page_size
  offset (v_page - 1) * v_page_size;
end;
$$;

-- ---------------------------------------------------------------------------
-- Single image by slug
--   p_include_drafts: the API layer sets true only for authenticated admins
--   (replaces the old "RLS hides drafts" behaviour)
-- ---------------------------------------------------------------------------
create or replace function public.get_image_by_slug(p_slug text, p_include_drafts boolean default false)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', i.id,
    'title', i.title,
    'slug', i.slug,
    'description', i.description,
    'caption', i.caption,
    'alt_text', i.alt_text,
    'cloudinary_public_id', i.cloudinary_public_id,
    'secure_url', i.secure_url,
    'width', i.width,
    'height', i.height,
    'format', i.format,
    'file_size', i.file_size,
    'category_id', i.category_id,
    'author_id', i.author_id,
    'album_id', i.album_id,
    'sort_order', i.sort_order,
    'is_featured', i.is_featured,
    'is_published', i.is_published,
    'allow_download', i.allow_download,
    'view_count', i.view_count,
    'created_at', i.created_at,
    'updated_at', i.updated_at,
    'published_at', i.published_at,
    'category', case when c.id is null then null else jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug) end,
    'author', case when a.id is null then null else jsonb_build_object('id', a.id, 'name', a.name, 'slug', a.slug, 'avatar_url', a.avatar_url, 'bio', a.bio, 'website_url', a.website_url) end,
    'album', case when al.id is null then null else jsonb_build_object('id', al.id, 'name', al.name, 'slug', al.slug, 'description', al.description) end,
    'tags', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug) order by t.name)
      from public.image_tags it
      join public.tags t on t.id = it.tag_id
      where it.image_id = i.id
    ), '[]'::jsonb)
  )
  from public.images i
  left join public.categories c on c.id = i.category_id
  left join public.authors a on a.id = i.author_id
  left join public.albums al on al.id = i.album_id
  where i.slug = p_slug
    and (p_include_drafts or i.is_published)
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Increment view count, deduped per session
-- ---------------------------------------------------------------------------
create or replace function public.record_image_view(p_image_id uuid, p_session_key text)
returns void
language plpgsql
set search_path = public
as $$
begin
  insert into public.image_views (image_id, session_key)
  values (p_image_id, p_session_key)
  on conflict (image_id, session_key) do nothing;

  if found then
    update public.images
    set view_count = view_count + 1
    where id = p_image_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin activity logging — p_user_id is passed explicitly by the API layer
-- ---------------------------------------------------------------------------
create or replace function public.log_activity(p_user_id uuid, p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb default null)
returns void
language plpgsql
set search_path = public
as $$
begin
  insert into public.activity_logs (user_id, action, entity_type, entity_id, metadata)
  values (p_user_id, p_action, p_entity_type, p_entity_id, p_metadata);
end;
$$;

-- ---------------------------------------------------------------------------
-- Dashboard statistics (admin check enforced by the API layer)
-- ---------------------------------------------------------------------------
create or replace function public.dashboard_stats()
returns table (
  total_images bigint,
  published_images bigint,
  draft_images bigint,
  featured_images bigint,
  categories bigint,
  tags bigint,
  authors bigint,
  albums bigint,
  total_views bigint
)
language plpgsql
stable
set search_path = public
as $$
begin
  return query
  select
    (select count(*) from public.images),
    (select count(*) from public.images where is_published),
    (select count(*) from public.images where not is_published),
    (select count(*) from public.images where is_featured and is_published),
    (select count(*) from public.categories),
    (select count(*) from public.tags),
    (select count(*) from public.authors),
    (select count(*) from public.albums),
    coalesce((select sum(view_count) from public.images), 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists images_updated_at on public.images;
create trigger images_updated_at before update on public.images
  for each row execute function public.handle_updated_at();

drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at before update on public.categories
  for each row execute function public.handle_updated_at();

drop trigger if exists tags_updated_at on public.tags;
create trigger tags_updated_at before update on public.tags
  for each row execute function public.handle_updated_at();

drop trigger if exists authors_updated_at on public.authors;
create trigger authors_updated_at before update on public.authors
  for each row execute function public.handle_updated_at();

drop trigger if exists albums_updated_at on public.albums;
create trigger albums_updated_at before update on public.albums
  for each row execute function public.handle_updated_at();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

drop trigger if exists settings_updated_at on public.settings;
create trigger settings_updated_at before update on public.settings
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Default settings row
-- ---------------------------------------------------------------------------
insert into public.settings (site_title, site_description, default_layout, images_per_page, allow_download)
select 'Personal Gallery', '', 'grid', 20, false
where not exists (select 1 from public.settings);

-- ---------------------------------------------------------------------------
-- (RECOMMENDED, optional) Dedicated application role
--   Avoids using avnadmin for day-to-day queries. Uncomment and set a strong
--   password, then point DATABASE_URL at it:
--   postgres://gallery_app:<password>@<host>:<port>/defaultdb?sslmode=require
-- ---------------------------------------------------------------------------
-- create role gallery_app login password 'CHANGE_ME_strong_password';
-- grant usage on schema public to gallery_app;
-- grant select, insert, update, delete on all tables in schema public to gallery_app;
-- grant usage, select on all sequences in schema public to gallery_app;
-- alter default privileges in schema public
--   grant select, insert, update, delete on tables to gallery_app;
-- alter default privileges in schema public
--   grant usage, select on sequences to gallery_app;
-- grant execute on all functions in schema public to gallery_app;
