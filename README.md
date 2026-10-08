# Personal Image Gallery

A production-ready personal image gallery CMS built with **React**, **Tailwind CSS**, **Supabase** (PostgreSQL + Auth + Row Level Security) and **Cloudinary** (image storage/CDN), deployed on **Vercel**.

```
Cloudinary → image files (binary)
Supabase   → image metadata, users, categories, tags, authors, albums
```

> **No mock data.** This app uses real integrations only. Until you add your
> Supabase/Cloudinary keys it renders honest "backend not configured" screens.

---

## 1. Requirements

- **Node.js ≥ 20** (LTS recommended)
- A **Supabase** project (free tier is fine)
- A **Cloudinary** account (free tier is fine)
- A **Vercel** account (free tier is fine)

Verify: `node --version`

---

## 2. Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy the environment template and fill it in (see §3)
cp .env.example .env

# 3. Start the app (Vite on :5173 + local API on :3001)
npm run dev
```

Open http://localhost:5173

> ⚠ Without credentials the UI shows configuration notices. Complete §4
> (Supabase) and §5 (Cloudinary) and it becomes fully functional.

---

## 3. Environment variables

Copy `.env.example` → `.env`. Two groups:

| Variable | Where | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Browser | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Browser | Public anon key (safe) |
| `VITE_CLOUDINARY_CLOUD_NAME` | Browser | Cloudinary cloud name (safe) |
| `VITE_CLOUDINARY_UPLOAD_FOLDER` | Browser | Folder for uploads (default `personal-gallery`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Never expose to the browser |
| `CLOUDINARY_API_KEY` | Server only | Never expose to the browser |
| `CLOUDINARY_API_SECRET` | Server only | Never expose to the browser |
| `ADMIN_EMAILS` | Server only | Used by `npm run create-admin` |
| `PORT` | Server only | Local API port (default 3001) |

`.env` is git-ignored. **Never commit secrets.** The browser bundle only ever
contains `VITE_*` values — the service-role key and Cloudinary API secret are
used exclusively by the serverless functions under `api/`.

---

## 4. Supabase setup

### 4.1 Create the project

1. Go to https://supabase.com → **New project** → pick a region → create.
2. In **Project Settings → API**, copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (secret — keep server-side)

### 4.2 Apply the schema

Open **SQL Editor** and run these files **in order** (each is idempotent):

| File | Contents |
|---|---|
| `supabase/migrations/0001_initial_schema.sql` | Tables, indexes, functions (search/list/stats), RLS policies, triggers |
| `supabase/migrations/0002_taxonomy_list.sql` | Taxonomy listing function (counts + covers) |

Alternative (CLI): `supabase db push` with the `supabase/` folder linked.

### 4.3 What the schema creates

Tables: `profiles`, `settings`, `categories`, `tags`, `authors`, `albums`,
`images` (metadata only — **no binaries**), `image_tags`, `image_views`,
`activity_logs`.

Key points:

- **Search / filters / sort / pagination** all happen in PostgreSQL via the
  `list_images(jsonb)` function — never by downloading the whole table
  (spec §19, §20, §22, §53).
- `record_image_view(uuid, text)` increments views **once per session** per
  image (deduped via the `image_views` table).
- A `profiles` row is auto-created on signup; only an **admin** may change roles.
- `dashboard_stats()` and `log_activity()` are admin-only.
- Unique indexes guarantee unique public slugs.

### 4.4 Row Level Security (RLS)

RLS is enabled on every table. The policies are the **real** security
boundary — the React route guard is UX only.

| Actor | Can do |
|---|---|
| Anonymous | SELECT published images only; search/filter/sort; record a view |
| Signed-in user | Same as anonymous (plus own profile) |
| Admin | Full CRUD on images, categories, tags, authors, albums, settings; activity log; dashboard stats |

Authorization is enforced by the `public.is_admin()` helper, which resolves
the role from the **database** — a role value sent by the browser is never
trusted (spec §34, §64).

### 4.5 Create the admin user

Set `ADMIN_EMAILS` (optional, used only by the script), then:

```bash
npm run create-admin -- you@example.com "AStrongPass!123"
```

This creates the auth user (email confirmed) and promotes the matching
`profiles` row to `role = 'admin'`. Sign in at `/admin/login`.

> Only the `service_role` key can do this — keep it server-side.

---

## 5. Cloudinary setup

### 5.1 Create the account & get keys

1. Sign up at https://cloudinary.com.
2. **Dashboard → Account details**: copy
   - **Cloud name** → `VITE_CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET` (secret — server-side only)

### 5.2 Upload architecture (signed — secure)

This project uses **signed uploads** (your choice):

1. The admin browser asks `POST /api/cloudinary/sign` for a signature.
2. The serverless function verifies the admin's Supabase JWT, then signs the
   upload parameters with the API secret (the secret never leaves the server).
3. The browser uploads the file **directly** to Cloudinary with those signed
   parameters — no file ever passes through our server.
4. Cloudinary returns the asset metadata → the app saves metadata to Supabase.

Deletes and replaces go through `POST /api/cloudinary/delete`, also
admin-verified server-side. The old asset is only deleted **after** the new
one is confirmed (spec §27).

You do **not** need an upload preset for signed uploads. (If you ever switch
to unsigned uploads, you would create a preset in **Settings → Upload** with
unsigned mode and set `VITE_CLOUDINARY_UPLOAD_PRESET` — this project's signed
flow doesn't require it.)

### 5.3 Test the upload

1. Start the app with env vars set.
2. Sign in at `/admin/login`.
3. Open **Upload Image**, drop a JPEG/PNG/WebP/AVIF/GIF (≤ 15 MB), fill title +
   category, click **Upload**.
4. The image appears in the gallery.

---

## 6. Local development

```bash
npm run dev        # Vite (5173) + API (3001), Vite proxies /api → 3001
npm run dev:web    # frontend only
npm run dev:api    # API only
npm run lint       # ESLint
npm run build      # production build into dist/
npm run preview    # serve the production build
```

The local API (`server/index.js`) mounts the **exact same handlers** Vercel
runs as serverless functions, so dev and production behave identically.

---

## 7. Production build & Vercel deployment

### 7.1 Local build

```bash
npm run build
```

### 7.2 Deploy to Vercel

1. Push the repo to GitHub.
2. In Vercel: **Add New Project → Import** the repo.
3. Framework preset: **Vite** (auto-detected). Build command `npm run build`,
   output `dist/`.
4. Add all environment variables from `.env.example` (both `VITE_*` and
   server-side ones) in **Project → Settings → Environment Variables**.
   - `VITE_*` are injected into the client at build time.
   - Server-side variables are only available to the `api/` functions.
5. Deploy. `vercel.json` maps `/api/*` to the functions and everything else
   to the SPA (`index.html`).

### 7.3 Post-deploy checks

- [ ] Public pages render (no draft images leak)
- [ ] `/admin/login` works with your admin account
- [ ] Upload, edit, replace, delete work end-to-end
- [ ] Search, filters, pagination, lightbox work

---

## 8. Security notes

- Secrets never reach the browser (only `VITE_*` are compiled in).
- RLS enforces "published-only" for the public and "admin-only" for writes at
  the database level.
- Uploads are signed server-side; the API secret stays in serverless code.
- File type + size validated (JPEG/PNG/WebP/AVIF/GIF, ≤ 15 MB).
- All forms validated with Zod; destructive actions require confirmation.
- View counts can only be incremented via `record_image_view` — never set by
  the client.
- Users cannot self-promote; admins cannot be self-downgraded.

---

## 9. Project structure

```
api/                    Vercel serverless functions (signed Cloudinary ops)
  cloudinary/           sign.js, delete.js
  _lib/                 auth (JWT admin check), supabase (service role), cloudinary, http helpers
server/index.js         Local Express API (same handlers as Vercel)
supabase/migrations/    SQL schema + RLS (run in order)
scripts/                create-admin.mjs, smoke.mjs, test-db.sql
src/
  components/           ui, layout, gallery, filters, forms, admin, taxonomy
  contexts/             Auth, Theme, Toast
  hooks/                useImages, useDebounce, useDocumentTitle
  lib/                  env, supabase client, cloudinary URL builder
  pages/                public pages + admin pages
  routes/               ProtectedRoute (UX guard)
  schemas/              Zod schemas
  services/             auth, image, category, tag, author, album, settings, cloudinary, activity
  utils/                slugify, format, constants
```

## 10. Troubleshooting

| Symptom | Fix |
|---|---|
| "Backend not configured" banner | Fill `.env` and restart `npm run dev` |
| Admin login fails | Confirm the user exists and `profiles.role = 'admin'` (run `create-admin` again) |
| Upload returns 503 | Check `CLOUDINARY_API_KEY`/`SECRET` are set **on the server**, not just `VITE_` |
| Upload fails validation | Use JPEG/PNG/WebP/AVIF/GIF ≤ 15 MB |
| Drafts visible publicly | Re-check RLS policies were applied (run both migrations) |
| Cloudinary delete fails | Retry — the app reports the failure and lets you reconcile |
