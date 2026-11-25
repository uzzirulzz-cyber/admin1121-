import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db-server";
import { requireAdmin, unauthorized } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  producer: z.string().max(80).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  genre: z.string().max(60).optional().nullable(),
  bpm: z.number().int().min(20).max(300).optional().nullable(),
  musicalKey: z.string().max(20).optional().nullable(),
  tags: z.string().max(300).optional().nullable(),
  coverUrl: z.string().max(500).optional().nullable(),
  audioUrl: z.string().max(500).optional().nullable(),
  priceLeaseCents: z.number().int().min(0).max(10_000_000).optional(),
  priceExclusiveCents: z.number().int().min(0).max(100_000_000).optional(),
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const db = await getDb();
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }

  try {
    const product = await db.product.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
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
    await db.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
}
