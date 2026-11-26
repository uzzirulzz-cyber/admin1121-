import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Clock,
  DollarSign,
  Globe,
  Package,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  AdSenseAnalyticsResponse,
  AdSenseRange,
  AdminSummary,
} from '../types/admin';
import { api } from '../lib/api';
import type { NavSection } from './AdminShell';

interface OverviewPageProps {
  summary: AdminSummary | null;
  loading: boolean;
  onNavigate: (section: NavSection) => void;
  onRefresh: () => void;
}

const RANGES: Array<{ value: AdSenseRange; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: '7d' },
  { value: '28d', label: '28d' },
  { value: 'mtd', label: 'MTD' },
];

export function OverviewPage({
  summary,
  loading,
  onNavigate,
  onRefresh,
}: OverviewPageProps) {
  const [range, setRange] = useState<AdSenseRange>('7d');
  const [by, setBy] = useState<'date' | 'domain'>('date');
  const [adsense, setAdsense] = useState<AdSenseAnalyticsResponse | null>(null);
  const [adsenseLoading, setAdsenseLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setAdsenseLoading(true);
    api
      .adsenseAnalytics(range, by)
      .then((res) => {
        if (active) setAdsense(res);
      })
      .catch((err) => {
        if (active) {
          setAdsense({
            ok: false,
            range,
            by: by === 'domain' ? 'DOMAIN_NAME' : 'DATE',
            error: err instanceof Error ? err.message : 'ADSENSE_ERROR',
          });
        }
      })
      .finally(() => {
        if (active) setAdsenseLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range, by]);

  if (loading && !summary) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 paper-stats-card animate-pulse" />
          ))}
        </div>
        <div className="h-80 paper-card animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0b162c] dark:text-white">
            Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-[#475a78] dark:text-[#94a3b8]">
            PlayBeat Digital operations · Storefront orders, AdSense, CRM pipeline & domain readiness
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="sn-btn-silver inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#1e40af] dark:text-[#93c5fd]" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Premium Silver-Navy 4-Column Paper StatsCards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1: 30-Day Revenue */}
        <article className="paper-stats-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="sn-icon-well w-12 h-12 rounded-xl text-[#1e40af] dark:text-[#93c5fd] flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="text-right min-w-0">
              <p className="text-xs font-medium text-[#6c7f9e] dark:text-[#94a3b8] truncate">
                30-Day Revenue
              </p>
              <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-[#0b162c] dark:text-white truncate">
                ${summary ? summary.orders.revenue30dUsd.toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#e2e8f0] dark:border-[#cbd5e1]/12 flex items-center gap-1.5 text-xs text-[#475a78] dark:text-[#94a3b8]">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-mono tabular-nums truncate">
              {summary?.orders.fulfilled ?? 0} fulfilled · {summary?.orders.pending ?? 0} pending
            </span>
          </div>
        </article>

        {/* Card 2: Active Catalog */}
        <article className="paper-stats-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="sn-icon-well w-12 h-12 rounded-xl text-[#0369a1] dark:text-[#7dd3fc] flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="text-right min-w-0">
              <p className="text-xs font-medium text-[#6c7f9e] dark:text-[#94a3b8] truncate">
                Active Catalog
              </p>
              <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-[#0b162c] dark:text-white truncate">
                {summary?.catalog.active ?? 0}
                <span className="text-sm font-normal text-[#6c7f9e] dark:text-[#7d92b3]">
                  /{summary?.catalog.total ?? 0}
                </span>
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#e2e8f0] dark:border-[#cbd5e1]/12 flex items-center gap-1.5 text-xs text-[#475a78] dark:text-[#94a3b8]">
            <Clock className="w-3.5 h-3.5 text-[#6c7f9e] dark:text-[#7d92b3] shrink-0" />
            <span className="font-mono tabular-nums truncate">
              {summary?.catalog.inStock ?? 0} in stock · {summary?.catalog.deals ?? 0} deals
            </span>
          </div>
        </article>

        {/* Card 3: CRM Pipeline */}
        <article className="paper-stats-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="sn-icon-well w-12 h-12 rounded-xl text-[#334155] dark:text-[#cbd5e1] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-right min-w-0">
              <p className="text-xs font-medium text-[#6c7f9e] dark:text-[#94a3b8] truncate">
                CRM Pipeline
              </p>
              <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-[#0b162c] dark:text-white truncate">
                ${summary ? summary.crm.pipelineUsd.toLocaleString() : '0'}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#e2e8f0] dark:border-[#cbd5e1]/12 flex items-center gap-1.5 text-xs text-[#475a78] dark:text-[#94a3b8]">
            <TrendingUp className="w-3.5 h-3.5 text-[#1e40af] dark:text-[#93c5fd] shrink-0" />
            <span className="font-mono tabular-nums truncate">
              ${summary?.crm.wonUsd.toLocaleString() ?? '0'} won · {summary?.crm.total ?? 0} leads
            </span>
          </div>
        </article>

        {/* Card 4: Domain Readiness */}
        <article className="paper-stats-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="sn-icon-well w-12 h-12 rounded-xl text-[#0f766e] dark:text-[#5eead4] flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div className="text-right min-w-0">
              <p className="text-xs font-medium text-[#6c7f9e] dark:text-[#94a3b8] truncate">
                Domain Readiness
              </p>
              <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-[#0b162c] dark:text-white truncate">
                {summary?.domains.adsTxtReady ?? 0}/{summary?.domains.total ?? 5}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#e2e8f0] dark:border-[#cbd5e1]/12 flex items-center gap-1.5 text-xs text-[#475a78] dark:text-[#94a3b8]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0f766e] dark:text-[#5eead4] shrink-0" />
            <span className="font-mono tabular-nums truncate">
              ads.txt ready · {summary?.domains.legalReady ?? 0}/{summary?.domains.total ?? 5} legal
            </span>
          </div>
        </article>
      </section>

      {/* Primary Chart Card: AdSense Management API v2 */}
      <section className="paper-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#e2e8f0] dark:border-[#cbd5e1]/12">
          <div>
            <h2 className="text-lg font-semibold text-[#0b162c] dark:text-white">
              AdSense Management API v2 Performance
            </h2>
            <p className="mt-0.5 text-xs text-[#6c7f9e] dark:text-[#94a3b8]">
              Publisher ca-pub-9777611286139666 · Earnings, page views, impressions, and clicks
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center p-1 bg-[#edf1f7] dark:bg-[#060e20] border border-[#cbd5e1] dark:border-[#cbd5e1]/16 rounded-lg">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRange(r.value)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    range === r.value
                      ? 'paper-btn-primary'
                      : 'text-[#475a78] dark:text-[#94a3b8] hover:text-[#0b162c] dark:hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center p-1 bg-[#edf1f7] dark:bg-[#060e20] border border-[#cbd5e1] dark:border-[#cbd5e1]/16 rounded-lg">
              <button
                type="button"
                onClick={() => setBy('date')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  by === 'date'
                    ? 'paper-btn-primary'
                    : 'text-[#475a78] dark:text-[#94a3b8] hover:text-[#0b162c] dark:hover:text-white'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setBy('domain')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  by === 'domain'
                    ? 'paper-btn-primary'
                    : 'text-[#475a78] dark:text-[#94a3b8] hover:text-[#0b162c] dark:hover:text-white'
                }`}
              >
                By Domain
              </button>
            </div>
          </div>
        </div>

        <div className="pt-5">
          {adsenseLoading ? (
            <div className="h-64 rounded-xl bg-[#edf1f7] dark:bg-[#081226] animate-pulse" />
          ) : adsense?.ok &&
            ((adsense.daily && adsense.daily.length > 0) ||
              (adsense.domains && adsense.domains.length > 0)) ? (
            <div className="space-y-5">
              {adsense.totals && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pb-4 border-b border-[#e2e8f0] dark:border-[#cbd5e1]/12">
                  <div>
                    <p className="text-xs font-medium text-[#6c7f9e] dark:text-[#94a3b8]">
                      Est. Earnings
                    </p>
                    <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-[#0b162c] dark:text-white">
                      ${adsense.totals.earnings.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#6c7f9e] dark:text-[#94a3b8]">
                      Page Views
                    </p>
                    <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-[#0b162c] dark:text-white">
                      {adsense.totals.pageViews.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#6c7f9e] dark:text-[#94a3b8]">
                      Impressions
                    </p>
                    <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-[#0b162c] dark:text-white">
                      {adsense.totals.impressions.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#6c7f9e] dark:text-[#94a3b8]">
                      Clicks
                    </p>
                    <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-[#0b162c] dark:text-white">
                      {adsense.totals.clicks.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#6c7f9e] dark:text-[#94a3b8]">
                      Page RPM
                    </p>
                    <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-[#0b162c] dark:text-white">
                      ${adsense.totals.rpm.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#6c7f9e] dark:text-[#94a3b8]">
                      CTR
                    </p>
                    <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-[#0b162c] dark:text-white">
                      {adsense.totals.ctr.toFixed(2)}%
                    </p>
                  </div>
                </div>
              )}

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {by === 'date' && adsense.daily ? (
                    <AreaChart data={adsense.daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.22} />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6c7f9e" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#6c7f9e" />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="earnings"
                        name="Earnings ($)"
                        stroke="#2563eb"
                        fill="#60a5fa"
                        fillOpacity={0.2}
                        strokeWidth={2.5}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={adsense.domains || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.22} />
                      <XAxis dataKey="domain" tick={{ fontSize: 12 }} stroke="#6c7f9e" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#6c7f9e" />
                      <Tooltip />
                      <Bar
                        dataKey="earnings"
                        name="Earnings ($)"
                        fill="#2563eb"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="max-w-2xl space-y-2">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  AdSense Authorization Required ({adsense?.error || 'ADSENSE_NOT_CONNECTED'})
                </p>
                <p className="text-sm text-[#475a78] dark:text-[#b8c7dc] leading-relaxed">
                  {adsense?.message ||
                    'Configure Google OAuth2 or authorize your Service Account in Google AdSense / GA4 to stream live earnings and per-domain breakdowns.'}
                </p>
                <p className="text-xs text-[#6c7f9e] dark:text-[#7d92b3]">
                  All 5 PlayBeat domains already serve verified ads.txt lines.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('adsense')}
                className="paper-btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-xs whitespace-nowrap shrink-0 self-start lg:self-center cursor-pointer"
              >
                <span>Open AdSense & GA4 Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Order Revenue Chart + Catalog Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="paper-card p-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0] dark:border-[#cbd5e1]/12">
            <div>
              <h2 className="text-base font-semibold text-[#0b162c] dark:text-white">
                Fulfilled Order Revenue
              </h2>
              <p className="text-xs text-[#6c7f9e] dark:text-[#94a3b8]">
                Daily fulfilled USD value · FX rate 1 USD = {summary?.usdToPkr ?? 278.5} PKR
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-[#1e40af] dark:text-[#93c5fd] hover:underline whitespace-nowrap cursor-pointer"
            >
              Orders ledger
            </button>
          </div>
          <div className="h-52 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.orders.dailyRevenue || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.22} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6c7f9e" />
                <YAxis tick={{ fontSize: 12 }} stroke="#6c7f9e" />
                <Tooltip />
                <Bar
                  dataKey="revenueUsd"
                  name="Revenue ($)"
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="paper-card overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-[#e2e8f0] dark:border-[#cbd5e1]/12">
            <div>
              <h2 className="text-base font-semibold text-[#0b162c] dark:text-white">
                Catalog & TV Breakdown
              </h2>
              <p className="text-xs text-[#6c7f9e] dark:text-[#94a3b8]">
                {summary?.catalog.servicesCount ?? 0} services ·{' '}
                {summary?.catalog.tvChannelsCount ?? 0} TV channels ·{' '}
                {summary?.catalog.tvPlansCount ?? 0} TV plans
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className="text-xs font-semibold text-[#1e40af] dark:text-[#93c5fd] hover:underline whitespace-nowrap cursor-pointer"
            >
              Manage catalog
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0] dark:border-[#cbd5e1]/12 bg-[#f3f6fb] dark:bg-[#081226] text-[11px] font-semibold uppercase tracking-wider text-[#6c7f9e] dark:text-[#94a3b8]">
                  <th className="py-3 px-6">Category</th>
                  <th className="py-3 px-4 text-right">SKUs</th>
                  <th className="py-3 px-4 text-right">In Stock</th>
                  <th className="py-3 px-6 text-right">Avg USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#cbd5e1]/10 text-xs font-mono tabular-nums">
                {(summary?.catalog.byCategory || []).map((row) => (
                  <tr
                    key={row.category}
                    className="hover:bg-[#edf1f7]/70 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-3 px-6 font-sans font-semibold text-[#0b162c] dark:text-white">
                      {row.category}
                    </td>
                    <td className="py-3 px-4 text-right text-[#475a78] dark:text-[#b8c7dc]">
                      {row.count}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {row.inStock}
                    </td>
                    <td className="py-3 px-6 text-right text-[#0b162c] dark:text-[#e6edf7]">
                      ${row.avgPriceUsd.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Bottom 2-Column Operational Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Orders Silver-Navy Table */}
        <section className="xl:col-span-2 paper-card overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-[#e2e8f0] dark:border-[#cbd5e1]/12">
            <div>
              <h2 className="text-base font-semibold text-[#0b162c] dark:text-white">
                Recent Orders
              </h2>
              <p className="text-xs text-[#6c7f9e] dark:text-[#94a3b8]">
                Manual & storefront fulfillment ledger
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-[#1e40af] dark:text-[#93c5fd] hover:underline whitespace-nowrap cursor-pointer"
            >
              View all orders
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0] dark:border-[#cbd5e1]/12 bg-[#f3f6fb] dark:bg-[#081226] text-[11px] font-semibold uppercase tracking-wider text-[#6c7f9e] dark:text-[#94a3b8]">
                  <th className="py-3 px-6">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#cbd5e1]/10 text-sm">
                {(summary?.recentOrders || []).map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-[#edf1f7]/70 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-3.5 px-6 font-mono text-xs font-semibold text-[#0b162c] dark:text-white whitespace-nowrap">
                      {order.id}
                    </td>
                    <td className="py-3.5 px-4 text-[#475a78] dark:text-[#b8c7dc] max-w-[200px] truncate">
                      {order.customerEmail}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#6c7f9e] dark:text-[#94a3b8] whitespace-nowrap">
                      {order.channel}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold whitespace-nowrap">
                      <span
                        className={
                          order.status === 'PAID_FULFILLED'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : order.status === 'PENDING'
                              ? 'text-amber-600 dark:text-amber-300'
                              : 'text-rose-600 dark:text-rose-400'
                        }
                      >
                        {order.status === 'PAID_FULFILLED'
                          ? 'Paid · Fulfilled'
                          : order.status === 'PENDING'
                            ? 'Pending Verification'
                            : 'Cancelled'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono tabular-nums text-xs font-semibold text-[#0b162c] dark:text-white whitespace-nowrap">
                      ${order.totalUsd.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {(!summary?.recentOrders || summary.recentOrders.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-[#6c7f9e] dark:text-[#94a3b8]">
                      No orders recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* CRM Pipeline + Integration Health */}
        <section className="paper-card p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-[#0b162c] dark:text-white">
                CRM Pipeline
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('crm')}
                className="text-xs font-semibold text-[#1e40af] dark:text-[#93c5fd] hover:underline whitespace-nowrap cursor-pointer"
              >
                Manage
              </button>
            </div>
            <div className="divide-y divide-[#e2e8f0] dark:divide-[#cbd5e1]/10">
              {(summary?.crm.byStage || []).map((row) => (
                <div
                  key={row.stage}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <span className="text-[#0b162c] dark:text-[#e6edf7] font-semibold">
                    {row.stage}
                    {row.stage === 'Qualified' && (
                      <span className="text-[#6c7f9e] dark:text-[#94a3b8] font-normal">
                        {' '}
                        · Meta & TikTok CRM
                      </span>
                    )}
                    {row.stage === 'Won' && (
                      <span className="text-[#6c7f9e] dark:text-[#94a3b8] font-normal">
                        {' '}
                        · Converted
                      </span>
                    )}
                  </span>
                  <span className="font-mono tabular-nums text-[#475a78] dark:text-[#b8c7dc]">
                    {row.count} · ${row.valueUsd.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-5 border-t border-[#e2e8f0] dark:border-[#cbd5e1]/12">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-[#0b162c] dark:text-white">
                Integrations
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('integrations')}
                className="text-xs font-semibold text-[#1e40af] dark:text-[#93c5fd] hover:underline whitespace-nowrap cursor-pointer"
              >
                Configure
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#475a78] dark:text-[#94a3b8]">
                  AdSense Management API v2
                </span>
                <span
                  className={
                    summary?.integrations.adsenseConnected
                      ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                      : 'font-semibold text-amber-600 dark:text-amber-300'
                  }
                >
                  {summary?.integrations.adsenseConnected ? 'Connected' : 'Auth Required'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#475a78] dark:text-[#94a3b8]">
                  Electronic First API v1
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('affiliate')}
                  className={
                    summary?.integrations.electronicFirstConfigured
                      ? 'font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer'
                      : 'font-semibold text-amber-600 dark:text-amber-300 hover:underline cursor-pointer'
                  }
                >
                  {summary?.integrations.electronicFirstConfigured
                    ? 'Api-Key Set'
                    : 'Api-Key Needed'}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#475a78] dark:text-[#94a3b8]">
                  Meta CAPI & WhatsApp CRM
                </span>
                <span
                  className={
                    summary?.integrations.metaConfigured
                      ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                      : 'font-semibold text-amber-600 dark:text-amber-300'
                  }
                >
                  {summary?.integrations.metaConfigured ? 'Connected' : 'Token Required'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#475a78] dark:text-[#94a3b8]">TikTok Pixel & CRM API</span>
                <span
                  className={
                    summary?.integrations.tiktokConfigured
                      ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                      : 'font-medium text-[#6c7f9e]'
                  }
                >
                  {summary?.integrations.tiktokConfigured ? 'Connected' : 'Not Linked'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#475a78] dark:text-[#94a3b8]">
                  PayPal / Rapid / Local Rail
                </span>
                <span className="font-semibold text-[#0b162c] dark:text-[#e6edf7]">
                  Manual Rail
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
