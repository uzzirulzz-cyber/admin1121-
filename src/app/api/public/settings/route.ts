import { NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  const rows = await db.setting.findMany({
    where: { key: { in: ["store_name", "payment_instructions", "contact_email"] } },
  });
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;
  return NextResponse.json({ settings });
}
