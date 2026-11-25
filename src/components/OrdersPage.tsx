import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, Copy, KeyRound, Plus, Search, Trash2, X } from 'lucide-react';
import type { CatalogProduct, OrderRecord, OrderStatus } from '../types/admin';
import { api } from '../lib/api';
import { trackTikTokEvent } from '../lib/tiktokPixel';

interface OrdersPageProps {
  onDataChanged: () => void;
  openCreateSignal: number;
}

const USD_TO_PKR = 278.5;

export function OrdersPage({ onDataChanged, openCreateSignal }: OrdersPageProps) {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<{ type: 'info' | 'error'; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Create order modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [channel, setChannel] = useState<OrderRecord['channel']>('WhatsApp');
  const [paymentRef, setPaymentRef] = useState('');
  const [selectedLines, setSelectedLines] = useState<Array<{ sku: string; qty: number }>>([]);
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [ordersRes, catalogRes] = await Promise.all([
        api.orders(),
        api.catalog({ limit: 100 }),
      ]);
      setOrders(ordersRes.orders);
      setCatalog(catalogRes.products);
      if (selectedLines.length === 0 && catalogRes.products.length > 0) {
        setSelectedLines([{ sku: catalogRes.products[0].sku, qty: 1 }]);
      }
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load orders.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (openCreateSignal > 0) setModalOpen(true);
  }, [openCreateSignal]);

  const draftTotalUsd = selectedLines.reduce((sum, line) => {
    const product = catalog.find((p) => p.sku === line.sku);
    return sum + (product ? product.priceUsd * line.qty : 0);
  }, 0);

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!customerEmail.trim() || selectedLines.length === 0) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await api.createOrder({
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim() || undefined,
        channel,
        paymentRef: paymentRef.trim() || undefined,
        items: selectedLines,
      });
      setOrders((prev) => [res.order, ...prev]);
      void trackTikTokEvent(
        'PlaceAnOrder',
        {
          contents: (res.order.items || []).map((item) => ({
            content_id: item.sku,
            content_type: 'product',
            content_name: item.name,
          })),
          value: res.order.totalUsd,
          currency: 'USD',
        },
        {
          email: res.order.customerEmail,
          phone: res.order.customerPhone,
          externalId: res.order.customerUid || res.order.id,
        },
      );
      setModalOpen(false);
      setCustomerEmail('');
      setCustomerPhone('');
      setPaymentRef('');
      setNotice({
        type: 'info',
        text: `Created manual order ${res.order.id} ($${res.order.totalUsd.toFixed(2)}). Click "Verify & Fulfill" once payment is confirmed.`,
      });
      onDataChanged();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not create order.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleFulfill(orderId: string) {
    setBusyId(orderId);
    setNotice(null);
    try {
      const res = await api.fulfillOrder(orderId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
      void trackTikTokEvent(
        'Purchase',
        {
          contents: (res.order.items || []).map((item) => ({
            content_id: item.sku,
            content_type: 'product',
            content_name: item.name,
          })),
          value: res.order.totalUsd,
          currency: 'USD',
        },
        {
          email: res.order.customerEmail,
          phone: res.order.customerPhone,
          externalId: res.order.customerUid || res.order.id,
        },
      );
      setExpandedOrderId(orderId);
      setNotice({
        type: 'info',
        text: `Order ${orderId} verified & fulfilled (${res.order.issuedKeys.length} license key(s) issued).${
          res.metaCapi ? ` Meta CAPI: ${res.metaCapi.detail}` : ''
        }`,
      });
      onDataChanged();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Fulfillment failed.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(orderId: string) {
    setBusyId(orderId);
    setNotice(null);
    try {
      await api.deleteOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setNotice({ type: 'info', text: `Deleted order ${orderId}.` });
      onDataChanged();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not delete order.',
      });
    } finally {
      setBusyId(null);
    }
  }

  function handleCopyKey(key: string) {
    navigator.clipboard?.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1600);
  }

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = `${o.id} ${o.customerEmail} ${o.paymentRef} ${o.channel}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Orders & Key Fulfillment
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Create multi-SKU manual orders, verify payment, issue digital license keys, and dispatch verified Meta CAPI Purchase events.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Manual Order</span>
        </button>
      </div>

      {notice && (
        <div
          role="status"
          className={`flex items-center justify-between gap-4 px-4 py-3 text-xs rounded-lg border ${
            notice.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
              : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notice">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex items-center p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg self-start">
          {(
            [
              { value: 'ALL', label: `All (${orders.length})` },
              {
                value: 'PENDING',
                label: `Pending (${orders.filter((o) => o.status === 'PENDING').length})`,
              },
              {
                value: 'PAID_FULFILLED',
                label: `Fulfilled (${orders.filter((o) => o.status === 'PAID_FULFILLED').length})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                statusFilter === tab.value
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order ID, email, ref..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/30"
          />
        </div>
      </div>

      {/* Orders Table */}
      <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <th className="py-3 px-5">Order & Ref</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Total (USD / PKR)</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-zinc-500">
                    Loading orders...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-zinc-500">
                    No orders found.
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <React.Fragment key={order.id}>
                    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors align-top">
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <p className="font-mono text-xs font-semibold text-zinc-950 dark:text-zinc-50">
                          {order.id}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          {order.channel} · <span className="font-mono">{order.paymentRef}</span>
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {order.customerEmail}
                        </p>
                        {order.customerPhone && (
                          <p className="font-mono text-zinc-500 dark:text-zinc-400">
                            {order.customerPhone}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-zinc-700 dark:text-zinc-300">
                        {order.items.map((item, idx) => (
                          <p key={`${order.id}-${idx}`} className="truncate max-w-[260px]">
                            <span className="font-mono text-zinc-500">{item.qty}×</span> {item.name}
                          </p>
                        ))}
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        <p
                          className={`font-medium ${
                            order.status === 'PAID_FULFILLED'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : order.status === 'PENDING'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-red-700 dark:text-red-400'
                          }`}
                        >
                          {order.status === 'PAID_FULFILLED'
                            ? 'Paid · Fulfilled'
                            : order.status === 'PENDING'
                              ? 'Pending Payment'
                              : 'Cancelled'}
                        </p>
                        {order.issuedKeys.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                            }
                            className="mt-1 inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>
                              {expandedOrderId === order.id ? 'Hide' : 'View'}{' '}
                              {order.issuedKeys.length} key(s)
                            </span>
                          </button>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <p className="text-xs font-semibold text-zinc-950 dark:text-zinc-50">
                          ${order.totalUsd.toFixed(2)}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          PKR {order.totalPkr.toLocaleString()}
                        </p>
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {order.status === 'PENDING' && (
                            <button
                              type="button"
                              disabled={busyId === order.id}
                              onClick={() => handleFulfill(order.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-md whitespace-nowrap"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verify & Fulfill</span>
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyId === order.id}
                            onClick={() => handleDelete(order.id)}
                            aria-label={`Delete order ${order.id}`}
                            className="p-1.5 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedOrderId === order.id && order.issuedKeys.length > 0 && (
                      <tr className="bg-zinc-50/80 dark:bg-zinc-950/60">
                        <td colSpan={6} className="px-6 py-4">
                          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                            Issued License Keys · Meta CAPI:{' '}
                            <span className="font-mono">{order.metaCapiStatus || 'not_configured'}</span>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {order.issuedKeys.map((k) => (
                              <button
                                key={k}
                                type="button"
                                onClick={() => handleCopyKey(k)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md hover:border-blue-500"
                              >
                                <span>{k}</span>
                                {copiedKey === k ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                                )}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Create Manual Order Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60">
          <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                Create Manual Order
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Customer Delivery Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    WhatsApp / Mobile
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="923001234567"
                    className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Payment Channel
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as OrderRecord['channel'])}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="JazzCash / EasyPaisa">JazzCash / EasyPaisa</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Stripe">Stripe</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Payment Reference
                  </label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="Transaction ID / receipt"
                    className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Order Line Items
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (catalog.length > 0) {
                        setSelectedLines((prev) => [...prev, { sku: catalog[0].sku, qty: 1 }]);
                      }
                    }}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    + Add SKU
                  </button>
                </div>

                {selectedLines.map((line, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={line.sku}
                      onChange={(e) =>
                        setSelectedLines((prev) =>
                          prev.map((row, idx) =>
                            idx === index ? { ...row, sku: e.target.value } : row,
                          ),
                        )
                      }
                      className="flex-1 min-w-0 px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                    >
                      {catalog.map((p) => (
                        <option key={p.sku} value={p.sku}>
                          {p.sku} — {p.name} (${p.priceUsd.toFixed(2)})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={line.qty}
                      onChange={(e) =>
                        setSelectedLines((prev) =>
                          prev.map((row, idx) =>
                            idx === index ? { ...row, qty: Math.max(1, Number(e.target.value) || 1) } : row,
                          ),
                        )
                      }
                      className="w-16 px-2.5 py-2 text-xs font-mono text-center bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                    />
                    {selectedLines.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedLines((prev) => prev.filter((_, idx) => idx !== index))
                        }
                        aria-label="Remove item"
                        className="p-2 text-zinc-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="text-xs font-mono tabular-nums">
                  <span className="text-zinc-500">Order Total: </span>
                  <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                    ${draftTotalUsd.toFixed(2)}
                  </span>
                  <span className="text-zinc-500">
                    {' '}
                    · PKR {Math.round(draftTotalUsd * USD_TO_PKR).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg"
                  >
                    {saving ? 'Creating...' : 'Create Order'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
