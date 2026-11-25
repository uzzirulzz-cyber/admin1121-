export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function generateOrderNumber(): string {
  const time = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.floor(Math.random() * 36 * 36)
    .toString(36)
    .toUpperCase()
    .padStart(2, "0");
  return `PB-${time}${rand}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "fulfilled",
  "refunded",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  fulfilled: "bg-green-600/15 text-green-400 border-green-600/30",
  refunded: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

export interface OrderItem {
  productId: string;
  title: string;
  licenseType: "lease" | "exclusive";
  priceCents: number;
}
