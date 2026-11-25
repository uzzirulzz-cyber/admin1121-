import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  DollarSign,
  Globe,
  Package,
  RefreshCw,
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 sk-card animate-pulse" />
          ))}
        </div>
        <div className="h-80 sk-card animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Heading (Starter Kit PageHeading.vue) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#212b36] dark:text-white">
            Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-[#637381] dark:text-[#919eab]">
            PlayBeat Digital operations · Storefront orders, AdSense, CRM pipeline & domain readiness
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#212b36] dark:text-slate-200 bg-white dark:bg-[#212b36] border border-slate-200 dark:border-slate-700/70 rounded-lg hover:border-[#f78109]/50 hover:text-[#f78109] dark:hover:text-[#fda92d] transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Starter Kit Signature 4-Column Tinted Metric Widgets (UserWidget.vue) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Amber Widget: 30-Day Revenue */}
        <div className="flex items-start gap-3.5 px-4 py-4 rounded-xl border border-amber-500/40 bg-amber-500/[0.06] min-w-0">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg text-amber-600 dark:text-amber-400 bg-amber-500/15 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-300 truncate">
              ${summary ? summary.orders.revenue30dUsd.toFixed(2) : '0.00'}
            </p>
            <p className="text-xs font-medium text-[#637381] dark:text-[#919eab] mt-0.5 truncate">
              30-Day Revenue
            </p>
            <p className="mt-1.5 text-[11px] font-mono tabular-nums text-[#637381] dark:text-slate-400 truncate">
              {summary?.orders.fulfilled ?? 0} fulfilled · {summary?.orders.pending ?? 0} pending
            </p>
          </div>
        </div>

        {/* Cyan Widget: Active Catalog */}
        <div className="flex items-start gap-3.5 px-4 py-4 rounded-xl border border-cyan-500/35 bg-cyan-500/[0.06] min-w-0">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg text-cyan-600 dark:text-cyan-400 bg-cyan-500/15 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold font-mono tabular-nums text-cyan-700 dark:text-cyan-300 truncate">
              {summary?.catalog.active ?? 0}{' '}
              <span className="text-xs font-normal text-[#919eab]">
                / {summary?.catalog.total ?? 0}
              </span>
            </p>
            <p className="text-xs font-medium text-[#637381] dark:text-[#919eab] mt-0.5 truncate">
              Active Catalog SKUs
            </p>
            <p className="mt-1.5 text-[11px] font-mono tabular-nums text-[#637381] dark:text-slate-400 truncate">
              {summary?.catalog.inStock ?? 0} in stock · {summary?.catalog.deals ?? 0} deals
            </p>
          </div>
        </div>

        {/* Blue Widget: CRM Pipeline */}
        <div className="flex items-start gap-3.5 px-4 py-4 rounded-xl border border-blue-500/35 bg-blue-500/[0.06] min-w-0">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 bg-blue-500/15 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold font-mono tabular-nums text-blue-700 dark:text-blue-300 truncate">
              ${summary ? summary.crm.pipelineUsd.toLocaleString() : '0'}
            </p>
            <p className="text-xs font-medium text-[#637381] dark:text-[#919eab] mt-0.5 truncate">
              CRM Pipeline
            </p>
            <p className="mt-1.5 text-[11px] font-mono tabular-nums text-[#637381] dark:text-slate-400 truncate">
              ${summary?.crm.wonUsd.toLocaleString() ?? '0'} won · {summary?.crm.total ?? 0} leads
            </p>
          </div>
        </div>

        {/* Violet Widget: Domain Readiness */}
        <div className="flex items-start gap-3.5 px-4 py-4 rounded-xl border border-violet-500/35 bg-violet-500/[0.06] min-w-0">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg text-violet-600 dark:text-violet-400 bg-violet-500/15 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold font-mono tabular-nums text-violet-700 dark:text-violet-300 truncate">
              {summary?.domains.adsTxtReady ?? 0}/{summary?.domains.total ?? 5}
            </p>
            <p className="text-xs font-medium text-[#637381] dark:text-[#919eab] mt-0.5 truncate">
              Domain Readiness
            </p>
            <p className="mt-1.5 text-[11px] font-mono tabular-nums text-[#637381] dark:text-slate-400 truncate">
              ads.txt verified · {summary?.domains.legalReady ?? 0}/{summary?.domains.total ?? 5} legal
            </p>
          </div>
        </div>
      </section>

      {/* Primary Focal Anchor: AdSense Performance SectionCard */}
      <section className="sk-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-700/60">
          <div>
            <h2 className="text-lg font-semibold text-[#212b36] dark:text-white">
              AdSense Management API v2 Performance
            </h2>
            <p className="mt-0.5 text-xs text-[#637381] dark:text-[#919eab]">
              Publisher ca-pub-9777611286139666 · Earnings, page views, impressions, and clicks
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center p-1 bg-[#f5f8fa] dark:bg-[#161c24] border border-slate-200 dark:border-slate-700/60 rounded-lg">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRange(r.value)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    range === r.value
                      ? 'bg-[#f78109] text-[#161c24] shadow-xs'
                      : 'text-[#637381] dark:text-[#919eab] hover:text-[#212b36] dark:hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center p-1 bg-[#f5f8fa] dark:bg-[#161c24] border border-slate-200 dark:border-slate-700/60 rounded-lg">
              <button
                type="button"
                onClick={() => setBy('date')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  by === 'date'
                    ? 'bg-[#f78109] text-[#161c24] shadow-xs'
                    : 'text-[#637381] dark:text-[#919eab] hover:text-[#212b36] dark:hover:text-white'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setBy('domain')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  by === 'domain'
                    ? 'bg-[#f78109] text-[#161c24] shadow-xs'
                    : 'text-[#637381] dark:text-[#919eab] hover:text-[#212b36] dark:hover:text-white'
                }`}
              >
                By Domain
              </button>
            </div>
          </div>
        </div>

        <div className="pt-5">
          {adsenseLoading ? (
            <div className="h-64 rounded-xl bg-[#f5f8fa] dark:bg-[#161c24] animate-pulse" />
          ) : adsense?.ok &&
            ((adsense.daily && adsense.daily.length > 0) ||
              (adsense.domains && adsense.domains.length > 0)) ? (
            <div className="space-y-5">
              {adsense.totals && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-700/60">
                  <div>
                    <p className="text-xs font-medium text-[#637381] dark:text-[#919eab]">
                      Est. Earnings
                    </p>
                    <p className="mt-1 text-lg font-bold font-mono tabular-nums text-[#212b36] dark:text-white">
                      ${adsense.totals.earnings.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#637381] dark:text-[#919eab]">
                      Page Views
                    </p>
                    <p className="mt-1 text-lg font-bold font-mono tabular-nums text-[#212b36] dark:text-white">
                      {adsense.totals.pageViews.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#637381] dark:text-[#919eab]">
                      Impressions
                    </p>
                    <p className="mt-1 text-lg font-bold font-mono tabular-nums text-[#212b36] dark:text-white">
                      {adsense.totals.impressions.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#637381] dark:text-[#919eab]">
                      Clicks
                    </p>
                    <p className="mt-1 text-lg font-bold font-mono tabular-nums text-[#212b36] dark:text-white">
                      {adsense.totals.clicks.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#637381] dark:text-[#919eab]">
                      Page RPM
                    </p>
                    <p className="mt-1 text-lg font-bold font-mono tabular-nums text-[#212b36] dark:text-white">
                      ${adsense.totals.rpm.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#637381] dark:text-[#919eab]">
                      CTR
                    </p>
                    <p className="mt-1 text-lg font-bold font-mono tabular-nums text-[#212b36] dark:text-white">
                      {adsense.totals.ctr.toFixed(2)}%
                    </p>
                  </div>
                </div>
              )}

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {by === 'date' && adsense.daily ? (
                    <AreaChart data={adsense.daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#919eab" opacity={0.2} />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#919eab" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#919eab" />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="earnings"
                        name="Earnings ($)"
                        stroke="#f78109"
                        fill="#fda92d"
                        fillOpacity={0.18}
                        strokeWidth={2.5}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={adsense.domains || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#919eab" opacity={0.2} />
                      <XAxis dataKey="domain" tick={{ fontSize: 12 }} stroke="#919eab" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#919eab" />
                      <Tooltip />
                      <Bar
                        dataKey="earnings"
                        name="Earnings ($)"
                        fill="#f78109"
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
                <p className="text-sm font-semibold text-amber-600 dark:text-[#fda92d]">
                  AdSense Authorization Required ({adsense?.error || 'ADSENSE_NOT_CONNECTED'})
                </p>
                <p className="text-sm text-[#637381] dark:text-slate-300 leading-relaxed">
                  {adsense?.message ||
                    'Configure Google OAuth2 or authorize your Service Account in Google AdSense / GA4 to stream live earnings and per-domain breakdowns.'}
                </p>
                <p className="text-xs text-[#919eab]">
                  All 5 PlayBeat domains already serve verified ads.txt lines.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('adsense')}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#161c24] bg-[#f78109] hover:bg-[#fda92d] rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 self-start lg:self-center"
              >
                <span>Open AdSense & GA4 Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Order Revenue Chart + Catalog Breakdown DataTable */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="sk-card p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-700/60">
            <div>
              <h2 className="text-base font-semibold text-[#212b36] dark:text-white">
                Fulfilled Order Revenue
              </h2>
              <p className="text-xs text-[#637381] dark:text-[#919eab]">
                Daily fulfilled USD value · FX rate 1 USD = {summary?.usdToPkr ?? 278.5} PKR
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-[#f78109] dark:text-[#fda92d] hover:underline whitespace-nowrap"
            >
              Orders ledger
            </button>
          </div>
          <div className="h-52 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.orders.dailyRevenue || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#919eab" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#919eab" />
                <YAxis tick={{ fontSize: 12 }} stroke="#919eab" />
                <Tooltip />
                <Bar
                  dataKey="revenueUsd"
                  name="Revenue ($)"
                  fill="#f78109"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="sk-card overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/60">
            <div>
              <h2 className="text-base font-semibold text-[#212b36] dark:text-white">
                Catalog & TV Breakdown
              </h2>
              <p className="text-xs text-[#637381] dark:text-[#919eab]">
                {summary?.catalog.servicesCount ?? 0} services ·{' '}
                {summary?.catalog.tvChannelsCount ?? 0} TV channels ·{' '}
                {summary?.catalog.tvPlansCount ?? 0} TV plans
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className="text-xs font-semibold text-[#f78109] dark:text-[#fda92d] hover:underline whitespace-nowrap"
            >
              Manage catalog
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-700/60 bg-[#f5f8fa] dark:bg-[#1a202c] text-xs font-semibold text-[#637381] dark:text-slate-300">
                  <th className="py-3 px-6">Category</th>
                  <th className="py-3 px-4 text-right">SKUs</th>
                  <th className="py-3 px-4 text-right">In Stock</th>
                  <th className="py-3 px-6 text-right">Avg USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/50 text-xs font-mono tabular-nums">
                {(summary?.catalog.byCategory || []).map((row) => (
                  <tr
                    key={row.category}
                    className="hover:bg-[#f5f8fa] dark:hover:bg-[#1a202c]/70 transition-colors"
                  >
                    <td className="py-3 px-6 font-sans font-semibold text-[#212b36] dark:text-white">
                      {row.category}
                    </td>
                    <td className="py-3 px-4 text-right text-[#637381] dark:text-slate-300">
                      {row.count}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {row.inStock}
                    </td>
                    <td className="py-3 px-6 text-right text-[#212b36] dark:text-slate-200">
                      ${row.avgPriceUsd.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Bottom 2-column operational grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Orders DataTable */}
        <section className="xl:col-span-2 sk-card overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/60">
            <div>
              <h2 className="text-base font-semibold text-[#212b36] dark:text-white">
                Recent Orders
              </h2>
              <p className="text-xs text-[#637381] dark:text-[#919eab]">
                Manual & storefront fulfillment ledger
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-[#f78109] dark:text-[#fda92d] hover:underline whitespace-nowrap"
            >
              View all orders
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-700/60 bg-[#f5f8fa] dark:bg-[#1a202c] text-xs font-semibold text-[#637381] dark:text-slate-300">
                  <th className="py-3 px-6">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/50 text-sm">
                {(summary?.recentOrders || []).map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-[#f5f8fa] dark:hover:bg-[#1a202c]/70 transition-colors"
                  >
                    <td className="py-3.5 px-6 font-mono text-xs font-semibold text-[#212b36] dark:text-white whitespace-nowrap">
                      {order.id}
                    </td>
                    <td className="py-3.5 px-4 text-[#637381] dark:text-slate-300 max-w-[200px] truncate">
                      {order.customerEmail}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#919eab] whitespace-nowrap">
                      {order.channel}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold whitespace-nowrap">
                      <span
                        className={
                          order.status === 'PAID_FULFILLED'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : order.status === 'PENDING'
                              ? 'text-amber-600 dark:text-[#fda92d]'
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
                    <td className="py-3.5 px-6 text-right font-mono tabular-nums text-xs font-semibold text-[#212b36] dark:text-white whitespace-nowrap">
                      ${order.totalUsd.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {(!summary?.recentOrders || summary.recentOrders.length === 0) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-sm text-[#919eab]"
                    >
                      No orders recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* CRM Funnel + Integration Health */}
        <section className="sk-card p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-[#212b36] dark:text-white">
                CRM Pipeline
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('crm')}
                className="text-xs font-semibold text-[#f78109] dark:text-[#fda92d] hover:underline whitespace-nowrap"
              >
                Manage
              </button>
            </div>
            <div className="divide-y divide-slate-200/70 dark:divide-slate-700/50">
              {(summary?.crm.byStage || []).map((row) => (
                <div
                  key={row.stage}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <span className="text-[#212b36] dark:text-slate-200 font-semibold">
                    {row.stage}
                    {row.stage === 'Qualified' && (
                      <span className="text-[#919eab] font-normal"> · Meta & TikTok CRM</span>
                    )}
                    {row.stage === 'Won' && (
                      <span className="text-[#919eab] font-normal"> · Converted</span>
                    )}
                  </span>
                  <span className="font-mono tabular-nums text-[#637381] dark:text-slate-300">
                    {row.count} · ${row.valueUsd.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-5 border-t border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-[#212b36] dark:text-white">
                Integrations
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('integrations')}
                className="text-xs font-semibold text-[#f78109] dark:text-[#fda92d] hover:underline whitespace-nowrap"
              >
                Configure
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#637381] dark:text-[#919eab]">
                  AdSense Management API v2
                </span>
                <span
                  className={
                    summary?.integrations.adsenseConnected
                      ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                      : 'font-semibold text-amber-600 dark:text-[#fda92d]'
                  }
                >
                  {summary?.integrations.adsenseConnected ? 'Connected' : 'Auth Required'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#637381] dark:text-[#919eab]">
                  Electronic First API v1
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('affiliate')}
                  className={
                    summary?.integrations.electronicFirstConfigured
                      ? 'font-semibold text-emerald-600 dark:text-emerald-400 hover:underline'
                      : 'font-semibold text-amber-600 dark:text-[#fda92d] hover:underline'
                  }
                >
                  {summary?.integrations.electronicFirstConfigured
                    ? 'Api-Key Set'
                    : 'Api-Key Needed'}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#637381] dark:text-[#919eab]">
                  Meta CAPI & WhatsApp CRM
                </span>
                <span
                  className={
                    summary?.integrations.metaConfigured
                      ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                      : 'font-semibold text-amber-600 dark:text-[#fda92d]'
                  }
                >
                  {summary?.integrations.metaConfigured ? 'Connected' : 'Token Required'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#637381] dark:text-[#919eab]">TikTok Pixel & CRM API</span>
                <span
                  className={
                    summary?.integrations.tiktokConfigured
                      ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                      : 'font-medium text-[#919eab]'
                  }
                >
                  {summary?.integrations.tiktokConfigured ? 'Connected' : 'Not Linked'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#637381] dark:text-[#919eab]">
                  PayPal / Rapid / Local Rail
                </span>
                <span className="font-semibold text-[#212b36] dark:text-slate-300">
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
