# PlayBeat — Storefront + Admin Panel

A complete beats marketplace: public storefront for selling beat leases/exclusives and a
password-protected admin panel for catalog, orders, customers, users and store settings.

- **Live:** https://manage.playbeat.digital
- **Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Prisma
- **Databases:** SQLite (local dev) / Cloudflare D1 (production)
- **Payments:** manual (bank / e-wallet transfer), admin confirms each order
- **Currency:** USD

## Features

### Storefront (`#/`)
- Dark neon catalog with search, genre filter and sorting (newest, price, BPM)
- Built-in preview player with seek bar (sticky bottom bar)
- Beat detail dialog with lease vs. exclusive license picker
- Cart + checkout that creates a **pending** order and shows payment instructions
- Fully responsive

### Spotify import (`#/admin/spotify`)
- Connect a Spotify account with the **Authorization Code + PKCE** flow (no client secret
  needed — only the Client ID from the developer dashboard)
- **Import your entire music library**: up to 2,000 saved tracks, optionally tracks from up
  to 50 playlists (500 tracks each)
- Every track arrives as a draft with real cover art, artist, album description, duration
  and Spotify's 30-second preview (when available) — playable right in the storefront
- Re-imports refresh existing entries instead of duplicating (matched by Spotify track ID)
- One-click "publish all imported drafts"; prices default to $29.99 lease / $149 exclusive
  and stay editable per track in Products
- Client ID is saved from the admin UI (Setting `spotify_client_id`), with the
  `SPOTIFY_CLIENT_ID` env var as fallback; tokens are stored in the `SpotifyAccount` table
  and refreshed automatically

### Admin panel (`#/admin`)
- Email + password login (PBKDF2-hashed, httpOnly session cookie, 7-day expiry)
- Dashboard: revenue KPIs, 14-day revenue chart (Recharts), top products, recent orders
- Products: create/edit/delete, cover art + audio upload, publish/feature toggles
- Orders: search + status filter, status pipeline (pending → paid → fulfilled / refunded /
  cancelled), payment reference tracking
- Customers: aggregated per email with lifetime spend
- Admin users: add/remove admins, reset passwords
- Settings: store name, contact email, payment instructions shown at checkout

## Repository layout

```
prisma/schema.prisma        data model (AdminUser, Session, Product, Order, Asset, Setting, SpotifyAccount)
prisma/seed.ts              demo data seeder (bun prisma/seed.ts)
src/app/api/                public endpoints (catalog, checkout, files) + admin + Spotify endpoints
src/app/api/spotify/        PKCE connect/callback, status, import, publish-all, disconnect, settings
src/lib/spotify.ts          Spotify Web API client (PKCE, token refresh, paginated library import)
src/components/admin/       admin UI (incl. SpotifyView)
src/components/storefront/  storefront UI
src/lib/db-server.ts        DB entry point (SQLite in dev, D1 on Workers)
src/lib/storage.ts          uploads: local fs (dev) / R2 binding or D1 assets (prod)
scripts/d1_schema.sql       full D1 schema for fresh installs
scripts/d1_migration_002_spotify.sql  migration for the EXISTING production D1 (adds Spotify tables/columns)
scripts/sync-deploy.sh      sync source → deploy/ workspace and rebuild the worker (--build)
scripts/                    demo audio + cover art generators
wrangler.jsonc              Cloudflare Workers config (custom domain manage.playbeat.digital)
deploy/                     pre-built Cloudflare deploy workspace (own wrangler.jsonc with real database_id)
```

## Local development

```bash
bun install
bun run db:push        # create SQLite schema (file:./db/custom.db)
bun prisma/seed.ts     # seed admin + demo beats/orders
bun run dev            # http://localhost:3000
```

First admin account after seeding: `admin@playbeat.digital` / `PlayBeat2026!`
**Change this immediately in Admin users → Reset password.**

## Deploying to Cloudflare Workers

The `deploy/` workspace already contains a **built worker** (`.open-next/worker.js`) with the
real D1 database id in `deploy/wrangler.jsonc`, and `manage.playbeat.digital` is declared as
a Workers custom domain. Everything is prepared so a deploy is one command:

```bash
# 1. Apply the Spotify migration to the existing production D1 (only needed once):
CLOUDFLARE_API_TOKEN=... bunx wrangler d1 execute playbeat-admin-db --remote \
  --file scripts/d1_migration_002_spotify.sql

# 2. Deploy the worker (from the deploy workspace, with the built bundle):
cd deploy
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... bunx wrangler deploy
```

After the first login, deploy the updated code any time with:

```bash
bash scripts/sync-deploy.sh --build   # sync + patch + rebuild the worker bundle
cd deploy && CLOUDFLARE_API_TOKEN=... bunx wrangler deploy
```

Validate without deploying: `cd deploy && bunx wrangler deploy --dry-run`.

For a **fresh** Cloudflare environment instead: create the D1 database
(`wrangler d1 create playbeat-admin-db`), paste its `database_id` into `wrangler.jsonc`,
apply `scripts/d1_schema.sql`, generate + run the seed SQL (`bun scripts/gen_seed_sql.ts >
seed.sql`, then `wrangler d1 execute ... --file seed.sql --remote`), then build & deploy as
above.

The deploy workspace switches `src/lib/env-flag.ts` to `WORKERS_DEPLOY = true` and patches
the Prisma generator with `engineType = "client"` (engine-free, Workers-safe) —
`scripts/sync-deploy.sh` re-applies both after every sync.

## Spotify setup

1. In the admin panel open **Spotify import**. The page shows the exact **Redirect URI** for
   the current origin (`<origin>/api/spotify/callback`) — in production that is
   `https://manage.playbeat.digital/api/spotify/callback`.
2. Create an app at <https://developer.spotify.com/dashboard> (enable **Web API**), add the
   Redirect URI shown in the admin page, copy the **Client ID** into the admin page and save.
   No client secret is required (PKCE).
3. Click **Connect Spotify account**, approve the scopes (`user-read-private user-read-email
   user-library-read playlist-read-private`), then click **Import full library**.
4. Imported tracks appear in **Products** as unpublished drafts — review, set prices, then
   publish (individually or via *Publish all imported drafts*).

State/verifier travel in a short-lived httpOnly cookie (server-side equivalent of the
`localStorage` pattern in Spotify's docs). Tokens are stored server-side in D1/SQLite and
refreshed automatically; a 429 respects `Retry-After`.

## Storage notes

- Local dev: uploads are written to `public/uploads/` and served by `/api/files/[...key]`.
- Production: if an **R2 binding** named `MEDIA` exists it is used for all uploads.
  Without R2, files under 900 KB are stored in the D1 `Asset` table; larger files are
  rejected with a clear message. To enable full uploads: activate R2 in the Cloudflare
  Dashboard, create a bucket, and add `r2_buckets: [{ binding: "MEDIA", bucket_name: "..." }]`
  to `wrangler.jsonc`.

## Security notes

- Never commit `.env` (already git-ignored). Only `.env.example` is tracked.
- Rotate any API token that has ever been pasted into a chat or plaintext file.
