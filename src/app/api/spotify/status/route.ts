import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/auth-server";
import { getSpotifyAccount, getSpotifyClientId, redirectUriFor } from "@/lib/spotify";

export const dynamic = "force-dynamic";

/** Connection status for the admin Spotify page. */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const clientId = await getSpotifyClientId();
  const account = await getSpotifyAccount();

  return NextResponse.json({
    connected: Boolean(account),
    account: account
      ? {
          displayName: account.displayName,
          email: account.email,
          importedCount: account.importedCount,
          connectedAt: account.connectedAt,
          scope: account.scope,
        }
      : null,
    clientId: clientId ?? null,
    redirectUri: redirectUriFor(req),
  });
}
