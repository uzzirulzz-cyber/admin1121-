import { NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { requireAdmin, unauthorized } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/** Disconnect the Spotify account (removes stored tokens). Imported tracks stay. */
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const db = await getDb();
  await db.spotifyAccount.deleteMany({});
  return NextResponse.json({ connected: false });
}
