"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle, Clock, DollarSign, Loader2, ShoppingBag, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/admin/_shared";

interface Stats {
  kpis: {
    totalRevenueCents: number;
    ordersCount: number;
    pendingCount: number;
    customersCount: number;
    productsCount: number;
    publishedCount: number;
    avgOrderCents: number;
  };
  revenueByDay: { label: string; revenueCents: number; orders: number }[];
  topProducts: { title: string; units: number; revenueCents: number }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    totalCents: number;
    status: string;
    createdAt: string;
  }[];
}

export default function DashboardView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d: Stats) => setStats(d))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-6">
        <AlertCircle className="h-5 w-5" /> Failed to load stats. Refresh the page to retry.
      </div>
    );
  }

  const { kpis } = stats;
  const maxTop = Math.max(1, ...stats.topProducts.map((p) => p.revenueCents));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<DollarSign className="h-4 w-4 text-primary" />}
          label="Total revenue"
          value={formatMoney(kpis.totalRevenueCents)}
          hint={`Avg order ${formatMoney(kpis.avgOrderCents)}`}
        />
        <KpiCard
          icon={<ShoppingBag className="h-4 w-4 text-primary" />}
          label="Orders"
          value={String(kpis.ordersCount)}
          hint={`${kpis.publishedCount}/${kpis.productsCount} products live`}
        />
        <KpiCard
          icon={<Clock className="h-4 w-4 text-amber-400" />}
          label="Pending payments"
          value={String(kpis.pendingCount)}
          hint="Waiting for confirmation"
        />
        <KpiCard
          icon={<Users className="h-4 w-4 text-primary" />}
          label="Customers"
          value={String(kpis.customersCount)}
          hint="Unique emails"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue — last 14 days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueByDay} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.696 0.17 162.48)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="oklch(0.696 0.17 162.48)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "oklch(0.708 0 0)" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "oklch(0.708 0 0)" }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickFormatter={(v: number) => `$${Math.round(v / 100)}`}
                />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === "revenueCents"
                      ? [formatMoney(value), "Revenue"]
                      : [value, "Orders"]
                  }
                  contentStyle={{
                    backgroundColor: "oklch(0.185 0 0)",
                    border: "1px solid oklch(1 0 0 / 10%)",
                    borderRadius: 8,
                    color: "oklch(0.985 0 0)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenueCents"
                  stroke="oklch(0.696 0.17 162.48)"
                  strokeWidth={2}
                  fill="url(#revFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top products</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {stats.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No confirmed sales yet.</p>
            ) : (
              stats.topProducts.map((p) => (
                <div key={p.title} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate mr-2">{p.title}</span>
                    <span className="font-medium shrink-0">
                      {formatMoney(p.revenueCents)} · {p.units} sold
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(p.revenueCents / maxTop) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent orders</CardTitle>
            <Badge variant="secondary">latest {stats.recentOrders.length}</Badge>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.orderNumber}</TableCell>
                    <TableCell className="max-w-32 truncate">{o.customerName}</TableCell>
                    <TableCell className="text-right">{formatMoney(o.totalCents)}</TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
}
