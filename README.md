# PlayBeat Admin Console (`playbeat-admin`)

Full-featured Argon Dashboard Admin Console & Storefront Bridge for **PlayBeat Digital**, deployed on Cloudflare Workers at **`admin.playbeat.digital`** and **`manage.playbeat.digital`**, directly linked to the live **`playbeat.digital`** storefront (`playbeat-digital`).

## Architecture: Admin ↔ Storefront Link

`worker/index.ts` links the Admin Console to the live storefront through two native Cloudflare bindings configured in `wrangler.jsonc`:

1. **Shared Cloudflare KV (`PLAYBEAT_KV` → `playbeat-digital-kv`)**
   - Reads and updates the live storefront catalog (`pb:catalog:v1`: `digitalProducts`, `businessServices`, `liveTvChannels`, `liveTvPlans`, `serviceInquiries`) while preserving the storefront schema.
   - Manages live orders & key fulfillment (`pb:orders:v1`), customer accounts (`pb:auth:u:*`), admin allowlist (`pb:admin:allowlist:v1`), CRM leads (`pb:crm:leads:v1`), and channel configs (`pb:adsense:config:v1`, `pb:meta:config:v1`, `pb:tiktok:config:v1`).
2. **Cloudflare Service Binding (`STOREFRONT` → `playbeat-digital`)**
   - Zero-latency Worker-to-Worker RPC for storefront health verification (`/api/admin/storefront/status`), shared `ADMIN_PASSWORD` verification (`/api/admin/login`), and real AdSense Management API v2 proxying (`/api/admin/adsense/analytics`).

## Local Development

```bash
npm install
npm run dev
```

Runs the Express API + Vite dev server on `http://localhost:3000`.

## Cloudflare Production Deployment

```bash
npm run build
npx wrangler deploy
```

### Worker Secrets (Set via `wrangler secret put`)

Never commit API keys, passwords, or OAuth client secrets to the repository. Configure them on the `playbeat-admin` Worker:

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put META_ACCESS_TOKEN
npx wrangler secret put META_WA_DATASET_ID
npx wrangler secret put META_WABA_ID
npx wrangler secret put GOOGLE_ADSENSE_CLIENT_ID
npx wrangler secret put GOOGLE_ADSENSE_CLIENT_SECRET
npx wrangler secret put TIKTOK_CLIENT_KEY
npx wrangler secret put TIKTOK_CLIENT_SECRET
npx wrangler secret put ELECTRONIC_FIRST_API_KEY
```

## Key Modules

- **Landing & Sign-In**: PlayBeat Digital orbital-dial login screen supporting Admin password, Customer account sign-in/registration, and password reset.
- **Argon Dashboard Console**: Overview KPIs, 5-domain AdSense analytics, live 6,500+ item Storefront Catalog & TV Channels/Plans manager, Order Fulfillment, WhatsApp/Meta CRM pipeline, Customer Accounts & Reset Codes, Channel Integrations (Google AdSense/Ads/GA4, Facebook/Instagram/Threads, TikTok), Electronic First Affiliate API, and a full Profile Customization Studio.
