/**
 * Spotify Web API integration — server-side helpers.
 *
 * Uses the Authorization Code + PKCE flow (no client secret required):
 *  1. /api/spotify/connect    → redirects the admin to Spotify with a code_challenge (S256)
 *  2. /api/spotify/callback   → validates state, exchanges code + code_verifier for tokens
 *  3. tokens are stored in the SpotifyAccount table and refreshed when expired
 *
 * The client ID is read from the Setting table (spotify_client_id, editable in the
 * admin UI) with SPOTIFY_CLIENT_ID env var as a fallback, so it can be configured
 * from the dashboard without touching the CLI.
 *
 * All crypto uses Web Crypto (crypto.subtle) so the same code runs on
 * Cloudflare Workers and in Node during local development.
 */
import { getDb } from "./db-server";
import { slugify } from "./format";

export const SPOTIFY_CLIENT_ID_KEY = "spotify_client_id";
export const SPOTIFY_OAUTH_COOKIE = "pb_spotify_oauth";

export const SPOTIFY_SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-library-read",
  "playlist-read-private",
].join(" ");

/** Hard caps so one import can never run away (Spotify paginates at 50/page). */
export const IMPORT_LIMITS = {
  maxSavedTracks: 2000,
  maxPlaylists: 50,
  maxTracksPerPlaylist: 500,
  maxPages: 80,
};

const API_BASE = "https://api.spotify.com/v1";
const AUTH_BASE = "https://accounts.spotify.com";

export interface SpotifyAccountRow {
  id: string;
  displayName: string | null;
  email: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  scope: string | null;
  importedCount: number;
  connectedAt: Date;
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

/** Derive the public origin (scheme + host) of the incoming request. */
export function originFromRequest(req: Request): string {
  const h = req.headers;
  const xfHost = h.get("x-forwarded-host");
  const host =
    (xfHost ? xfHost.split(",")[0].trim() : null) ?? h.get("host") ?? "localhost:3000";
  const xfProto = h.get("x-forwarded-proto");
  const proto =
    (xfProto ? xfProto.split(",")[0].trim() : null) ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

export function redirectUriFor(req: Request): string {
  return `${originFromRequest(req)}/api/spotify/callback`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// PKCE helpers (RFC 7636, method S256)
// ---------------------------------------------------------------------------

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32); // 43-char base64url string
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export function generateState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export async function codeChallengeS256(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

// ---------------------------------------------------------------------------
// Client ID resolution
// ---------------------------------------------------------------------------

export async function getSpotifyClientId(): Promise<string | null> {
  const db = await getDb();
  const row = await db.setting.findUnique({ where: { key: SPOTIFY_CLIENT_ID_KEY } });
  const fromDb = row?.value?.trim();
  if (fromDb) return fromDb;
  // Env fallback (works in Node; on Workers OpenNext maps env vars to process.env).
  const fromEnv =
    typeof process !== "undefined" ? process.env?.SPOTIFY_CLIENT_ID?.trim() : undefined;
  return fromEnv || null;
}

// ---------------------------------------------------------------------------
// Token handling
// ---------------------------------------------------------------------------

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope?: string;
  expires_in: number;
  refresh_token?: string;
}

export class SpotifyReconnectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpotifyReconnectError";
  }
}

