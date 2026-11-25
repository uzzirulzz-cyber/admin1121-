import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/lib/auth-server";
import { SpotifyReconnectError, importSpotifyLibrary } from "@/lib/spotify";

export const dynamic = "force-dynamic";

/**
 * Import the connected account's full music library (saved tracks, optionally
 * all playlist tracks) into the catalog as draft products. Can take up to a
 * couple of minutes for very large libraries.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  let body: { includePlaylists?: boolean } = {};
  try {
    body = (await req.json()) as { includePlaylists?: boolean };
  } catch {
    body = {};
  }

  try {
    const summary = await importSpotifyLibrary(Boolean(body.includePlaylists));
    return NextResponse.json({ summary });
  } catch (err) {
    if (err instanceof SpotifyReconnectError) {
      return NextResponse.json({ error: err.message, reconnect: true }, { status: 409 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 }
    );
  }
}
