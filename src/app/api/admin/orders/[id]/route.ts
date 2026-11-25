import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { requireAdmin, unauthorized } from "@/lib/auth-server";
import { ORDER_STATUSES } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const db = await getDb();
  const { id } = await params;

  let body: { status?: string; paymentRef?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: Record<string, string> = {};
  if (body.status) {
    if (!(ORDER_STATUSES as readonly string[]).includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = body.status;
  }
  if (typeof body.paymentRef === "string") data.paymentRef = body.paymentRef;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const order = await db.order.update({ where: { id }, data });
    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const db = await getDb();
  const { id } = await params;
  try {
    await db.order.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
}
