"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Search } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/client/api";
import { formatMoney, ORDER_STATUSES, type OrderItem } from "@/lib/format";
import { StatusBadge } from "@/components/admin/_shared";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  itemsJson: string;
  totalCents: number;
  status: string;
  paymentRef: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function OrdersView() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Order | null>(null);
  const [paymentRef, setPaymentRef] = useState("");
  const [deleting, setDeleting] = useState<Order | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status && status !== "all") params.set("status", status);
      if (q) params.set("q", q);
      const data = await api<{ orders: Order[] }>(`/api/admin/orders?${params.toString()}`);
      setOrders(data.orders);
    } catch (err) {
      toast({
        title: "Failed to load orders",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [status, q, toast]);

  useEffect(() => {
    load();
  }, [load]);

  function itemsOf(order: Order): OrderItem[] {
    try {
      return JSON.parse(order.itemsJson) as OrderItem[];
    } catch {
      return [];
    }
  }

  async function patchOrder(order: Order, body: Record<string, string>) {
    try {
      const data = await api<{ order: Order }>(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        body,
      });
      setOrders((list) => list.map((o) => (o.id === order.id ? data.order : o)));
      setDetail((d) => (d && d.id === order.id ? data.order : d));
      toast({ title: `Order ${order.orderNumber} updated` });
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await api(`/api/admin/orders/${deleting.id}`, { method: "DELETE" });
      setOrders((list) => list.filter((o) => o.id !== deleting.id));
      toast({ title: `Order ${deleting.orderNumber} deleted` });
      setDeleting(null);
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Orders</h1>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search order #, name or email"
            className="pl-9 bg-card"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44 bg-card">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Placed</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading && orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No orders match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => {
                const items = itemsOf(o);
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.orderNumber}</TableCell>
                    <TableCell>
                      <p className="font-medium truncate max-w-36">{o.customerName}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-36">
                        {o.customerEmail}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {items.map((i) => i.title).join(", ").slice(0, 40) ||
                        `${items.length} item(s)`}
                    </TableCell>
                    <TableCell className="font-semibold">{formatMoney(o.totalCents)}</TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDetail(o);
                            setPaymentRef(o.paymentRef ?? "");
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" /> Details
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">
                              Set status
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Move to</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {ORDER_STATUSES.map((s) => (
                              <DropdownMenuItem
                                key={s}
                                disabled={s === o.status}
                                onClick={() => patchOrder(o, { status: s })}
                                className="capitalize"
                              >
                                {s}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleting(o)}
                            >
                              Delete order
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail dialog */}
      <Dialog open={detail !== null} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="bg-card max-w-lg max-h-[85vh] overflow-y-auto">
          {detail && (
            <div>
              <DialogHeader>
                <DialogTitle className="font-mono">{detail.orderNumber}</DialogTitle>
                <DialogDescription>
                  {detail.customerName} · {detail.customerEmail}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-3">
                <StatusBadge status={detail.status} />
              </div>
              <div className="mt-4 rounded-lg border border-border p-3 text-sm flex flex-col gap-2">
                {itemsOf(detail).map((i) => (
                  <div key={`${i.productId}-${i.licenseType}`} className="flex justify-between gap-2">
                    <span className="truncate">
                      {i.title}{" "}
                      <span className="text-muted-foreground capitalize">({i.licenseType})</span>
                    </span>
                    <span className="font-medium shrink-0">{formatMoney(i.priceCents)}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatMoney(detail.totalCents)}</span>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                <Label htmlFor="payref">Payment reference</Label>
                <div className="flex gap-2">
                  <Input
                    id="payref"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="Bank ref / transaction ID"
                  />
                  <Button
                    onClick={() => patchOrder(detail, { paymentRef })}
                    disabled={paymentRef === (detail.paymentRef ?? "")}
                  >
                    Save
                  </Button>
                </div>
              </div>
              {detail.notes && (
                <div className="mt-4">
                  <Label>Customer notes</Label>
                  <p className="text-sm text-muted-foreground mt-1">{detail.notes}</p>
                </div>
              )}
              <p className="mt-4 text-xs text-muted-foreground">
                Placed {new Date(detail.createdAt).toLocaleString("en-US")} · Updated{" "}
                {new Date(detail.updatedAt).toLocaleString("en-US")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this order?</AlertDialogTitle>
            <AlertDialogDescription>
              Order {deleting?.orderNumber} will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
