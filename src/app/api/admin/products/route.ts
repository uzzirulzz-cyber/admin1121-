import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db-server";
import { requireAdmin, unauthorized } from "@/lib/auth-server";
import { slugify } from "@/lib/format";

export const dynamic = "force-dynamic";

const productSchema = z.object({
  title: z.string().min(1).max(120),
  producer: z.string().max(80).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  genre: z.string().max(60).optional().nullable(),
  bpm: z.number().int().min(20).max(300).optional().nullable(),
  musicalKey: z.string().max(20).optional().nullable(),
  tags: z.string().max(300).optional().nullable(),
  coverUrl: z.string().max(500).optional().nullable(),
  audioUrl: z.string().max(500).optional().nullable(),
  priceLeaseCents: z.number().int().min(0).max(10_000_000),
  priceExclusiveCents: z.number().int().min(0).max(100_000_000),
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const db = await getDb();
  const products = await db.product.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const db = await getDb();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }
  const data = parsed.data;

  let slug = slugify(data.title);
  const exists = await db.product.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const product = await db.product.create({
    data: { ...data, slug, producer: data.producer || "PlayBeat" },
  });
  return NextResponse.json({ product });
}
