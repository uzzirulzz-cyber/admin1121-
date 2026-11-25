import { NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { requireAdmin, unauthorized } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/** Publish every imported Spotify track that is still a draft. */
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const db = await getDb();
  const result = await db.product.updateMany({
    where: { source: "spotify", published: false },
    data: { published: true },
  });
  return NextResponse.json({ published: result.count });
}
