import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { requireAdmin, unauthorized } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const db = await getDb();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const q = searchParams.get("q")?.trim() ?? "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { customerName: { contains: q } },
      { customerEmail: { contains: q } },
      { orderNumber: { contains: q } },
    ];
  }

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ orders });
}
