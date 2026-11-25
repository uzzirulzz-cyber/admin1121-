import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { requireAdmin, unauthorized } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

const EDITABLE_KEYS = ["store_name", "payment_instructions", "contact_email", "currency"];

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const db = await getDb();
  const rows = await db.setting.findMany();
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const db = await getDb();

  let body: { settings?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const incoming = body.settings ?? {};
  for (const [key, value] of Object.entries(incoming)) {
    if (!EDITABLE_KEYS.includes(key)) continue;
    await db.setting.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    });
  }
  const rows = await db.setting.findMany();
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;
  return NextResponse.json({ settings });
}
