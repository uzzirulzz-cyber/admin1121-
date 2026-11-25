import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db-server";
import { generateOrderNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

const itemSchema = z.object({
  productId: z.string().min(1),
  licenseType: z.enum(["lease", "exclusive"]),
});

const checkoutSchema = z.object({
  customerName: z.string().min(1).max(120),
  customerEmail: z.string().email().max(160),
  items: z.array(itemSchema).min(1).max(50),
  notes: z.string().max(500).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const db = await getDb();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Prices are always computed server-side from the database.
  const items = [];
  for (const item of data.items) {
    const product = await db.product.findUnique({ where: { id: item.productId } });
    if (!product || !product.published) {
      return NextResponse.json(
        { error: `Product not available: ${item.productId}` },
        { status: 400 }
      );
    }
    items.push({
      productId: product.id,
      title: product.title,
      licenseType: item.licenseType,
      priceCents:
        item.licenseType === "lease"
          ? product.priceLeaseCents
          : product.priceExclusiveCents,
    });
  }

  const totalCents = items.reduce((sum, it) => sum + it.priceCents, 0);
  const settingsRows = await db.setting.findMany({
    where: { key: { in: ["payment_instructions"] } },
  });
  const paymentInstructions = settingsRows[0]?.value ?? "";

  const order = await db.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerName: data.customerName.trim(),
      customerEmail: data.customerEmail.trim().toLowerCase(),
      itemsJson: JSON.stringify(items),
      totalCents,
      status: "pending",
      notes: data.notes ?? null,
    },
  });

  return NextResponse.json({
    orderNumber: order.orderNumber,
    totalCents,
    items,
    paymentInstructions,
  });
}
