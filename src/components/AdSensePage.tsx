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
  Activity,
  BarChart3,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  Link2,
  Plus,
  RefreshCw,
  Share2,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  AdSenseAnalyticsResponse,
  AdSenseRange,
  AdSenseStatus,
  GoogleServiceAccountSummary,
  GoogleServiceProbeResponse,
  GoogleTrafficReportResponse,
} from '../types/admin';
import type { NavSection } from './AdminShell';
import { api } from '../lib/api';

interface AdSensePageProps {
  onNavigate?: (section: NavSection) => void;
}

type ActiveTab = 'revenue' | 'traffic' | 'service_accounts';

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
  const [activeTab, setActiveTab] = useState<ActiveTab>('revenue');
  const [range, setRange] = useState<AdSenseRange>('7d');
  const [by, setBy] = useState<'date' | 'domain'>('date');
  const [metric, setMetric] = useState<MetricKey>('earnings');

  // AdSense state
  const [status, setStatus] = useState<AdSenseStatus | null>(null);
  const [report, setReport] = useState<AdSenseAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // GA4 & Search Console Traffic state
  const [traffic, setTraffic] = useState<GoogleTrafficReportResponse | null>(null);
  const [trafficLoading, setTrafficLoading] = useState(false);

  // Google Service Accounts state
  const [accounts, setAccounts] = useState<GoogleServiceAccountSummary[]>([]);
  const [saLoading, setSaLoading] = useState(false);
  const [probeResult, setProbeResult] = useState<GoogleServiceProbeResponse | null>(null);
  const [probingId, setProbingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newJson, setNewJson] = useState('');
  const [newAdsenseId, setNewAdsenseId] = useState('accounts/pub-9777611286139666');
  const [newGa4Id, setNewGa4Id] = useState('');
  const [newSearchSite, setNewSearchSite] = useState('https://playbeat.digital/');
  const [savingSa, setSavingSa] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    label: string;
    adsenseAccountId: string;
    ga4PropertyId: string;
    searchConsoleSite: string;
  }>({ label: '', adsenseAccountId: '', ga4PropertyId: '', searchConsoleSite: '' });

  // General UI feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  const [connecting, setConnecting] = useState(false);

  async function loadAdSense(currentRange: AdSenseRange, currentBy: 'date' | 'domain') {
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

  async function loadServiceAccounts() {
    setSaLoading(true);
    try {
      const res = await api.googleServiceAccounts();
      setAccounts(res.accounts || []);
    } catch (err) {
      setNotice({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Could not load Google Service Accounts.',
      });
    } finally {
      setSaLoading(false);
    }
  }

  async function loadTraffic(currentRange: AdSenseRange) {
    setTrafficLoading(true);
    try {
      const res = await api.googleTrafficAnalytics(currentRange);
      setTraffic(res);
    } catch (err) {
      setTraffic({
        ok: false,
        range: currentRange,
        propertyId: '',
        error: 'TRAFFIC_FETCH_FAILED',
        message: err instanceof Error ? err.message : 'Failed to load GA4 traffic analytics.',
      });
    } finally {
      setTrafficLoading(false);
    }
  }

  useEffect(() => {
    loadAdSense(range, by);
  }, [range, by]);

  useEffect(() => {
    loadServiceAccounts();
  }, []);

  useEffect(() => {
    if (activeTab === 'traffic') {
      loadTraffic(range);
    }
  }, [activeTab, range]);

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
        setNotice({ tone: 'info', text: 'Google AdSense connected via OAuth 2.0. Refreshing report...' });
        loadAdSense(range, by);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [range, by]);

  async function handleConnectAdSenseOAuth() {
    setConnecting(true);
    setNotice(null);
    try {
      const res = await api.getChannelOAuthUrl('google_adsense', window.location.origin);
      const popup = window.open(res.url, 'playbeat_adsense_oauth', 'width=620,height=740');
      if (!popup) {
        setNotice({ tone: 'error', text: 'Allow popups for this site to complete Google AdSense sign-in.' });
      }
    } catch (err) {
      setNotice({
        tone: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET or use Google Service Accounts tab.',
      });
    } finally {
      setConnecting(false);
    }
  }

  function handleCopy(key: string, value: string) {
    if (!value) return;
    navigator.clipboard?.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  }

  async function handleProbeAccount(id: string) {
    setProbingId(id);
    setNotice(null);
    try {
      const res = await api.probeGoogleServiceAccount(id);
      setProbeResult(res);
      await loadServiceAccounts();
    } catch (err) {
      setNotice({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Service account API probe failed.',
      });
    } finally {
      setProbingId(null);
    }
  }

  async function handleSetActiveAccount(id: string) {
    setNotice(null);
    try {
      await api.updateGoogleServiceAccount(id, { active: true });
      await loadServiceAccounts();
      await loadAdSense(range, by);
      if (activeTab === 'traffic') await loadTraffic(range);
      setNotice({ tone: 'info', text: 'Active Google Service Account updated for AdSense & Traffic analytics.' });
    } catch (err) {
      setNotice({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Failed to switch active service account.',
      });
    }
  }

  async function handleSaveEdit(id: string) {
    setNotice(null);
    try {
      await api.updateGoogleServiceAccount(id, editDraft);
      setEditingId(null);
      await loadServiceAccounts();
      await loadAdSense(range, by);
      if (activeTab === 'traffic') await loadTraffic(range);
      setNotice({ tone: 'info', text: 'Updated Google Service Account property bindings.' });
    } catch (err) {
      setNotice({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Could not save property bindings.',
      });
    }
  }

  async function handleApplyDiscovered(accountId: string, service: 'adsense' | 'ga4' | 'search_console', value: string) {
    setNotice(null);
    try {
      const payload =
        service === 'adsense'
          ? { adsenseAccountId: value }
          : service === 'ga4'
            ? { ga4PropertyId: value }
            : { searchConsoleSite: value };
      await api.updateGoogleServiceAccount(accountId, payload);
      await loadServiceAccounts();
      await loadAdSense(range, by);
      setNotice({ tone: 'info', text: `Bound ${value} to active Google Service Account.` });
    } catch (err) {
      setNotice({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Could not bind discovered resource.',
      });
    }
  }

  async function handleAddServiceAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newJson.trim()) {
      setNotice({ tone: 'error', text: 'Paste or upload a valid Google Service Account JSON file.' });
      return;
    }
    setSavingSa(true);
    setNotice(null);
    try {
      const res = await api.addGoogleServiceAccount({
        label: newLabel.trim() || 'PlayBeat GCP Service Account',
        serviceAccountJson: newJson.trim(),
        adsenseAccountId: newAdsenseId.trim(),
        ga4PropertyId: newGa4Id.trim(),
        searchConsoleSite: newSearchSite.trim(),
        setActive: true,
      });
      setShowAddForm(false);
      setNewLabel('');
      setNewJson('');
      await loadServiceAccounts();
      await loadAdSense(range, by);
      setNotice({
        tone: 'info',
        text: `Added and activated ${res.account.clientEmail}. Click "Probe APIs" to test AdSense, GA4, and Search Console.`,
      });
    } catch (err) {
      setNotice({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Failed to add service account.',
      });
    } finally {
      setSavingSa(false);
    }
  }

  async function handleDeleteServiceAccount(id: string) {
    setNotice(null);
    try {
      await api.deleteGoogleServiceAccount(id);
      if (probeResult?.accountId === id) setProbeResult(null);
      await loadServiceAccounts();
      await loadAdSense(range, by);
      setNotice({ tone: 'info', text: 'Removed custom Google Service Account.' });
    } catch (err) {
      setNotice({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete service account.',
      });
    }
  }

  function handleJsonFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setNewJson(text);
      try {
        const parsed = JSON.parse(text);
        if (!newLabel && parsed.project_id) {
          setNewLabel(`${parsed.project_id} Service Account`);
        }
      } catch {
        // user will see validation error on submit
      }
    };
    reader.readAsText(file);
  }

  const activeMetric = METRICS.find((m) => m.key === metric) || METRICS[0];
  const chartData = by === 'date' ? report?.daily || [] : report?.domains || [];
  const activeSa = accounts.find((a) => a.active) || accounts[0] || null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Google Service Accounts · AdSense Revenue & Traffic
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage Google Cloud RS256 service accounts, live AdSense Management API v2 earnings, GA4 traffic reports, and Search Console visibility for{' '}
            <span className="font-mono text-xs">{status?.publisherId || 'ca-pub-9777611286139666'}</span>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            disabled={connecting}
            onClick={handleConnectAdSenseOAuth}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs paper-btn-primary disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>{status?.refreshTokenPresent ? 'Reconnect OAuth' : 'Connect Google OAuth'}</span>
          </button>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('channels')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-lg hover:bg-zinc-50 dark:hover:bg-[#132240] transition-colors whitespace-nowrap shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>All Ad & Social Logins</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              loadAdSense(range, by);
              loadServiceAccounts();
              if (activeTab === 'traffic') loadTraffic(range);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-lg hover:bg-zinc-50 dark:hover:bg-[#132240] transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Active Service Account Banner */}
      {activeSa && (
        <div className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0 text-[#1e40af] dark:text-[#93c5fd]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-zinc-950 dark:text-zinc-50">
                  Active Google Service Account:
                </span>
                <span className="font-mono text-xs text-blue-700 dark:text-blue-300 truncate">
                  {activeSa.clientEmail}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Project <span className="font-mono">{activeSa.projectId || '—'}</span> · AdSense{' '}
                <span className="font-mono">{activeSa.adsenseAccountId || 'accounts/pub-9777611286139666'}</span> · GA4{' '}
                <span className="font-mono">{activeSa.ga4PropertyId || 'Auto-discover'}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleCopy('active_sa_email', activeSa.clientEmail)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-slate-700/70 rounded-lg hover:bg-zinc-50 dark:hover:bg-[#132240] whitespace-nowrap"
            >
              {copiedKey === 'active_sa_email' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedKey === 'active_sa_email' ? 'Email Copied' : 'Copy SA Email'}</span>
            </button>
            <button
              type="button"
              disabled={probingId === activeSa.id}
              onClick={() => {
                setActiveTab('service_accounts');
                handleProbeAccount(activeSa.id);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold paper-btn-primary disabled:opacity-60 rounded-lg whitespace-nowrap"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{probingId === activeSa.id ? 'Probing APIs...' : 'Probe AdSense & GA4'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Primary Section Tabs */}
      <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-zinc-100 dark:bg-[#060e20] border border-zinc-200 dark:border-slate-700/60 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('revenue')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'revenue'
              ? 'bg-white dark:bg-[#081226] text-zinc-950 dark:text-zinc-50 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>AdSense Revenue</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('traffic')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'traffic'
              ? 'bg-white dark:bg-[#081226] text-zinc-950 dark:text-zinc-50 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>GA4 & Search Traffic</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('service_accounts')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'service_accounts'
              ? 'bg-white dark:bg-[#081226] text-zinc-950 dark:text-zinc-50 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Google Service Accounts ({accounts.length})</span>
        </button>
      </div>

      {notice && (
        <div
          role="status"
          className={`px-4 py-3 text-xs rounded-lg border ${
            notice.tone === 'error'
              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
              : 'bg-zinc-100 dark:bg-[#0d182e] border-zinc-200 dark:border-slate-700/60 text-zinc-800 dark:text-zinc-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* ==================== TAB 1: ADSENSE REVENUE ==================== */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-4">
            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-zinc-100 dark:bg-[#060e20] border border-zinc-200 dark:border-slate-700/60 rounded-lg">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRange(r.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    range === r.value
                      ? 'bg-white dark:bg-[#081226] text-zinc-950 dark:text-zinc-50 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center p-1 bg-zinc-100 dark:bg-[#060e20] border border-zinc-200 dark:border-slate-700/60 rounded-lg">
              <button
                type="button"
                onClick={() => setBy('date')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  by === 'date'
                    ? 'bg-white dark:bg-[#081226] text-zinc-950 dark:text-zinc-50 shadow-xs'
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
                    ? 'bg-white dark:bg-[#081226] text-zinc-950 dark:text-zinc-50 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                }`}
              >
                By Domain (5 Sites)
              </button>
            </div>
          </div>

          {loading ? (
            <div className="h-80 bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl animate-pulse" />
          ) : report?.ok && chartData.length > 0 ? (
            <div className="space-y-6">
              {report.totals && (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-4">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Est. Earnings</p>
                    <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums">
                      ${report.totals.earnings.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-4">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Page Views</p>
                    <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums">
                      {report.totals.pageViews.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-4">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Impressions</p>
                    <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums">
                      {report.totals.impressions.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-4">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Clicks</p>
                    <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums">
                      {report.totals.clicks.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-4">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Page RPM</p>
                    <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums">
                      ${report.totals.rpm.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-4">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">CTR</p>
                    <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums">
                      {report.totals.ctr.toFixed(2)}%
                    </p>
                  </div>
                </div>
              )}

              <section className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-slate-700/60">
                  <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                    {activeMetric.label} ({by === 'date' ? 'Daily Trend' : 'Domain Breakdown'})
                  </h2>
                  <div className="inline-flex items-center p-1 bg-zinc-100 dark:bg-[#060e20] border border-zinc-200 dark:border-slate-700/60 rounded-lg">
                    {METRICS.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setMetric(m.key)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                          metric === m.key
                            ? 'bg-white dark:bg-[#081226] text-zinc-950 dark:text-zinc-50 shadow-xs'
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
                          fill="#3b82f6"
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
                        <Bar dataKey={metric} name={activeMetric.label} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-200 dark:border-slate-700/60">
                  <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                    {by === 'date' ? 'Daily Metrics Table' : 'Per-Domain Metrics Table'}
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-slate-700/60 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        <th className="py-3 px-6">{by === 'date' ? 'Date' : 'Domain'}</th>
                        <th className="py-3 px-4 text-right">Est. Earnings</th>
                        <th className="py-3 px-4 text-right">Page Views</th>
                        <th className="py-3 px-4 text-right">Impressions</th>
                        <th className="py-3 px-4 text-right">Clicks</th>
                        <th className="py-3 px-6 text-right">Page RPM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-slate-700/50 text-sm font-mono tabular-nums">
                      {chartData.map(
                        (row: {
                          date?: string;
                          domain?: string;
                          earnings: number;
                          pageViews: number;
                          impressions: number;
                          clicks: number;
                        }) => {
                          const label = row.date || row.domain || '';
                          const rpm = row.pageViews > 0 ? (row.earnings / row.pageViews) * 1000 : 0;
                          return (
                            <tr key={label} className="hover:bg-zinc-50 dark:hover:bg-[#132240]/40">
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
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          ) : (
            <section className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-6 space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-base font-semibold text-amber-700 dark:text-amber-400">
                  AdSense Access Verification Needed ({report?.error || 'PERMISSION_REQUIRED'})
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-3xl leading-relaxed">
                  {report?.message ||
                    'Your Google Service Account is authenticated via RS256 and AdSense Management API v2 is enabled. Grant it Read access inside Google AdSense to stream live earnings.'}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-zinc-200 dark:border-slate-700/60">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    Active Server / Worker Credentials
                  </h3>
                  <dl className="divide-y divide-zinc-100 dark:divide-slate-700/50 text-xs">
                    <div className="py-2.5 flex items-center justify-between gap-4">
                      <dt className="font-mono text-zinc-600 dark:text-zinc-400">ADSENSE_ACCOUNT</dt>
                      <dd className="font-mono text-zinc-900 dark:text-zinc-100">
                        {status?.account || 'accounts/pub-9777611286139666'}
                      </dd>
                    </div>
                    <div className="py-2.5 flex items-center justify-between gap-4">
                      <dt className="font-mono text-zinc-600 dark:text-zinc-400">GOOGLE_SERVICE_ACCOUNT_JSON</dt>
                      <dd className="font-medium text-emerald-700 dark:text-emerald-400 truncate">
                        {status?.serviceAccountConfigured
                          ? status.serviceAccountEmail || 'Configured'
                          : 'Not Set'}
                      </dd>
                    </div>
                    <div className="py-2.5 flex items-center justify-between gap-4">
                      <dt className="font-mono text-zinc-600 dark:text-zinc-400">AdSense Management API v2</dt>
                      <dd className="font-medium text-emerald-700 dark:text-emerald-400">Enabled on GCP</dd>
                    </div>
                    <div className="py-2.5 flex items-center justify-between gap-4">
                      <dt className="font-mono text-zinc-600 dark:text-zinc-400">OAuth Refresh Token</dt>
                      <dd className={status?.refreshTokenPresent ? 'font-medium text-emerald-700 dark:text-emerald-400' : 'text-zinc-500'}>
                        {status?.refreshTokenPresent ? 'Connected' : 'Optional Fallback'}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    1-Step AdSense Read Grant
                  </h3>
                  <ol className="list-decimal list-inside text-xs text-zinc-600 dark:text-zinc-400 space-y-2 leading-relaxed">
                    <li>
                      Open{' '}
                      <a
                        href="https://www.google.com/adsense"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#1e40af] dark:text-[#93c5fd] hover:underline font-medium"
                      >
                        Google AdSense → Account → Access and Authorization → User Management
                      </a>
                      .
                    </li>
                    <li>
                      Add your active service account email:{' '}
                      <code className="font-mono text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-[#081226] px-1.5 py-0.5 rounded">
                        {status?.serviceAccountEmail || 'firebase-adminsdk-fbsvc@gen-lang-client-0365890093.iam.gserviceaccount.com'}
                      </code>
                    </li>
                    <li>
                      Click <strong className="text-zinc-900 dark:text-zinc-200">Refresh</strong> above or run{' '}
                      <strong className="text-zinc-900 dark:text-zinc-200">Probe AdSense & GA4</strong> to stream live daily and 5-domain revenue.
                    </li>
                  </ol>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">Verified ads.txt line: </span>
                  <code className="font-mono text-zinc-900 dark:text-zinc-100">
                    {status?.adsTxtLine || 'google.com, pub-9777611286139666, DIRECT, f08c47fec0942fa0'}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      'adstxt',
                      status?.adsTxtLine || 'google.com, pub-9777611286139666, DIRECT, f08c47fec0942fa0',
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-slate-700/70 rounded-lg hover:bg-zinc-50 dark:hover:bg-[#132240] whitespace-nowrap shrink-0 self-start sm:self-auto"
                >
                  {copiedKey === 'adstxt' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'adstxt' ? 'Copied' : 'Copy ads.txt'}</span>
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ==================== TAB 2: GA4 & SEARCH TRAFFIC ==================== */}
      {activeTab === 'traffic' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-4">
            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-zinc-100 dark:bg-[#060e20] border border-zinc-200 dark:border-slate-700/60 rounded-lg">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRange(r.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    range === r.value
                      ? 'bg-white dark:bg-[#081226] text-zinc-950 dark:text-zinc-50 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              GA4 Property: {traffic?.propertyId || activeSa?.ga4PropertyId || 'Auto-discover'}
            </div>
          </div>

          {trafficLoading ? (
            <div className="h-80 bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl animate-pulse" />
          ) : traffic?.ok && traffic.totals ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Active Users</p>
                  <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums">
                    {traffic.totals.activeUsers.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Sessions</p>
                  <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums">
                    {traffic.totals.sessions.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Page Views</p>
                  <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums">
                    {traffic.totals.pageViews.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Avg Bounce Rate</p>
                  <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums">
                    {traffic.totals.avgBounceRate}%
                  </p>
                </div>
                <div className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Avg Session</p>
                  <p className="mt-1.5 text-xl font-semibold font-mono tabular-nums">
                    {traffic.totals.avgSessionDurationSec}s
                  </p>
                </div>
              </div>

              <section className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-6">
                <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50 pb-4 border-b border-zinc-200 dark:border-slate-700/60">
                  Daily Traffic Trend (GA4 Data API v1beta)
                </h2>
                <div className="h-72 pt-5">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={traffic.daily || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.4} />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#71717a" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#71717a" />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="pageViews"
                        name="Page Views"
                        stroke="#2563eb"
                        fill="#3b82f6"
                        fillOpacity={0.14}
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="activeUsers"
                        name="Active Users"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-200 dark:border-slate-700/60">
                    <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Top Storefront Pages</h3>
                  </div>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-slate-700/60 text-zinc-500">
                        <th className="py-2.5 px-6">Path</th>
                        <th className="py-2.5 px-4 text-right">Views</th>
                        <th className="py-2.5 px-6 text-right">Users</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-slate-700/50 font-mono">
                      {(traffic.topPages || []).map((row) => (
                        <tr key={row.path}>
                          <td className="py-2.5 px-6 text-zinc-900 dark:text-zinc-100 truncate max-w-xs">{row.path}</td>
                          <td className="py-2.5 px-4 text-right">{row.views.toLocaleString()}</td>
                          <td className="py-2.5 px-6 text-right">{row.users.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                <section className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-200 dark:border-slate-700/60">
                    <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Traffic Channels</h3>
                  </div>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-slate-700/60 text-zinc-500">
                        <th className="py-2.5 px-6">Channel Group</th>
                        <th className="py-2.5 px-4 text-right">Sessions</th>
                        <th className="py-2.5 px-6 text-right">Users</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-slate-700/50 font-mono">
                      {(traffic.channels || []).map((row) => (
                        <tr key={row.channel}>
                          <td className="py-2.5 px-6 font-sans text-zinc-900 dark:text-zinc-100">{row.channel}</td>
                          <td className="py-2.5 px-4 text-right">{row.sessions.toLocaleString()}</td>
                          <td className="py-2.5 px-6 text-right">{row.users.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </div>
            </div>
          ) : (
            <section className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                GA4 Traffic Feed Ready — Bind a Property ID
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-3xl leading-relaxed">
                {traffic?.message ||
                  'Google Analytics 4 Admin & Data APIs are enabled on your active service account. Grant Viewer access in GA4 Property Access Management and enter your GA4 Property ID to stream live users, sessions, top pages, and acquisition channels.'}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('service_accounts')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs paper-btn-primary rounded-lg"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Configure GA4 Property in Service Accounts</span>
                </button>
                <a
                  href="https://analytics.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-slate-700/70 rounded-lg hover:bg-zinc-50 dark:hover:bg-[#132240]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Google Analytics Admin</span>
                </a>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ==================== TAB 3: GOOGLE SERVICE ACCOUNTS ==================== */}
      {activeTab === 'service_accounts' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                Registered Google Service Accounts (RS256)
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Private keys are stored strictly on the server (Cloudflare Worker Secrets / KV) and never exposed back to the browser.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs paper-btn-primary rounded-lg whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cancel' : 'Add Service Account JSON'}</span>
            </button>
          </div>

          {showAddForm && (
            <form
              onSubmit={handleAddServiceAccount}
              className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  Import Google Cloud Service Account JSON
                </h3>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-slate-700/70 rounded-lg hover:bg-zinc-50 dark:hover:bg-[#132240] cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload .json File</span>
                  <input type="file" accept=".json,application/json" onChange={handleJsonFileUpload} className="hidden" />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Account Label
                  </label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. PlayBeat AdSense & GA4 Key"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-slate-700/70 bg-white dark:bg-[#060e20]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    AdSense Account ID
                  </label>
                  <input
                    type="text"
                    value={newAdsenseId}
                    onChange={(e) => setNewAdsenseId(e.target.value)}
                    placeholder="accounts/pub-9777611286139666"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-200 dark:border-slate-700/70 bg-white dark:bg-[#060e20]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    GA4 Property ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={newGa4Id}
                    onChange={(e) => setNewGa4Id(e.target.value)}
                    placeholder="properties/123456789"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-200 dark:border-slate-700/70 bg-white dark:bg-[#060e20]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Search Console Site URL
                  </label>
                  <input
                    type="text"
                    value={newSearchSite}
                    onChange={(e) => setNewSearchSite(e.target.value)}
                    placeholder="https://playbeat.digital/"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-200 dark:border-slate-700/70 bg-white dark:bg-[#060e20]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Service Account JSON Key
                </label>
                <textarea
                  rows={5}
                  value={newJson}
                  onChange={(e) => setNewJson(e.target.value)}
                  placeholder='{"type":"service_account","project_id":"...","client_email":"...","private_key":"<paste full JSON from Google Cloud IAM>"}'
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-200 dark:border-slate-700/70 bg-white dark:bg-[#060e20]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-slate-700/70 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSa}
                  className="px-4 py-2 text-xs paper-btn-primary disabled:opacity-60 rounded-lg"
                >
                  {savingSa ? 'Saving...' : 'Save & Activate'}
                </button>
              </div>
            </form>
          )}

          {saLoading ? (
            <div className="h-40 bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl animate-pulse" />
          ) : (
            <div className="space-y-4">
              {accounts.map((acc) => {
                const isEditing = editingId === acc.id;
                return (
                  <div
                    key={acc.id}
                    className={`bg-white dark:bg-[#0d182e] border rounded-xl p-5 space-y-4 ${
                      acc.active
                        ? 'border-blue-500/70 dark:border-blue-500/60'
                        : 'border-zinc-200 dark:border-slate-700/60'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{acc.label}</h3>
                          {acc.active && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Active
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-zinc-500">
                            {acc.source === 'secret' ? 'Worker Secret' : 'KV Vault'}
                          </span>
                        </div>
                        <p className="font-mono text-xs text-blue-700 dark:text-blue-400 break-all">
                          {acc.clientEmail}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                          Project: {acc.projectId || '—'} · Key ID: {acc.privateKeyId ? `${acc.privateKeyId.slice(0, 14)}…` : '—'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(acc.id, acc.clientEmail)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-slate-700/70 rounded-lg hover:bg-zinc-50 dark:hover:bg-[#132240]"
                        >
                          {copiedKey === acc.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === acc.id ? 'Copied' : 'Copy Email'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={probingId === acc.id}
                          onClick={() => handleProbeAccount(acc.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs paper-btn-primary disabled:opacity-60 rounded-lg"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span>{probingId === acc.id ? 'Probing...' : 'Probe APIs'}</span>
                        </button>
                        {!acc.active && (
                          <button
                            type="button"
                            onClick={() => handleSetActiveAccount(acc.id)}
                            className="px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-slate-700/70 rounded-lg hover:bg-zinc-50 dark:hover:bg-[#132240]"
                          >
                            Set Active
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditing) {
                              setEditingId(null);
                            } else {
                              setEditingId(acc.id);
                              setEditDraft({
                                label: acc.label,
                                adsenseAccountId: acc.adsenseAccountId,
                                ga4PropertyId: acc.ga4PropertyId,
                                searchConsoleSite: acc.searchConsoleSite,
                              });
                            }
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-slate-700/70 rounded-lg hover:bg-zinc-50 dark:hover:bg-[#132240]"
                        >
                          {isEditing ? 'Close' : 'Configure IDs'}
                        </button>
                        {acc.source === 'kv' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteServiceAccount(acc.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                            title="Delete service account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-zinc-200 dark:border-slate-700/60">
                        <div>
                          <label className="block text-[11px] font-medium text-zinc-500 mb-1">Label</label>
                          <input
                            type="text"
                            value={editDraft.label}
                            onChange={(e) => setEditDraft({ ...editDraft, label: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-slate-700/70 bg-white dark:bg-[#060e20]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-zinc-500 mb-1">AdSense Account</label>
                          <input
                            type="text"
                            value={editDraft.adsenseAccountId}
                            onChange={(e) => setEditDraft({ ...editDraft, adsenseAccountId: e.target.value })}
                            className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-zinc-200 dark:border-slate-700/70 bg-white dark:bg-[#060e20]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-zinc-500 mb-1">GA4 Property ID</label>
                          <input
                            type="text"
                            value={editDraft.ga4PropertyId}
                            onChange={(e) => setEditDraft({ ...editDraft, ga4PropertyId: e.target.value })}
                            placeholder="properties/123456789"
                            className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-zinc-200 dark:border-slate-700/70 bg-white dark:bg-[#060e20]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-zinc-500 mb-1">Search Console Site</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editDraft.searchConsoleSite}
                              onChange={(e) => setEditDraft({ ...editDraft, searchConsoleSite: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-zinc-200 dark:border-slate-700/70 bg-white dark:bg-[#060e20]"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(acc.id)}
                              className="px-3 py-1.5 text-xs paper-btn-primary rounded-lg shrink-0"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-zinc-100 dark:border-slate-700/50 text-xs">
                        <div>
                          <span className="text-zinc-500">AdSense Account: </span>
                          <span className="font-mono text-zinc-900 dark:text-zinc-100">{acc.adsenseAccountId || '—'}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">GA4 Property: </span>
                          <span className="font-mono text-zinc-900 dark:text-zinc-100">
                            {acc.ga4PropertyId || 'Auto-discover'}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Search Console: </span>
                          <span className="font-mono text-zinc-900 dark:text-zinc-100">{acc.searchConsoleSite || '—'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Live Multi-API Probe Diagnostics */}
          {probeResult && (
            <section className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    Live Google API Scope & Permission Probe
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono">
                    {probeResult.clientEmail} · checked {new Date(probeResult.checkedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-slate-700/50">
                {probeResult.checks.map((chk) => (
                  <div key={chk.service} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{chk.name}</span>
                        <span
                          className={`text-xs font-medium ${
                            chk.accessGranted
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : chk.apiEnabled
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-red-700 dark:text-red-400'
                          }`}
                        >
                          {chk.accessGranted
                            ? 'Connected & Accessible'
                            : chk.apiEnabled
                              ? 'API Enabled · Grant User Access'
                              : 'API Disabled on GCP'}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-500">HTTP {chk.httpStatus}</span>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
                        {chk.detail}
                      </p>
                      {chk.discoveredItems.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {chk.discoveredItems.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleApplyDiscovered(probeResult.accountId, chk.service, item.id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100"
                            >
                              <span>Use {item.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {chk.actionUrl && (
                      <a
                        href={chk.actionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-slate-700/70 rounded-lg hover:bg-zinc-50 dark:hover:bg-[#132240] whitespace-nowrap self-start lg:self-center"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Console</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
