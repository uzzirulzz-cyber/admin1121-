import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { requireAdmin, unauthorized } from "@/lib/auth-server";
import { SPOTIFY_CLIENT_ID_KEY } from "@/lib/spotify";

export const dynamic = "force-dynamic";

/**
 * Save (or clear, when sent empty) the Spotify application client ID used for
 * the PKCE connect flow. PKCE needs no client secret.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  let body: { clientId?: string };
  try {
    body = (await req.json()) as { clientId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const clientId = (body.clientId ?? "").trim();
  const db = await getDb();

  if (!clientId) {
    await db.setting.deleteMany({ where: { key: SPOTIFY_CLIENT_ID_KEY } });
    return NextResponse.json({ clientId: null });
  }

  if (!/^[0-9a-f]{20,40}$/i.test(clientId)) {
    return NextResponse.json(
      { error: "That does not look like a Spotify Client ID (hex string from the developer dashboard)." },
      { status: 400 }
    );
  }

  await db.setting.upsert({
    where: { key: SPOTIFY_CLIENT_ID_KEY },
    create: { key: SPOTIFY_CLIENT_ID_KEY, value: clientId },
    update: { value: clientId },
  });
  return NextResponse.json({ clientId });
}
