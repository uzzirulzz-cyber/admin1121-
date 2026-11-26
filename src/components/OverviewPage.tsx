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
          <h1 className="text-2xl font-semibold tracking-tight text-[#252422] dark:text-white">
            Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-[#66615b] dark:text-[#9a9a9a]">
            PlayBeat Digital operations · Storefront orders, AdSense, CRM pipeline & domain readiness
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#252422] dark:text-[#f4f3ef] bg-white dark:bg-[#252422] border border-[#ddd9ce] dark:border-white/15 rounded-lg hover:border-[#51cbce] transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#51cbce]" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Paper Dashboard PRO Signature 4-Column StatsCards (StatsCard.vue) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1: Warning Sun (#fbc658) — 30-Day Revenue */}
        <article className="paper-stats-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="w-12 h-12 rounded-full bg-[#fbc658]/16 text-[#e09f1f] dark:text-[#fbc658] flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="text-right min-w-0">
              <p className="text-xs font-medium text-[#9a9a9a] truncate">30-Day Revenue</p>
              <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-[#252422] dark:text-white truncate">
                ${summary ? summary.orders.revenue30dUsd.toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#e8e5dc] dark:border-white/10 flex items-center gap-1.5 text-xs text-[#66615b] dark:text-[#9a9a9a]">
            <TrendingUp className="w-3.5 h-3.5 text-[#6bd098] shrink-0" />
            <span className="font-mono tabular-nums truncate">
              {summary?.orders.fulfilled ?? 0} fulfilled · {summary?.orders.pending ?? 0} pending
            </span>
          </div>
        </article>

        {/* Card 2: Success Mint (#6bd098) — Active Catalog */}
        <article className="paper-stats-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="w-12 h-12 rounded-full bg-[#6bd098]/16 text-[#3ca971] dark:text-[#6bd098] flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div className="text-right min-w-0">
              <p className="text-xs font-medium text-[#9a9a9a] truncate">Active Catalog</p>
              <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-[#252422] dark:text-white truncate">
                {summary?.catalog.active ?? 0}
                <span className="text-sm font-normal text-[#9a9a9a]">
                  /{summary?.catalog.total ?? 0}
                </span>
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#e8e5dc] dark:border-white/10 flex items-center gap-1.5 text-xs text-[#66615b] dark:text-[#9a9a9a]">
            <Clock className="w-3.5 h-3.5 text-[#9a9a9a] shrink-0" />
            <span className="font-mono tabular-nums truncate">
              {summary?.catalog.inStock ?? 0} in stock · {summary?.catalog.deals ?? 0} deals
            </span>
          </div>
        </article>

        {/* Card 3: Danger Coral (#ef8157) — CRM Pipeline */}
        <article className="paper-stats-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="w-12 h-12 rounded-full bg-[#ef8157]/16 text-[#ef8157] flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-right min-w-0">
              <p className="text-xs font-medium text-[#9a9a9a] truncate">CRM Pipeline</p>
              <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-[#252422] dark:text-white truncate">
                ${summary ? summary.crm.pipelineUsd.toLocaleString() : '0'}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#e8e5dc] dark:border-white/10 flex items-center gap-1.5 text-xs text-[#66615b] dark:text-[#9a9a9a]">
            <TrendingUp className="w-3.5 h-3.5 text-[#ef8157] shrink-0" />
            <span className="font-mono tabular-nums truncate">
              ${summary?.crm.wonUsd.toLocaleString() ?? '0'} won · {summary?.crm.total ?? 0} leads
            </span>
          </div>
        </article>

        {/* Card 4: Primary Teal (#51cbce) — Domain Readiness */}
        <article className="paper-stats-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="w-12 h-12 rounded-full bg-[#51cbce]/16 text-[#2ca8ab] dark:text-[#51cbce] flex items-center justify-center shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div className="text-right min-w-0">
              <p className="text-xs font-medium text-[#9a9a9a] truncate">Domain Readiness</p>
              <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-[#252422] dark:text-white truncate">
                {summary?.domains.adsTxtReady ?? 0}/{summary?.domains.total ?? 5}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#e8e5dc] dark:border-white/10 flex items-center gap-1.5 text-xs text-[#66615b] dark:text-[#9a9a9a]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#51cbce] shrink-0" />
            <span className="font-mono tabular-nums truncate">
              ads.txt ready · {summary?.domains.legalReady ?? 0}/{summary?.domains.total ?? 5} legal
            </span>
          </div>
        </article>
      </section>

      {/* Primary Paper Chart Card: AdSense Management API v2 */}
      <section className="paper-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#e8e5dc] dark:border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-[#252422] dark:text-white">
              AdSense Management API v2 Performance
            </h2>
            <p className="mt-0.5 text-xs text-[#9a9a9a]">
              Publisher ca-pub-9777611286139666 · Earnings, page views, impressions, and clicks
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center p-1 bg-[#f4f3ef] dark:bg-[#1c1b1a] border border-[#ddd9ce] dark:border-white/10 rounded-lg">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRange(r.value)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    range === r.value
                      ? 'paper-btn-primary'
                      : 'text-[#66615b] dark:text-[#9a9a9a] hover:text-[#252422] dark:hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center p-1 bg-[#f4f3ef] dark:bg-[#1c1b1a] border border-[#ddd9ce] dark:border-white/10 rounded-lg">
              <button
                type="button"
                onClick={() => setBy('date')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  by === 'date'
                    ? 'paper-btn-primary'
                    : 'text-[#66615b] dark:text-[#9a9a9a] hover:text-[#252422] dark:hover:text-white'
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
                    : 'text-[#66615b] dark:text-[#9a9a9a] hover:text-[#252422] dark:hover:text-white'
                }`}
              >
                By Domain
              </button>
            </div>
          </div>
        </div>

        <div className="pt-5">
          {adsenseLoading ? (
            <div className="h-64 rounded-xl bg-[#f4f3ef] dark:bg-[#1c1b1a] animate-pulse" />
          ) : adsense?.ok &&
            ((adsense.daily && adsense.daily.length > 0) ||
              (adsense.domains && adsense.domains.length > 0)) ? (
            <div className="space-y-5">
              {adsense.totals && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pb-4 border-b border-[#e8e5dc] dark:border-white/10">
                  <div>
                    <p className="text-xs font-medium text-[#9a9a9a]">Est. Earnings</p>
                    <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-[#252422] dark:text-white">
                      ${adsense.totals.earnings.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#9a9a9a]">Page Views</p>
                    <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-[#252422] dark:text-white">
                      {adsense.totals.pageViews.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#9a9a9a]">Impressions</p>
                    <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-[#252422] dark:text-white">
                      {adsense.totals.impressions.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#9a9a9a]">Clicks</p>
                    <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-[#252422] dark:text-white">
                      {adsense.totals.clicks.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#9a9a9a]">Page RPM</p>
                    <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-[#252422] dark:text-white">
                      ${adsense.totals.rpm.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#9a9a9a]">CTR</p>
                    <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-[#252422] dark:text-white">
                      {adsense.totals.ctr.toFixed(2)}%
                    </p>
                  </div>
                </div>
              )}

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {by === 'date' && adsense.daily ? (
                    <AreaChart data={adsense.daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#9a9a9a" opacity={0.22} />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9a9a9a" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#9a9a9a" />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="earnings"
                        name="Earnings ($)"
                        stroke="#51cbce"
                        fill="#51cbce"
                        fillOpacity={0.2}
                        strokeWidth={2.5}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={adsense.domains || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#9a9a9a" opacity={0.22} />
                      <XAxis dataKey="domain" tick={{ fontSize: 12 }} stroke="#9a9a9a" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#9a9a9a" />
                      <Tooltip />
                      <Bar
                        dataKey="earnings"
                        name="Earnings ($)"
                        fill="#51cbce"
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
                <p className="text-sm font-semibold text-[#ef8157]">
                  AdSense Authorization Required ({adsense?.error || 'ADSENSE_NOT_CONNECTED'})
                </p>
                <p className="text-sm text-[#66615b] dark:text-[#cfcac0] leading-relaxed">
                  {adsense?.message ||
                    'Configure Google OAuth2 or authorize your Service Account in Google AdSense / GA4 to stream live earnings and per-domain breakdowns.'}
                </p>
                <p className="text-xs text-[#9a9a9a]">
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
          <div className="flex items-center justify-between pb-4 border-b border-[#e8e5dc] dark:border-white/10">
            <div>
              <h2 className="text-base font-semibold text-[#252422] dark:text-white">
                Fulfilled Order Revenue
              </h2>
              <p className="text-xs text-[#9a9a9a]">
                Daily fulfilled USD value · FX rate 1 USD = {summary?.usdToPkr ?? 278.5} PKR
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-[#2ca8ab] dark:text-[#51cbce] hover:underline whitespace-nowrap cursor-pointer"
            >
              Orders ledger
            </button>
          </div>
          <div className="h-52 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.orders.dailyRevenue || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#9a9a9a" opacity={0.22} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9a9a9a" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9a9a9a" />
                <Tooltip />
                <Bar
                  dataKey="revenueUsd"
                  name="Revenue ($)"
                  fill="#ef8157"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="paper-card overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-[#e8e5dc] dark:border-white/10">
            <div>
              <h2 className="text-base font-semibold text-[#252422] dark:text-white">
                Catalog & TV Breakdown
              </h2>
              <p className="text-xs text-[#9a9a9a]">
                {summary?.catalog.servicesCount ?? 0} services ·{' '}
                {summary?.catalog.tvChannelsCount ?? 0} TV channels ·{' '}
                {summary?.catalog.tvPlansCount ?? 0} TV plans
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className="text-xs font-semibold text-[#2ca8ab] dark:text-[#51cbce] hover:underline whitespace-nowrap cursor-pointer"
            >
              Manage catalog
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e8e5dc] dark:border-white/10 bg-[#f9f8f5] dark:bg-[#1f1e1d] text-[11px] font-semibold uppercase tracking-wider text-[#9a9a9a]">
                  <th className="py-3 px-6">Category</th>
                  <th className="py-3 px-4 text-right">SKUs</th>
                  <th className="py-3 px-4 text-right">In Stock</th>
                  <th className="py-3 px-6 text-right">Avg USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e5dc] dark:divide-white/8 text-xs font-mono tabular-nums">
                {(summary?.catalog.byCategory || []).map((row) => (
                  <tr
                    key={row.category}
                    className="hover:bg-[#f4f3ef]/70 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-3 px-6 font-sans font-semibold text-[#252422] dark:text-white">
                      {row.category}
                    </td>
                    <td className="py-3 px-4 text-right text-[#66615b] dark:text-[#cfcac0]">
                      {row.count}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[#3ca971] dark:text-[#6bd098]">
                      {row.inStock}
                    </td>
                    <td className="py-3 px-6 text-right text-[#252422] dark:text-[#f4f3ef]">
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
        {/* Recent Orders Paper Table */}
        <section className="xl:col-span-2 paper-card overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-[#e8e5dc] dark:border-white/10">
            <div>
              <h2 className="text-base font-semibold text-[#252422] dark:text-white">
                Recent Orders
              </h2>
              <p className="text-xs text-[#9a9a9a]">
                Manual & storefront fulfillment ledger
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-[#2ca8ab] dark:text-[#51cbce] hover:underline whitespace-nowrap cursor-pointer"
            >
              View all orders
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e8e5dc] dark:border-white/10 bg-[#f9f8f5] dark:bg-[#1f1e1d] text-[11px] font-semibold uppercase tracking-wider text-[#9a9a9a]">
                  <th className="py-3 px-6">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e5dc] dark:divide-white/8 text-sm">
                {(summary?.recentOrders || []).map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-[#f4f3ef]/70 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-3.5 px-6 font-mono text-xs font-semibold text-[#252422] dark:text-white whitespace-nowrap">
                      {order.id}
                    </td>
                    <td className="py-3.5 px-4 text-[#66615b] dark:text-[#cfcac0] max-w-[200px] truncate">
                      {order.customerEmail}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#9a9a9a] whitespace-nowrap">
                      {order.channel}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold whitespace-nowrap">
                      <span
                        className={
                          order.status === 'PAID_FULFILLED'
                            ? 'text-[#3ca971] dark:text-[#6bd098]'
                            : order.status === 'PENDING'
                              ? 'text-[#d99b1e] dark:text-[#fbc658]'
                              : 'text-[#ef8157]'
                        }
                      >
                        {order.status === 'PAID_FULFILLED'
                          ? 'Paid · Fulfilled'
                          : order.status === 'PENDING'
                            ? 'Pending Verification'
                            : 'Cancelled'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono tabular-nums text-xs font-semibold text-[#252422] dark:text-white whitespace-nowrap">
                      ${order.totalUsd.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {(!summary?.recentOrders || summary.recentOrders.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-[#9a9a9a]">
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
              <h2 className="text-base font-semibold text-[#252422] dark:text-white">
                CRM Pipeline
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('crm')}
                className="text-xs font-semibold text-[#2ca8ab] dark:text-[#51cbce] hover:underline whitespace-nowrap cursor-pointer"
              >
                Manage
              </button>
            </div>
            <div className="divide-y divide-[#e8e5dc] dark:divide-white/8">
              {(summary?.crm.byStage || []).map((row) => (
                <div
                  key={row.stage}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <span className="text-[#252422] dark:text-[#f4f3ef] font-semibold">
                    {row.stage}
                    {row.stage === 'Qualified' && (
                      <span className="text-[#9a9a9a] font-normal"> · Meta & TikTok CRM</span>
                    )}
                    {row.stage === 'Won' && (
                      <span className="text-[#9a9a9a] font-normal"> · Converted</span>
                    )}
                  </span>
                  <span className="font-mono tabular-nums text-[#66615b] dark:text-[#cfcac0]">
                    {row.count} · ${row.valueUsd.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-5 border-t border-[#e8e5dc] dark:border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-[#252422] dark:text-white">
                Integrations
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('integrations')}
                className="text-xs font-semibold text-[#2ca8ab] dark:text-[#51cbce] hover:underline whitespace-nowrap cursor-pointer"
              >
                Configure
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#66615b] dark:text-[#9a9a9a]">
                  AdSense Management API v2
                </span>
                <span
                  className={
                    summary?.integrations.adsenseConnected
                      ? 'font-semibold text-[#3ca971] dark:text-[#6bd098]'
                      : 'font-semibold text-[#ef8157]'
                  }
                >
                  {summary?.integrations.adsenseConnected ? 'Connected' : 'Auth Required'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#66615b] dark:text-[#9a9a9a]">
                  Electronic First API v1
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('affiliate')}
                  className={
                    summary?.integrations.electronicFirstConfigured
                      ? 'font-semibold text-[#3ca971] dark:text-[#6bd098] hover:underline cursor-pointer'
                      : 'font-semibold text-[#ef8157] hover:underline cursor-pointer'
                  }
                >
                  {summary?.integrations.electronicFirstConfigured
                    ? 'Api-Key Set'
                    : 'Api-Key Needed'}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#66615b] dark:text-[#9a9a9a]">
                  Meta CAPI & WhatsApp CRM
                </span>
                <span
                  className={
                    summary?.integrations.metaConfigured
                      ? 'font-semibold text-[#3ca971] dark:text-[#6bd098]'
                      : 'font-semibold text-[#ef8157]'
                  }
                >
                  {summary?.integrations.metaConfigured ? 'Connected' : 'Token Required'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#66615b] dark:text-[#9a9a9a]">TikTok Pixel & CRM API</span>
                <span
                  className={
                    summary?.integrations.tiktokConfigured
                      ? 'font-semibold text-[#3ca971] dark:text-[#6bd098]'
                      : 'font-medium text-[#9a9a9a]'
                  }
                >
                  {summary?.integrations.tiktokConfigured ? 'Connected' : 'Not Linked'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#66615b] dark:text-[#9a9a9a]">
                  PayPal / Rapid / Local Rail
                </span>
                <span className="font-semibold text-[#252422] dark:text-[#f4f3ef]">
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
