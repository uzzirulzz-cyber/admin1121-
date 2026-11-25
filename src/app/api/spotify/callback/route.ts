import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { requireAdmin } from "@/lib/auth-server";
import {
  SPOTIFY_OAUTH_COOKIE,
  exchangeCodeForTokens,
  fetchSpotifyMe,
  getSpotifyClientId,
  originFromRequest,
} from "@/lib/spotify";

export const dynamic = "force-dynamic";

interface OAuthCookiePayload {
  state: string;
  verifier: string;
  redirectUri: string;
}

/**
 * Step 2 of the PKCE flow: Spotify redirects back here with ?code=...&state=...
 * (or ?error=...). We validate the state against the cookie, exchange the code
 * for tokens using the stored code_verifier, fetch the profile and persist the
 * connection. The browser is then sent back to the admin Spotify page.
 */
export async function GET(req: NextRequest) {
  const origin = originFromRequest(req);
  const backWithError = (message: string) =>
    NextResponse.redirect(
      `${origin}/#/admin/spotify?error=${encodeURIComponent(message.slice(0, 200))}`
    );

  const admin = await requireAdmin();
  if (!admin) {
    return backWithError("Admin sign-in required to finish the Spotify connection.");
  }

  const params = req.nextUrl.searchParams;
  const rawCookie = req.cookies.get(SPOTIFY_OAUTH_COOKIE)?.value;

  const clearCookie = (res: NextResponse) => {
    res.cookies.set(SPOTIFY_OAUTH_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  };

  // Spotify reports user denial / app errors via ?error=...
  const spotifyError = params.get("error");
  if (spotifyError) {
    return clearCookie(
      backWithError(
        spotifyError === "access_denied"
          ? "Authorization was denied in Spotify. Nothing was connected."
          : `Spotify authorization failed: ${spotifyError}`
      )
    );
  }

  if (!rawCookie) {
    return backWithError("Connect session expired (no OAuth cookie). Please click Connect again.");
  }

  let oauth: OAuthCookiePayload;
  try {
    oauth = JSON.parse(rawCookie) as OAuthCookiePayload;
  } catch {
    return clearCookie(backWithError("Corrupted OAuth cookie. Please click Connect again."));
  }

  // CSRF protection: state must match what we sent (per Spotify docs).
  if (!oauth.state || params.get("state") !== oauth.state) {
    return clearCookie(
      backWithError("State mismatch between request and callback — connection aborted.")
    );
  }

  const code = params.get("code");
  if (!code) {
    return clearCookie(backWithError("No authorization code was returned by Spotify."));
  }

  const clientId = await getSpotifyClientId();
  if (!clientId) {
    return clearCookie(backWithError("Spotify client ID is no longer configured."));
  }

  try {
    const tokens = await exchangeCodeForTokens(code, oauth.verifier, clientId, oauth.redirectUri);
    const me = await fetchSpotifyMe(tokens.access_token);

    const db = await getDb();
    await db.spotifyAccount.upsert({
      where: { id: me.id },
      create: {
        id: me.id,
        displayName: me.display_name ?? null,
        email: me.email ?? null,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope ?? null,
      },
      update: {
        displayName: me.display_name ?? null,
        email: me.email ?? null,
        accessToken: tokens.access_token,
        // Spotify only sends a refresh token sometimes; keep the old one otherwise.
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope ?? null,
      },
    });

    const res = NextResponse.redirect(`${origin}/#/admin/spotify?connected=1`);
    return clearCookie(res);
  } catch (err) {
    return clearCookie(
      backWithError(err instanceof Error ? err.message : "Spotify token exchange failed.")
    );
  }
}
