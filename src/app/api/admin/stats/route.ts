import { NextResponse } from "next/server";
import { getDb } from "@/lib/db-server";
import { requireAdmin, unauthorized } from "@/lib/auth-server";
import type { OrderItem } from "@/lib/format";

export const dynamic = "force-dynamic";

const REVENUE_STATUSES = ["paid", "fulfilled"];

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const db = await getDb();

  const orders = await db.order.findMany({ orderBy: { createdAt: "desc" } });
  const productsCount = await db.product.count();
  const publishedCount = await db.product.count({ where: { published: true } });

  const revenueOrders = orders.filter((o) => REVENUE_STATUSES.includes(o.status));
  const totalRevenueCents = revenueOrders.reduce((s, o) => s + o.totalCents, 0);
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const customers = new Set(orders.map((o) => o.customerEmail));

  // Revenue by day, last 14 days
  const days: { date: string; label: string; revenueCents: number; orders: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    const date = d.toISOString().slice(0, 10);
    days.push({ date, label: `${d.getMonth() + 1}/${d.getDate()}`, revenueCents: 0, orders: 0 });
  }
  const byDate = new Map(days.map((d) => [d.date, d]));
  for (const o of revenueOrders) {
    const key = new Date(o.createdAt).toISOString().slice(0, 10);
    const bucket = byDate.get(key);
    if (bucket) {
      bucket.revenueCents += o.totalCents;
      bucket.orders += 1;
    }
  }

  // Top products from order items
  const productStats = new Map<string, { title: string; units: number; revenueCents: number }>();
  for (const o of revenueOrders) {
    try {
      const items = JSON.parse(o.itemsJson) as OrderItem[];
      for (const item of items) {
        const stat = productStats.get(item.productId) ?? { title: item.title, units: 0, revenueCents: 0 };
        stat.units += 1;
        stat.revenueCents += item.priceCents;
        productStats.set(item.productId, stat);
      }
    } catch {
      // ignore malformed items
    }
  }
  const topProducts = Array.from(productStats.values())
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 5);

  const recentOrders = orders.slice(0, 8).map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    totalCents: o.totalCents,
    status: o.status,
    createdAt: o.createdAt,
  }));

  return NextResponse.json({
    kpis: {
      totalRevenueCents,
      ordersCount: orders.length,
      pendingCount,
      customersCount: customers.size,
      productsCount,
      publishedCount,
      avgOrderCents: revenueOrders.length ? Math.round(totalRevenueCents / revenueOrders.length) : 0,
    },
    revenueByDay: days,
    topProducts,
    recentOrders,
  });
}
