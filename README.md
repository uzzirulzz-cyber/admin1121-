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
prisma/schema.prisma        data model (AdminUser, Session, Product, Order, Asset, Setting)
prisma/seed.ts              demo data seeder (bun prisma/seed.ts)
src/app/api/                public endpoints (catalog, checkout, files) + admin endpoints
src/components/storefront/  storefront UI
src/components/admin/       admin UI
src/lib/db-server.ts        DB entry point (SQLite in dev, D1 on Workers)
src/lib/storage.ts          uploads: local fs (dev) / R2 binding or D1 assets (prod)
scripts/                    demo audio + cover art generators
wrangler.jsonc              Cloudflare Workers config (fill in the D1 database_id)
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

1. Create a D1 database: `wrangler d1 create playbeat-admin-db` and paste the returned
   `database_id` into `wrangler.jsonc`.
2. Push the schema: generate SQL with
   `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`
   then `wrangler d1 execute playbeat-admin-db --remote --file <script.sql>`.
3. Seed the admin user + settings (SQL inserts, see the deploy script in `scripts/`).
4. Build & deploy:
   ```bash
   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... bunx opennextjs-cloudflare build
   CLOUDFLARE_API_TOKEN=... bunx wrangler deploy
   ```
   The deploy workspace switches `src/lib/env-flag.ts` to `WORKERS_DEPLOY = true` and
   regenerates the Prisma client with `engineType = "client"` (engine-free, Workers-safe).
5. Custom domain: `manage.playbeat.digital` is declared as a Workers custom domain — the
   zone must live in the same Cloudflare account.

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
