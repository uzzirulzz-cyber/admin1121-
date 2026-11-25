import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = await getDb();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const genre = searchParams.get("genre")?.trim() ?? "";
  const sort = searchParams.get("sort") ?? "newest";

  const where: Record<string, unknown> = { published: true };
  if (genre) where.genre = genre;
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { genre: { contains: q } },
      { tags: { contains: q } },
      { description: { contains: q } },
    ];
  }

  let orderBy: Record<string, string> = { createdAt: "desc" };
  if (sort === "price-asc") orderBy = { priceLeaseCents: "asc" };
  else if (sort === "price-desc") orderBy = { priceLeaseCents: "desc" };
  else if (sort === "bpm") orderBy = { bpm: "asc" };

  const products = await db.product.findMany({
    where,
    orderBy,
    select: {
      id: true,
      slug: true,
      title: true,
      producer: true,
      description: true,
      genre: true,
      bpm: true,
      musicalKey: true,
      tags: true,
      coverUrl: true,
      audioUrl: true,
      priceLeaseCents: true,
      priceExclusiveCents: true,
      featured: true,
      createdAt: true,
    },
  });

  const genres = await db.product.findMany({
    where: { published: true },
    select: { genre: true },
    distinct: ["genre"],
  });

  return NextResponse.json({
    products,
    genres: genres.map((g) => g.genre).filter(Boolean).sort(),
  });
}
