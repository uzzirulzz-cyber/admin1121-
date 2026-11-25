-- PlayBeat D1/SQLite migration 002 — Spotify integration
-- Apply to the EXISTING production database with:
--   wrangler d1 execute playbeat-admin-db --remote --file scripts/d1_migration_002_spotify.sql
-- (Fresh installs can run scripts/d1_schema.sql instead — it already contains everything.)

-- New catalog columns for imported tracks
ALTER TABLE "Product" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "Product" ADD COLUMN "spotifyId" TEXT;
ALTER TABLE "Product" ADD COLUMN "spotifyUri" TEXT;
ALTER TABLE "Product" ADD COLUMN "durationMs" INTEGER;
-- SQLite cannot add UNIQUE via ADD COLUMN, so use a named index (matches Prisma's naming)
CREATE UNIQUE INDEX "Product_spotifyId_key" ON "Product"("spotifyId");

-- Stored Spotify OAuth connection (Authorization Code + PKCE tokens)
CREATE TABLE "SpotifyAccount" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "displayName" TEXT,
  "email" TEXT,
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT,
  "expiresAt" DATETIME NOT NULL,
  "scope" TEXT,
  "importedCount" INTEGER NOT NULL DEFAULT 0,
  "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
