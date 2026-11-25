import { NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { requireAdmin, unauthorized } from "@/lib/auth-server";
import type { OrderItem } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const db = await getDb();

  const orders = await db.order.findMany({ orderBy: { createdAt: "desc" } });
  const map = new Map<
    string,
    { name: string; email: string; ordersCount: number; spentCents: number; lastOrderAt: string }
  >();

  for (const o of orders) {
    const entry =
      map.get(o.customerEmail) ??
      { name: o.customerName, email: o.customerEmail, ordersCount: 0, spentCents: 0, lastOrderAt: "" };
    entry.ordersCount += 1;
    if (o.status === "paid" || o.status === "fulfilled") entry.spentCents += o.totalCents;
    const iso = new Date(o.createdAt).toISOString();
    if (!entry.lastOrderAt || iso > entry.lastOrderAt) entry.lastOrderAt = iso;
    if (!entry.name && o.customerName) entry.name = o.customerName;
    map.set(o.customerEmail, entry);
  }

  const customers = Array.from(map.values()).sort((a, b) => b.spentCents - a.spentCents);
  return NextResponse.json({ customers });
}
