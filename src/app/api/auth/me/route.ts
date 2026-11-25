import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ user: null });
  return NextResponse.json({ user: admin });
}
