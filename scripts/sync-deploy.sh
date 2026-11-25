#!/usr/bin/env bash
# Sync the main project into the Cloudflare deploy workspace and rebuild it.
#
# Usage:  bash scripts/sync-deploy.sh [--build]
#
# The deploy/ workspace differs from the root project in two ways that are
# re-applied after every sync:
#   1. src/lib/env-flag.ts  → WORKERS_DEPLOY = true   (D1 + Workers runtime)
#   2. prisma/schema.prisma → generator engineType = "client" (engine-free Prisma)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY="$ROOT/deploy"

echo "==> Syncing source into deploy workspace..."
rsync -a --delete "$ROOT/src/" "$DEPLOY/src/"
rsync -a --delete "$ROOT/prisma/" "$DEPLOY/prisma/"
rsync -a --delete "$ROOT/scripts/" "$DEPLOY/scripts/"
cp "$ROOT/.env.example" "$DEPLOY/.env.example" 2>/dev/null || true
cp "$ROOT/eslint.config.mjs" "$DEPLOY/eslint.config.mjs" 2>/dev/null || true
cp "$ROOT/README.md" "$DEPLOY/README.md" 2>/dev/null || true

echo "==> Patching deploy workspace for Workers..."
# 1. WORKERS_DEPLOY flag
sed -i 's/export const WORKERS_DEPLOY = false;/export const WORKERS_DEPLOY = true;/' \
  "$DEPLOY/src/lib/env-flag.ts"
# 2. Engine-free Prisma client for Workers
sed -i 's/provider = "prisma-client-js"/provider  = "prisma-client-js"\n  engineType = "client"/' \
  "$DEPLOY/prisma/schema.prisma"

grep -q 'WORKERS_DEPLOY = true' "$DEPLOY/src/lib/env-flag.ts"
grep -q 'engineType = "client"' "$DEPLOY/prisma/schema.prisma"
echo "    env-flag → WORKERS_DEPLOY = true"
echo "    prisma   → engineType = client"

echo "==> Regenerating Prisma client..."
(cd "$DEPLOY" && bunx prisma generate)

if [[ "${1:-}" == "--build" ]]; then
  echo "==> Building OpenNext worker bundle..."
  (cd "$DEPLOY" && bunx opennextjs-cloudflare build)
  echo "==> Build complete. Deploy with:"
  echo "    cd deploy && CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... bunx wrangler deploy"
fi