async function tokenRequest(params: URLSearchParams): Promise<SpotifyTokenResponse> {
  const res = await fetch(`${AUTH_BASE}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let detail = text;
    try {
      detail = (JSON.parse(text) as { error_description?: string }).error_description ?? text;
    } catch {
      // keep raw text
    }
    throw new Error(`Spotify token endpoint error (${res.status}): ${detail.slice(0, 300)}`);
  }
  return (await res.json()) as SpotifyTokenResponse;
}

export async function exchangeCodeForTokens(
  code: string,
  verifier: string,
  clientId: string,
  redirectUri: string
): Promise<SpotifyTokenResponse> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier,
    })
  );
}

export async function getSpotifyAccount(): Promise<SpotifyAccountRow | null> {
  const db = await getDb();
  const rows = await db.spotifyAccount.findMany({ orderBy: { connectedAt: "desc" }, take: 1 });
  return rows[0] ?? null;
}

/** Return a valid access token, refreshing it via the refresh_token grant if needed. */
export async function ensureFreshAccessToken(account: SpotifyAccountRow): Promise<string> {
  if (account.expiresAt.getTime() > Date.now() + 60_000) return account.accessToken;
  if (!account.refreshToken) {
    throw new SpotifyReconnectError(
      "Spotify session expired and no refresh token is stored. Please reconnect your account."
    );
  }
  const clientId = await getSpotifyClientId();
  if (!clientId) throw new SpotifyReconnectError("Spotify client ID is not configured.");

  const data = await tokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: account.refreshToken,
      client_id: clientId,
    })
  );

  const db = await getDb();
  await db.spotifyAccount.update({
    where: { id: account.id },
    data: {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      // Spotify may or may not rotate the refresh token.
      ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
    },
  });
  return data.access_token;
}

interface SpotifyMe {
  id: string;
  display_name?: string | null;
  email?: string | null;
}

export async function fetchSpotifyMe(accessToken: string): Promise<SpotifyMe> {
  return spotifyFetch<SpotifyMe>("/me", accessToken);
}

// ---------------------------------------------------------------------------
// API fetch with rate-limit handling (429 → wait Retry-After, up to 3 retries)
// ---------------------------------------------------------------------------

async function spotifyFetch<T>(path: string, accessToken: string): Promise<T> {
  let attempt = 0;
  for (;;) {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 429 && attempt < 3) {
      const retryAfter = Number(res.headers.get("Retry-After") ?? "1");
      await sleep(Math.min(Math.max(retryAfter, 1), 10) * 1000 + 150);
      attempt += 1;
      continue;
    }
    if (res.status === 401) {
      throw new SpotifyReconnectError("Spotify rejected the access token (401). Reconnect your account.");
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Spotify API error ${res.status} on ${path}: ${body.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }
}

// ---------------------------------------------------------------------------
// Library import
// ---------------------------------------------------------------------------

interface SpotifyTrack {
  id: string | null;
  uri: string;
  name: string;
  duration_ms: number;
  preview_url: string | null;
  type?: string;
  is_local?: boolean;
  artists?: { name: string }[];
  album?: { name?: string; images?: { url: string; width: number | null }[] };
}

interface Paged<T> {
  items: T[];
  next: string | null;
  total: number;
}

interface PlaylistSummary {
  id: string;
  name: string;
}

async function fetchTracksPaged(
  startPath: string,
  accessToken: string,
  maxTracks: number
): Promise<{ tracks: SpotifyTrack[]; scanned: number }> {
  const tracks: SpotifyTrack[] = [];
  let path: string | null = startPath;
  let scanned = 0;
  let pages = 0;
  while (path && tracks.length < maxTracks && pages < IMPORT_LIMITS.maxPages) {
    const page = await spotifyFetch<Paged<{ track: SpotifyTrack | null } | SpotifyTrack>>(
      path,
      accessToken
    );
    for (const item of page.items) {
      // Saved tracks are the track itself; playlist items wrap it in { track }.
      const t = "track" in item ? item.track : (item as SpotifyTrack);
      scanned += 1;
      if (!t || !t.id || t.is_local) continue;
      if (t.type && t.type !== "track") continue;
      if (tracks.length >= maxTracks) break;
      tracks.push(t);
    }
    pages += 1;
    path = page.next ? page.next.replace(API_BASE, "") : null;
    await sleep(120); // stay friendly to rate limits
  }
  return { tracks, scanned };
}

async function uniqueSlugFor(title: string, spotifyId: string): Promise<string> {
  const db = await getDb();
  const base = slugify(title) || `spotify-${spotifyId.slice(-8).toLowerCase()}`;
  if (!(await db.product.findUnique({ where: { slug: base } }))) return base;
  const candidate = `${base}-${spotifyId.slice(-6).toLowerCase()}`;
  if (!(await db.product.findUnique({ where: { slug: candidate } }))) return candidate;
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Insert or refresh one Spotify track as a Product. Returns "imported" | "updated". */
async function upsertTrackProduct(
  track: SpotifyTrack
): Promise<"imported" | "updated" | "skipped"> {
  const db = await getDb();
  const artistNames = (track.artists ?? []).map((a) => a.name);
  const producer = artistNames[0] ?? "Unknown Artist";
  const coverUrl =
    track.album?.images?.slice().sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null;
  const audioUrl = track.preview_url ?? null;

  const existing = await db.product.findUnique({ where: { spotifyId: track.id! } });
  if (existing) {
    await db.product.update({
      where: { id: existing.id },
      data: {
        title: track.name,
        producer,
        coverUrl,
        audioUrl,
        durationMs: track.duration_ms,
        spotifyUri: track.uri,
      },
    });
    return "updated";
  }

  const slug = await uniqueSlugFor(track.name, track.id!);
  await db.product.create({
    data: {
      slug,
      title: track.name,
      producer,
      description: `Imported from Spotify — ${artistNames.join(", ") || "Unknown Artist"} · Album: ${
        track.album?.name ?? "Single"
      }`,
      coverUrl,
      audioUrl,
      durationMs: track.duration_ms,
      source: "spotify",
      spotifyId: track.id!,
      spotifyUri: track.uri,
      // Imported tracks land as drafts; the admin reviews and publishes them.
      published: false,
    },
  });
  return "imported";
}

export interface ImportSummary {
  imported: number;
  updated: number;
  skipped: number;
  savedTracksScanned: number;
  playlistsScanned: number;
  elapsedMs: number;
}

let importInProgress = false;

export async function importSpotifyLibrary(includePlaylists: boolean): Promise<ImportSummary> {
  if (importInProgress) {
    throw new Error("An import is already running. Please wait for it to finish.");
  }
  importInProgress = true;
  const startedAt = Date.now();
  try {
    const account = await getSpotifyAccount();
    if (!account) throw new Error("No Spotify account is connected.");
    const accessToken = await ensureFreshAccessToken(account);

    const summary: ImportSummary = {
      imported: 0,
      updated: 0,
      skipped: 0,
      savedTracksScanned: 0,
      playlistsScanned: 0,
      elapsedMs: 0,
    };

    // 1) Saved tracks — the actual user library.
    const saved = await fetchTracksPaged(
      "/me/tracks?limit=50&offset=0",
      accessToken,
      IMPORT_LIMITS.maxSavedTracks
    );
    summary.savedTracksScanned = saved.scanned;
    for (const track of saved.tracks) {
      try {
        const r = await upsertTrackProduct(track);
        if (r === "imported") summary.imported += 1;
        else if (r === "updated") summary.updated += 1;
      } catch {
        summary.skipped += 1;
      }
    }

    // 2) Optionally walk playlists and import their tracks too.
    if (includePlaylists) {
      const plPage = await spotifyFetch<Paged<PlaylistSummary>>(
        "/me/playlists?limit=50&offset=0",
        accessToken
      );
      const playlists = plPage.items.slice(0, IMPORT_LIMITS.maxPlaylists);
      for (const pl of playlists) {
        if (!pl?.id) continue;
        summary.playlistsScanned += 1;
        const owned = await fetchTracksPaged(
          `/playlists/${pl.id}/tracks?limit=50&offset=0`,
          accessToken,
          IMPORT_LIMITS.maxTracksPerPlaylist
        );
        for (const track of owned.tracks) {
          try {
            const r = await upsertTrackProduct(track);
            if (r === "imported") summary.imported += 1;
            else if (r === "updated") summary.updated += 1;
          } catch {
            summary.skipped += 1;
          }
        }
        await sleep(120);
      }
    }

    const db = await getDb();
    summary.elapsedMs = Date.now() - startedAt;

    const totalImported = await db.product.count({ where: { source: "spotify" } });
    if (account) {
      await db.spotifyAccount.update({
        where: { id: account.id },
        data: { importedCount: totalImported },
      });
    }
    return summary;
  } finally {
    importInProgress = false;
  }
}
