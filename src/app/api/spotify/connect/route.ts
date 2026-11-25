import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { WORKERS_DEPLOY } from "@/lib/env-flag";
import {
  SPOTIFY_OAUTH_COOKIE,
  SPOTIFY_SCOPES,
  codeChallengeS256,
  generateCodeVerifier,
  generateState,
  getSpotifyClientId,
  originFromRequest,
  redirectUriFor,
} from "@/lib/spotify";

export const dynamic = "force-dynamic";

/**
 * Step 1 of the PKCE flow: redirect the admin to Spotify's authorize page.
 * A code_verifier + state are generated server-side and stored in a
 * short-lived httpOnly cookie (the server-side equivalent of localStorage in
 * Spotify's docs — safer because it is not readable by page scripts).
 */
export async function GET(req: NextRequest) {
  const origin = originFromRequest(req);
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.redirect(`${origin}/#/admin`);
  }

  const clientId = await getSpotifyClientId();
  if (!clientId) {
    return NextResponse.redirect(
      `${origin}/#/admin/spotify?error=${encodeURIComponent(
        "Spotify client ID is not configured yet. Save it on this page first."
      )}`
    );
  }

  const verifier = generateCodeVerifier();
  const challenge = await codeChallengeS256(verifier);
  const state = generateState();
  const redirectUri = redirectUriFor(req);

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SPOTIFY_SCOPES,
    code_challenge_method: "S256",
    code_challenge: challenge,
    redirect_uri: redirectUri,
    state,
  }).toString();

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set(SPOTIFY_OAUTH_COOKIE, JSON.stringify({ state, verifier, redirectUri }), {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: WORKERS_DEPLOY,
    path: "/",
    maxAge: 600,
  });
  return res;
}
