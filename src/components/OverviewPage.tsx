import React, { useEffect, useState } from 'react';
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
import {
  ArrowRight,
  DollarSign,
  Globe,
  Package,
  RefreshCw,
  Users,
} from 'lucide-react';
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
            <div key={i} className="h-32 argon-card animate-pulse" />
          ))}
        </div>
        <div className="h-80 argon-card animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Argon Signature 4-Column Floating KPI Cards straddling the top header band */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="argon-card p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#8392ab] dark:text-slate-400">
                30-Day Revenue
              </p>
              <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-[#344767] dark:text-white">
                ${summary ? summary.orders.revenue30dUsd.toFixed(2) : '0.00'}
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-[#5e72e4] text-white flex items-center justify-center shrink-0 shadow-sm">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-[#67748e] dark:text-slate-400 font-mono tabular-nums">
            <span className="font-semibold text-[#2dce89]">
              {summary?.orders.fulfilled ?? 0} fulfilled
            </span>{' '}
            · {summary?.orders.pending ?? 0} pending · PKR{' '}
            {summary ? summary.orders.revenue30dPkr.toLocaleString() : '0'}
          </p>
        </div>

        <div className="argon-card p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#8392ab] dark:text-slate-400">
                Active Catalog
              </p>
              <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-[#344767] dark:text-white">
                {summary?.catalog.active ?? 0}{' '}
                <span className="text-sm font-normal text-[#8392ab]">
                  / {summary?.catalog.total ?? 0}
                </span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-[#f5365c] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-[#67748e] dark:text-slate-400">
            <span className="font-semibold text-[#2dce89] font-mono tabular-nums">
              {summary?.catalog.inStock ?? 0}
            </span>{' '}
            in stock · {summary?.catalog.deals ?? 0} discounted deals
          </p>
        </div>

        <div className="argon-card p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#8392ab] dark:text-slate-400">
                CRM Pipeline
              </p>
              <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-[#344767] dark:text-white">
                ${summary ? summary.crm.pipelineUsd.toLocaleString() : '0'}
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-[#2dce89] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-[#67748e] dark:text-slate-400 font-mono tabular-nums">
            <span className="font-semibold text-[#2dce89]">
              ${summary?.crm.wonUsd.toLocaleString() ?? '0'} won
            </span>{' '}
            · {summary?.crm.total ?? 0} active leads
          </p>
        </div>

        <div className="argon-card p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#8392ab] dark:text-slate-400">
                Domain Readiness
              </p>
              <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-[#344767] dark:text-white">
                {summary?.domains.adsTxtReady ?? 0}/{summary?.domains.total ?? 5}
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-[#fb6340] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-[#67748e] dark:text-slate-400">
            ads.txt verified ·{' '}
            <span className="font-semibold text-[#344767] dark:text-slate-200 font-mono tabular-nums">
              {summary?.domains.legalReady ?? 0}/{summary?.domains.total ?? 5}
            </span>{' '}
            legal pages live
          </p>
        </div>
      </section>

      {/* Primary Focal Anchor: Argon AdSense Performance Chart */}
      <section className="argon-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#e9ecef] dark:border-[#1e2952]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#8392ab] dark:text-slate-400">
              Overview
            </p>
            <h2 className="mt-0.5 text-lg font-bold text-[#344767] dark:text-white">
              AdSense Management API v2 Performance
            </h2>
            <p className="mt-0.5 text-xs text-[#67748e] dark:text-slate-400">
              Publisher ca-pub-9777611286139666 · Earnings, page views, impressions, and clicks
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center p-1 bg-[#f8f9fe] dark:bg-[#0b1437] border border-[#e9ecef] dark:border-[#1e2952] rounded-lg">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRange(r.value)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    range === r.value
                      ? 'bg-[#5e72e4] text-white shadow-xs'
                      : 'text-[#67748e] dark:text-slate-400 hover:text-[#344767] dark:hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center p-1 bg-[#f8f9fe] dark:bg-[#0b1437] border border-[#e9ecef] dark:border-[#1e2952] rounded-lg">
              <button
                type="button"
                onClick={() => setBy('date')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  by === 'date'
                    ? 'bg-[#5e72e4] text-white shadow-xs'
                    : 'text-[#67748e] dark:text-slate-400 hover:text-[#344767] dark:hover:text-white'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setBy('domain')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  by === 'domain'
                    ? 'bg-[#5e72e4] text-white shadow-xs'
                    : 'text-[#67748e] dark:text-slate-400 hover:text-[#344767] dark:hover:text-white'
                }`}
              >
                By Domain
              </button>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#344767] dark:text-slate-200 bg-white dark:bg-[#182450] border border-[#dee2e6] dark:border-[#243266] rounded-lg hover:bg-[#f6f9fc] dark:hover:bg-[#1e2d62] transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="pt-5">
          {adsenseLoading ? (
            <div className="h-64 rounded-xl bg-[#f8f9fe] dark:bg-[#0b1437] animate-pulse" />
          ) : adsense?.ok &&
            ((adsense.daily && adsense.daily.length > 0) ||
              (adsense.domains && adsense.domains.length > 0)) ? (
            <div className="space-y-5">
              {adsense.totals && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pb-4 border-b border-[#e9ecef] dark:border-[#1e2952]">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#8392ab]">
                      Est. Earnings
                    </p>
                    <p className="mt-1 text-lg font-bold font-mono tabular-nums text-[#344767] dark:text-white">
                      ${adsense.totals.earnings.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#8392ab]">
                      Page Views
                    </p>
                    <p className="mt-1 text-lg font-bold font-mono tabular-nums text-[#344767] dark:text-white">
                      {adsense.totals.pageViews.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#8392ab]">
                      Impressions
                    </p>
                    <p className="mt-1 text-lg font-bold font-mono tabular-nums text-[#344767] dark:text-white">
                      {adsense.totals.impressions.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#8392ab]">
                      Clicks
                    </p>
                    <p className="mt-1 text-lg font-bold font-mono tabular-nums text-[#344767] dark:text-white">
                      {adsense.totals.clicks.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#8392ab]">
                      Page RPM
                    </p>
                    <p className="mt-1 text-lg font-bold font-mono tabular-nums text-[#344767] dark:text-white">
                      ${adsense.totals.rpm.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#8392ab]">
                      CTR
                    </p>
                    <p className="mt-1 text-lg font-bold font-mono tabular-nums text-[#344767] dark:text-white">
                      {adsense.totals.ctr.toFixed(2)}%
                    </p>
                  </div>
                </div>
              )}

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {by === 'date' && adsense.daily ? (
                    <AreaChart data={adsense.daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" opacity={0.5} />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#8392ab" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#8392ab" />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="earnings"
                        name="Earnings ($)"
                        stroke="#5e72e4"
                        fill="#5e72e4"
                        fillOpacity={0.14}
                        strokeWidth={2.5}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={adsense.domains || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" opacity={0.5} />
                      <XAxis dataKey="domain" tick={{ fontSize: 12 }} stroke="#8392ab" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#8392ab" />
                      <Tooltip />
                      <Bar
                        dataKey="earnings"
                        name="Earnings ($)"
                        fill="#5e72e4"
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
                <p className="text-sm font-bold text-[#fb6340]">
                  AdSense OAuth Token Required ({adsense?.error || 'ADSENSE_NOT_CONNECTED'})
                </p>
                <p className="text-sm text-[#67748e] dark:text-slate-300 leading-relaxed">
                  {adsense?.message ||
                    'Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ADSENSE_ACCOUNT, and GOOGLE_ADSENSE_REFRESH_TOKEN in server secrets (or KV key pb:adsense:refresh:v1 on Cloudflare Worker) to stream live earnings and per-domain breakdowns.'}
                </p>
                <p className="text-xs text-[#8392ab] dark:text-slate-400">
                  Google requires OAuth2 or Service Account authorization on AdSense Management API v2. All 5 PlayBeat domains already serve verified ads.txt lines.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('adsense')}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#5e72e4] hover:bg-[#4e62d4] rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 self-start lg:self-center"
              >
                <span>Open AdSense Setup</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Order Revenue Chart + Catalog by Category Table */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="argon-card p-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#e9ecef] dark:border-[#1e2952]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#8392ab]">
                Storefront Sales
              </p>
              <h2 className="mt-0.5 text-base font-bold text-[#344767] dark:text-white">
                Fulfilled Order Revenue
              </h2>
              <p className="text-xs text-[#67748e] dark:text-slate-400">
                Daily fulfilled USD value · FX rate 1 USD = {summary?.usdToPkr ?? 278.5} PKR
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-[#5e72e4] hover:underline whitespace-nowrap"
            >
              Orders ledger
            </button>
          </div>
          <div className="h-52 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.orders.dailyRevenue || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" opacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#8392ab" />
                <YAxis tick={{ fontSize: 12 }} stroke="#8392ab" />
                <Tooltip />
                <Bar
                  dataKey="revenueUsd"
                  name="Revenue ($)"
                  fill="#5e72e4"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="argon-card overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-[#e9ecef] dark:border-[#1e2952]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#8392ab]">
                Inventory
              </p>
              <h2 className="mt-0.5 text-base font-bold text-[#344767] dark:text-white">
                Catalog & TV Breakdown
              </h2>
              <p className="text-xs text-[#67748e] dark:text-slate-400">
                {summary?.catalog.servicesCount ?? 0} services ·{' '}
                {summary?.catalog.tvChannelsCount ?? 0} TV channels ·{' '}
                {summary?.catalog.tvPlansCount ?? 0} TV plans
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className="text-xs font-semibold text-[#5e72e4] hover:underline whitespace-nowrap"
            >
              Manage catalog
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e9ecef] dark:border-[#1e2952] bg-[#f6f9fc] dark:bg-[#0e1738] text-[11px] font-bold uppercase tracking-wider text-[#8392ab]">
                  <th className="py-3 px-6">Category</th>
                  <th className="py-3 px-4 text-right">SKUs</th>
                  <th className="py-3 px-4 text-right">In Stock</th>
                  <th className="py-3 px-6 text-right">Avg USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9ecef] dark:divide-[#1e2952] text-xs font-mono tabular-nums">
                {(summary?.catalog.byCategory || []).map((row) => (
                  <tr
                    key={row.category}
                    className="hover:bg-[#f8f9fe] dark:hover:bg-[#182450]/50 transition-colors"
                  >
                    <td className="py-3 px-6 font-sans font-semibold text-[#344767] dark:text-white">
                      {row.category}
                    </td>
                    <td className="py-3 px-4 text-right text-[#67748e] dark:text-slate-300">
                      {row.count}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[#2dce89]">
                      {row.inStock}
                    </td>
                    <td className="py-3 px-6 text-right text-[#344767] dark:text-slate-200">
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
        {/* Recent Orders Table */}
        <section className="xl:col-span-2 argon-card overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-[#e9ecef] dark:border-[#1e2952]">
            <div>
              <h2 className="text-base font-bold text-[#344767] dark:text-white">
                Recent Orders
              </h2>
              <p className="text-xs text-[#67748e] dark:text-slate-400">
                Manual & storefront fulfillment ledger
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-[#5e72e4] hover:underline whitespace-nowrap"
            >
              View all orders
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e9ecef] dark:border-[#1e2952] bg-[#f6f9fc] dark:bg-[#0e1738] text-[11px] font-bold uppercase tracking-wider text-[#8392ab]">
                  <th className="py-3 px-6">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9ecef] dark:divide-[#1e2952] text-sm">
                {(summary?.recentOrders || []).map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-[#f8f9fe] dark:hover:bg-[#182450]/50 transition-colors"
                  >
                    <td className="py-3.5 px-6 font-mono text-xs font-semibold text-[#344767] dark:text-white whitespace-nowrap">
                      {order.id}
                    </td>
                    <td className="py-3.5 px-4 text-[#67748e] dark:text-slate-300 max-w-[200px] truncate">
                      {order.customerEmail}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#8392ab] dark:text-slate-400 whitespace-nowrap">
                      {order.channel}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold whitespace-nowrap">
                      <span
                        className={
                          order.status === 'PAID_FULFILLED'
                            ? 'text-[#2dce89]'
                            : order.status === 'PENDING'
                              ? 'text-[#fb6340]'
                              : 'text-[#f5365c]'
                        }
                      >
                        {order.status === 'PAID_FULFILLED'
                          ? 'Paid · Fulfilled'
                          : order.status === 'PENDING'
                            ? 'Pending Verification'
                            : 'Cancelled'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono tabular-nums text-xs font-semibold text-[#344767] dark:text-white whitespace-nowrap">
                      ${order.totalUsd.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {(!summary?.recentOrders || summary.recentOrders.length === 0) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-sm text-[#8392ab] dark:text-slate-400"
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
        <section className="argon-card p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-[#344767] dark:text-white">
                CRM Pipeline
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('crm')}
                className="text-xs font-semibold text-[#5e72e4] hover:underline whitespace-nowrap"
              >
                Manage
              </button>
            </div>
            <div className="divide-y divide-[#e9ecef] dark:divide-[#1e2952]">
              {(summary?.crm.byStage || []).map((row) => (
                <div
                  key={row.stage}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <span className="text-[#344767] dark:text-slate-200 font-semibold">
                    {row.stage}
                    {row.stage === 'Qualified' && (
                      <span className="text-[#8392ab] font-normal"> · Meta Lead</span>
                    )}
                    {row.stage === 'Won' && (
                      <span className="text-[#8392ab] font-normal"> · Meta Purchase</span>
                    )}
                  </span>
                  <span className="font-mono tabular-nums text-[#67748e] dark:text-slate-300">
                    {row.count} · ${row.valueUsd.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-5 border-t border-[#e9ecef] dark:border-[#1e2952]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-[#344767] dark:text-white">
                Integrations
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('integrations')}
                className="text-xs font-semibold text-[#5e72e4] hover:underline whitespace-nowrap"
              >
                Configure
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#67748e] dark:text-slate-400">
                  AdSense Management API v2
                </span>
                <span
                  className={
                    summary?.integrations.adsenseConnected
                      ? 'font-semibold text-[#2dce89]'
                      : 'font-semibold text-[#fb6340]'
                  }
                >
                  {summary?.integrations.adsenseConnected ? 'Connected' : 'OAuth Required'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#67748e] dark:text-slate-400">
                  Electronic First API v1
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('affiliate')}
                  className={
                    summary?.integrations.electronicFirstConfigured
                      ? 'font-semibold text-[#2dce89] hover:underline'
                      : 'font-semibold text-[#fb6340] hover:underline'
                  }
                >
                  {summary?.integrations.electronicFirstConfigured
                    ? 'Api-Key Set'
                    : 'Api-Key Needed'}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#67748e] dark:text-slate-400">
                  Meta CAPI & WhatsApp CRM
                </span>
                <span
                  className={
                    summary?.integrations.metaConfigured
                      ? 'font-semibold text-[#2dce89]'
                      : 'font-semibold text-[#fb6340]'
                  }
                >
                  {summary?.integrations.metaConfigured ? 'Connected' : 'Token Required'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#67748e] dark:text-slate-400">TikTok Events API</span>
                <span
                  className={
                    summary?.integrations.tiktokConfigured
                      ? 'font-semibold text-[#2dce89]'
                      : 'font-medium text-[#8392ab]'
                  }
                >
                  {summary?.integrations.tiktokConfigured ? 'Linked' : 'Not Linked'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#67748e] dark:text-slate-400">
                  PayPal / Rapid / Local Rail
                </span>
                <span className="font-semibold text-[#344767] dark:text-slate-300">
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
