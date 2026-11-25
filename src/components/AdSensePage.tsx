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
import { Check, Copy, Link2, RefreshCw, Share2 } from 'lucide-react';
import type {
  AdSenseAnalyticsResponse,
  AdSenseRange,
  AdSenseStatus,
} from '../types/admin';
import type { NavSection } from './AdminShell';
import { api } from '../lib/api';

interface AdSensePageProps {
  onNavigate?: (section: NavSection) => void;
}

const RANGES: Array<{ value: AdSenseRange; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: '7 Days' },
  { value: '28d', label: '28 Days' },
  { value: 'mtd', label: 'Month to Date' },
];

type MetricKey = 'earnings' | 'pageViews' | 'impressions' | 'clicks';

const METRICS: Array<{ key: MetricKey; label: string; prefix?: string }> = [
  { key: 'earnings', label: 'Estimated Earnings', prefix: '$' },
  { key: 'pageViews', label: 'Page Views' },
  { key: 'impressions', label: 'Impressions' },
  { key: 'clicks', label: 'Clicks' },
];

export function AdSensePage({ onNavigate }: AdSensePageProps) {
  const [range, setRange] = useState<AdSenseRange>('7d');
  const [by, setBy] = useState<'date' | 'domain'>('date');
  const [metric, setMetric] = useState<MetricKey>('earnings');
  const [status, setStatus] = useState<AdSenseStatus | null>(null);
  const [report, setReport] = useState<AdSenseAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedAdsTxt, setCopiedAdsTxt] = useState(false);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  async function loadData(currentRange: AdSenseRange, currentBy: 'date' | 'domain') {
    setLoading(true);
    try {
      const [statusRes, reportRes] = await Promise.all([
        api.adsenseStatus(),
        api.adsenseAnalytics(currentRange, currentBy),
      ]);
      setStatus(statusRes);
      setReport(reportRes);
    } catch (err) {
      setReport({
        ok: false,
        range: currentRange,
        by: currentBy === 'domain' ? 'DOMAIN_NAME' : 'DATE',
        error: err instanceof Error ? err.message : 'ADSENSE_FETCH_FAILED',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(range, by);
  }, [range, by]);

  useEffect(() => {
    const onMsg = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin &&
        !event.origin.endsWith('.run.app') &&
        !event.origin.includes('localhost')
      ) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.platform === 'google_adsense') {
        setOauthNotice('Google AdSense connected via OAuth 2.0. Refreshing report...');
        loadData(range, by);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [range, by]);

  async function handleConnectAdSenseOAuth() {
    setConnecting(true);
    setOauthNotice(null);
    try {
      const res = await api.getChannelOAuthUrl('google_adsense', window.location.origin);
      const popup = window.open(res.url, 'playbeat_adsense_oauth', 'width=620,height=740');
      if (!popup) {
        setOauthNotice('Allow popups for this site to complete Google AdSense sign-in.');
      }
    } catch (err) {
      setOauthNotice(
        err instanceof Error
          ? err.message
          : 'Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Settings → Secrets.',
      );
    } finally {
      setConnecting(false);
    }
  }

  function handleCopyAdsTxt() {
    if (!status?.adsTxtLine) return;
    navigator.clipboard?.writeText(status.adsTxtLine);
    setCopiedAdsTxt(true);
    setTimeout(() => setCopiedAdsTxt(false), 1800);
  }

  const activeMetric = METRICS.find((m) => m.key === metric) || METRICS[0];
  const chartData =
    by === 'date' ? report?.daily || [] : report?.domains || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            AdSense Revenue & Domain Analytics
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Wired to <span className="font-mono text-xs">/api/admin/adsense/analytics</span> (AdSense Management API v2) for publisher{' '}
            <span className="font-mono text-xs">{status?.publisherId || 'ca-pub-9777611286139666'}</span>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            disabled={connecting}
            onClick={handleConnectAdSenseOAuth}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>{status?.connected ? 'Reconnect AdSense' : 'Connect Google AdSense'}</span>
          </button>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('channels')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>All Ad & Social Logins</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => loadData(range, by)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {oauthNotice && (
        <div
          role="status"
          className="px-4 py-3 text-xs rounded-lg border bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
        >
          {oauthNotice}
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                range === r.value
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg">
            <button
              type="button"
              onClick={() => setBy('date')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                by === 'date'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
              }`}
            >
              By Date
            </button>
            <button
              type="button"
              onClick={() => setBy('domain')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                by === 'domain'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
              }`}
            >
              By Domain (5 Sites)
            </button>
          </div>
        </div>
      </div>

      {/* Main Report Area */}
      {loading ? (
        <div className="h-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl animate-pulse" />
      ) : report?.ok && chartData.length > 0 ? (
        <div className="space-y-6">
          {/* Totals KPIs */}
          {report.totals && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Est. Earnings</p>
                <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums">
                  ${report.totals.earnings.toFixed(2)}
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Page Views</p>
                <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums">
                  {report.totals.pageViews.toLocaleString()}
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Impressions</p>
                <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums">
                  {report.totals.impressions.toLocaleString()}
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Clicks</p>
                <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums">
                  {report.totals.clicks.toLocaleString()}
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Page RPM</p>
                <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums">
                  ${report.totals.rpm.toFixed(2)}
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">CTR</p>
                <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums">
                  {report.totals.ctr.toFixed(2)}%
                </p>
              </div>
            </div>
          )}

          {/* Chart */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                {activeMetric.label} ({by === 'date' ? 'Daily Trend' : 'Domain Breakdown'})
              </h2>
              <div className="inline-flex items-center p-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                {METRICS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMetric(m.key)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      metric === m.key
                        ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-72 pt-5">
              <ResponsiveContainer width="100%" height="100%">
                {by === 'date' ? (
                  <AreaChart data={report?.daily || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.4} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#71717a" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#71717a" />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey={metric}
                      name={activeMetric.label}
                      stroke="#2563eb"
                      fill="#2563eb"
                      fillOpacity={0.14}
                      strokeWidth={2}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={report?.domains || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.4} />
                    <XAxis dataKey="domain" tick={{ fontSize: 12 }} stroke="#71717a" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#71717a" />
                    <Tooltip />
                    <Bar
                      dataKey={metric}
                      name={activeMetric.label}
                      fill="#2563eb"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </section>

          {/* Breakdown Table */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                {by === 'date' ? 'Daily Metrics Table' : 'Per-Domain Metrics Table'}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <th className="py-3 px-6">{by === 'date' ? 'Date' : 'Domain'}</th>
                    <th className="py-3 px-4 text-right">Est. Earnings</th>
                    <th className="py-3 px-4 text-right">Page Views</th>
                    <th className="py-3 px-4 text-right">Impressions</th>
                    <th className="py-3 px-4 text-right">Clicks</th>
                    <th className="py-3 px-6 text-right">Page RPM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-sm font-mono tabular-nums">
                  {chartData.map((row: { date?: string; domain?: string; earnings: number; pageViews: number; impressions: number; clicks: number }) => {
                    const label = row.date || row.domain || '';
                    const rpm = row.pageViews > 0 ? (row.earnings / row.pageViews) * 1000 : 0;
                    return (
                      <tr key={label} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        <td className="py-3 px-6 font-sans font-medium text-zinc-900 dark:text-zinc-100">
                          {label}
                        </td>
                        <td className="py-3 px-4 text-right">${row.earnings.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right">{row.pageViews.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">{row.impressions.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">{row.clicks.toLocaleString()}</td>
                        <td className="py-3 px-6 text-right">${rpm.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-amber-700 dark:text-amber-400">
              Live AdSense Connection Pending ({report?.error || 'ADSENSE_NOT_CONNECTED'})
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-3xl leading-relaxed">
              {report?.message ||
                'The dashboard chart and tables are wired to the exact worker.js AdSense v2 response schema. Add your Google OAuth credentials in Settings → Secrets (or Cloudflare Worker secrets + KV) to pull live earnings.'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Required Server / Worker Configuration
              </h3>
              <dl className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="font-mono text-zinc-600 dark:text-zinc-400">ADSENSE_ACCOUNT</dt>
                  <dd className="font-mono text-zinc-900 dark:text-zinc-100">
                    {status?.account || 'accounts/pub-9777611286139666'}
                  </dd>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="font-mono text-zinc-600 dark:text-zinc-400">
                    GOOGLE_CLIENT_ID / SECRET
                  </dt>
                  <dd
                    className={
                      status?.oauthClientConfigured
                        ? 'font-medium text-emerald-700 dark:text-emerald-400'
                        : 'font-medium text-amber-700 dark:text-amber-400'
                    }
                  >
                    {status?.oauthClientConfigured ? 'Configured' : 'Missing in Secrets'}
                  </dd>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="font-mono text-zinc-600 dark:text-zinc-400">
                    GOOGLE_ADSENSE_REFRESH_TOKEN (KV: {status?.kvKey || 'pb:adsense:refresh:v1'})
                  </dt>
                  <dd
                    className={
                      status?.refreshTokenPresent
                        ? 'font-medium text-emerald-700 dark:text-emerald-400'
                        : 'font-medium text-amber-700 dark:text-amber-400'
                    }
                  >
                    {status?.refreshTokenPresent ? 'Stored' : 'Not Connected'}
                  </dd>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="font-mono text-zinc-600 dark:text-zinc-400">
                    GOOGLE_SERVICE_ACCOUNT_JSON (RS256 Fallback)
                  </dt>
                  <dd
                    className={
                      status?.serviceAccountConfigured
                        ? 'font-medium text-emerald-700 dark:text-emerald-400'
                        : 'font-medium text-amber-700 dark:text-amber-400'
                    }
                  >
                    {status?.serviceAccountConfigured
                      ? status.serviceAccountEmail || 'Configured'
                      : 'Not Set in Secrets'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Two Ways to Connect Live AdSense Earnings
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Google rejects standard API keys on AdSense Management API v2 by design. Configure either server-side path below:
              </p>
              <ol className="list-decimal list-inside text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5">
                <li>
                  <strong className="text-zinc-900 dark:text-zinc-200">Service Account (RS256)</strong>: Store a freshly generated JSON key in <span className="font-mono">GOOGLE_SERVICE_ACCOUNT_JSON</span> under Settings → Secrets, enable <strong className="text-zinc-900 dark:text-zinc-200">AdSense Management API</strong> on that GCP project, and add the service account email as a <strong className="text-zinc-900 dark:text-zinc-200">Read</strong> user in <span className="font-mono">adsense.google.com → Account → Access → Users</span>.
                </li>
                <li>
                  <strong className="text-zinc-900 dark:text-zinc-200">OAuth 2.0 (Priority)</strong>: Set <span className="font-mono">GOOGLE_CLIENT_ID</span>, <span className="font-mono">GOOGLE_CLIENT_SECRET</span>, and <span className="font-mono">GOOGLE_ADSENSE_REFRESH_TOKEN</span> (or Cloudflare KV <span className="font-mono">pb:adsense:refresh:v1</span>).
                </li>
                <li>
                  Confirm all 5 PlayBeat domains show <strong className="text-zinc-900 dark:text-zinc-200">Ready</strong> with <strong className="text-zinc-900 dark:text-zinc-200">Auto ads ON</strong> in AdSense Console.
                </li>
              </ol>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs">
              <span className="text-zinc-500 dark:text-zinc-400">Verified ads.txt line: </span>
              <code className="font-mono text-zinc-900 dark:text-zinc-100">
                {status?.adsTxtLine || 'google.com, pub-9777611286139666, DIRECT, f08c47fec0942fa0'}
              </code>
            </div>
            <button
              type="button"
              onClick={handleCopyAdsTxt}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              {copiedAdsTxt ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAdsTxt ? 'Copied' : 'Copy ads.txt'}</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
