import React, { useEffect, useState } from 'react';
import {
  Activity,
  Check,
  Copy,
  ExternalLink,
  Gauge,
  KeyRound,
  Link2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import type { ElectronicFirstApiResult, ElectronicFirstStatus } from '../types/admin';
import { api } from '../lib/api';

type EfTab = 'balance' | 'payouts' | 'conversions';

const EF_SPEC_PROPERTIES = [
  { label: 'Base URL', value: 'https://www.electronicfirst.com/api/dev/v1' },
  { label: 'Header Name', value: 'Api-Key: <your_developer_api_key>' },
  { label: 'Content Type', value: 'application/json' },
  { label: 'Accept Header', value: 'application/json' },
  { label: 'Rate Limit', value: '30 requests / minute (rolling window)' },
];

const EF_ERROR_CODES = [
  {
    status: '401',
    code: 'missing_api_key',
    action:
      'The Api-Key header was omitted. Configure ELECTRONIC_FIRST_API_KEY as an encrypted server or Worker secret.',
  },
  {
    status: '401',
    code: 'invalid_api_key',
    action:
      'The supplied API key is not recognized. Verify or regenerate your key in Electronic First Dashboard -> Settings -> Developer.',
  },
  {
    status: '401',
    code: 'api_key_disabled',
    action:
      'The API key is currently deactivated. Toggle the Developer API key back ON in your Electronic First account settings.',
  },
  {
    status: '401',
    code: 'ip_not_whitelisted',
    action:
      'Your server egress IP is not permitted by your API key IP whitelist. Add the egress IP or disable IP restriction.',
  },
  {
    status: '403',
    code: 'forbidden',
    action:
      'The specified affiliate_ref is invalid or does not belong to your account. Verify ELECTRONIC_FIRST_AFFILIATE_REF.',
  },
  {
    status: '429',
    code: 'too_many_requests',
    action:
      'Rate limit exceeded (30 requests/minute). Wait for the rolling 60-second window to reset before retrying.',
  },
];

export function AffiliatePage() {
  const [status, setStatus] = useState<ElectronicFirstStatus | null>(null);
  const [activeTab, setActiveTab] = useState<EfTab>('balance');
  const [pingResult, setPingResult] = useState<ElectronicFirstApiResult | null>(null);
  const [tabResult, setTabResult] = useState<ElectronicFirstApiResult | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [pinging, setPinging] = useState(false);
  const [loadingTab, setLoadingTab] = useState(false);
  const [copiedField, setCopiedField] = useState<'ref' | 'short' | null>(null);

  async function loadStatus() {
    setLoadingStatus(true);
    try {
      const res = await api.efStatus();
      setStatus(res);
    } finally {
      setLoadingStatus(false);
    }
  }

  async function loadTabData(tab: EfTab) {
    setLoadingTab(true);
    try {
      const res =
        tab === 'balance'
          ? await api.efBalance()
          : tab === 'payouts'
            ? await api.efPayouts()
            : await api.efConversions();
      setTabResult(res);
      setStatus((prev) => (prev ? { ...prev, rateLimit: res.rateLimit } : prev));
    } finally {
      setLoadingTab(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab]);

  async function handlePing() {
    setPinging(true);
    try {
      const res = await api.efPing();
      setPingResult(res);
      setStatus((prev) => (prev ? { ...prev, rateLimit: res.rateLimit } : prev));
    } finally {
      setPinging(false);
    }
  }

  function handleCopy(value: string, field: 'ref' | 'short') {
    navigator.clipboard?.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1600);
  }

  function renderDataRows(data: unknown) {
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return (
          <p className="py-8 text-center text-sm text-[#475a78] dark:text-slate-400">
            Electronic First returned an empty list for this endpoint.
          </p>
        );
      }
      const first = data[0];
      if (first && typeof first === 'object') {
        const columns = Object.keys(first as Record<string, unknown>).slice(0, 6);
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/60 text-xs font-semibold uppercase tracking-wider text-[#475a78] dark:text-slate-400">
                  {columns.map((col) => (
                    <th key={col} className="py-2.5 px-4">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs font-mono tabular-nums">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-[#132240]/50">
                    {columns.map((col) => (
                      <td key={col} className="py-2.5 px-4 text-[#0b162c] dark:text-slate-200">
                        {String((row as Record<string, unknown>)[col] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    }

    if (data && typeof data === 'object') {
      const entries = Object.entries(data as Record<string, unknown>);
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {entries.map(([k, v]) => (
            <div
              key={k}
              className="p-4 bg-slate-50/90 dark:bg-[#060e20]/80 border border-slate-200/80 dark:border-slate-700/60 rounded-xl"
            >
              <p className="text-xs font-medium text-[#475a78] dark:text-slate-400">{k}</p>
              <p className="mt-1 text-base font-semibold font-mono tabular-nums text-[#0b162c] dark:text-slate-50 break-all">
                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
              </p>
            </div>
          ))}
        </div>
      );
    }

    return (
      <pre className="p-4 text-xs font-mono bg-slate-50/90 dark:bg-[#060e20]/80 border border-slate-200/80 dark:border-slate-700/60 rounded-xl overflow-x-auto text-[#0b162c] dark:text-slate-200">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0b162c] dark:text-slate-50">
            Electronic First Affiliate API
          </h1>
          <p className="mt-1 text-sm text-[#475a78] dark:text-slate-400">
            Developer API <span className="font-mono text-xs">v1</span> · Header{' '}
            <span className="font-mono text-xs">Api-Key</span> · Throttled at 30 requests/minute.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            disabled={pinging}
            onClick={handlePing}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs paper-btn-primary disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{pinging ? 'Pinging...' : 'Run Ping Test'}</span>
          </button>
        </div>
      </div>

      {/* Top 4-column Silver-Navy Paper Stats strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="paper-stats-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[#475a78] dark:text-slate-400">
                Api-Key Secret
              </p>
              <p
                className={`mt-2 text-lg font-semibold ${
                  status?.configured
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {loadingStatus ? 'Checking...' : status?.configured ? 'Configured' : 'Secret Required'}
              </p>
            </div>
            <div className="sn-icon-well w-9 h-9 rounded-lg flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4 text-[#1e40af] dark:text-[#93c5fd]" />
            </div>
          </div>
          <p className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/50 text-[11px] text-[#6c7f9e] dark:text-slate-400 font-mono truncate">
            ELECTRONIC_FIRST_API_KEY
          </p>
        </div>

        <div className="paper-stats-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[#475a78] dark:text-slate-400">
                Affiliate Reference
              </p>
              <p className="mt-2 text-lg font-semibold font-mono text-[#0b162c] dark:text-slate-50">
                {status?.affiliateRef || 'ywzhmdg'}
              </p>
            </div>
            <div className="sn-icon-well w-9 h-9 rounded-lg flex items-center justify-center shrink-0">
              <Link2 className="w-4 h-4 text-[#1e40af] dark:text-[#93c5fd]" />
            </div>
          </div>
          <p className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/50 text-[11px] text-[#6c7f9e] dark:text-slate-400 truncate">
            {status?.accountEmail || 'business@playbeat.digital'}
          </p>
        </div>

        <div className="paper-stats-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[#475a78] dark:text-slate-400">
                Throttle Budget (60s)
              </p>
              <p className="mt-2 text-lg font-semibold font-mono tabular-nums text-[#0b162c] dark:text-slate-50">
                {status?.rateLimit.remaining ?? 30}{' '}
                <span className="text-sm font-normal text-[#6c7f9e] dark:text-slate-400">
                  / {status?.rateLimit.limitPerMin ?? 30}
                </span>
              </p>
            </div>
            <div className="sn-icon-well w-9 h-9 rounded-lg flex items-center justify-center shrink-0">
              <Gauge className="w-4 h-4 text-[#1e40af] dark:text-[#93c5fd]" />
            </div>
          </div>
          <p className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/50 text-[11px] text-[#6c7f9e] dark:text-slate-400">
            {status?.rateLimit.usedInWindow ?? 0} calls in rolling minute
          </p>
        </div>

        <div className="paper-stats-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[#475a78] dark:text-slate-400">
                Last Ping Test
              </p>
              <p
                className={`mt-2 text-lg font-semibold font-mono tabular-nums ${
                  pingResult
                    ? pingResult.ok
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-700 dark:text-amber-400'
                    : 'text-[#6c7f9e] dark:text-slate-400'
                }`}
              >
                {pingResult
                  ? pingResult.ok
                    ? `200 OK · ${pingResult.latencyMs}ms`
                    : `HTTP ${pingResult.httpStatus}`
                  : 'Not run'}
              </p>
            </div>
            <div className="sn-icon-well w-9 h-9 rounded-lg flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#1e40af] dark:text-[#93c5fd]" />
            </div>
          </div>
          <p className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/50 text-[11px] text-[#6c7f9e] dark:text-slate-400 truncate">
            {pingResult ? pingResult.errorCode || 'status: success' : 'GET /api/dev/v1/ping'}
          </p>
        </div>
      </section>

      {/* Ping Result Diagnostic Notice (shown when Run Ping Test has executed) */}
      {pingResult && (
        <section className="paper-card p-5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#0b162c] dark:text-slate-50">
              Ping Test Response —{' '}
              <span className="font-mono text-xs text-[#475a78] dark:text-slate-400">
                GET {status?.baseUrl || 'https://www.electronicfirst.com/api/dev/v1'}/ping
              </span>
            </h2>
            <span
              className={`text-xs font-mono font-semibold ${
                pingResult.ok
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              HTTP {pingResult.httpStatus} · {pingResult.latencyMs}ms
              {pingResult.errorCode ? ` · ${pingResult.errorCode}` : ''}
            </span>
          </div>
          {pingResult.ok ? (
            <pre className="p-3.5 text-xs font-mono bg-slate-50/90 dark:bg-[#060e20]/80 border border-slate-200/80 dark:border-slate-700/60 rounded-lg overflow-x-auto text-[#0b162c] dark:text-slate-200">
              {JSON.stringify({ status: 'success', data: pingResult.data }, null, 2)}
            </pre>
          ) : (
            <p className="text-xs text-[#475a78] dark:text-slate-300 leading-relaxed max-w-4xl">
              {pingResult.message}
            </p>
          )}
        </section>
      )}

      {/* Referral Links + Developer API v1 Spec */}
      <section className="paper-card p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[#0b162c] dark:text-slate-50">
              Authentication & Affiliate Links
            </h2>
            <p className="text-xs text-[#475a78] dark:text-slate-400 leading-relaxed max-w-3xl">
              All requests attach the server-side <span className="font-mono">Api-Key</span> HTTP header from encrypted secret{' '}
              <span className="font-mono">ELECTRONIC_FIRST_API_KEY</span>. Manage key status and optional IP whitelisting in Electronic First Dashboard → Settings → Developer.
            </p>
          </div>
          <a
            href={status?.affiliateLink || 'https://www.electronicfirst.com/?ref=ywzhmdg'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e40af] dark:text-[#93c5fd] hover:underline whitespace-nowrap shrink-0"
          >
            <span>Open Electronic First</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200/75 dark:border-slate-700/50">
          <div className="flex items-center justify-between gap-3 p-3.5 bg-slate-50/90 dark:bg-[#060e20]/80 border border-slate-200/80 dark:border-slate-700/60 rounded-xl">
            <div className="min-w-0">
              <p className="text-xs text-[#475a78] dark:text-slate-400">Primary Affiliate Link</p>
              <p className="mt-0.5 text-xs font-mono text-[#0b162c] dark:text-slate-100 truncate">
                {status?.affiliateLink || 'https://www.electronicfirst.com/?ref=ywzhmdg'}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  status?.affiliateLink || 'https://www.electronicfirst.com/?ref=ywzhmdg',
                  'ref',
                )
              }
              className="sn-btn-silver inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0"
            >
              {copiedField === 'ref' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedField === 'ref' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 p-3.5 bg-slate-50/90 dark:bg-[#060e20]/80 border border-slate-200/80 dark:border-slate-700/60 rounded-xl">
            <div className="min-w-0">
              <p className="text-xs text-[#475a78] dark:text-slate-400">Campaign Shortlink</p>
              <p className="mt-0.5 text-xs font-mono text-[#0b162c] dark:text-slate-100 truncate">
                {status?.shortLink || 'https://fas.st/t/WUFdhZbZ'}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                handleCopy(status?.shortLink || 'https://fas.st/t/WUFdhZbZ', 'short')
              }
              className="sn-btn-silver inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0"
            >
              {copiedField === 'short' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedField === 'short' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Spec & Standard Success Envelope */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-3 border-t border-slate-200/75 dark:border-slate-700/50">
          <div className="lg:col-span-2 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-700/60 text-[#475a78] dark:text-slate-400">
                  <th className="py-2 pr-4 font-semibold">Property</th>
                  <th className="py-2 font-semibold">Value / Rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {EF_SPEC_PROPERTIES.map((prop) => (
                  <tr key={prop.label}>
                    <td className="py-2 pr-4 font-medium text-[#475a78] dark:text-slate-300 whitespace-nowrap">
                      {prop.label}
                    </td>
                    <td className="py-2 font-mono text-[#0b162c] dark:text-slate-100">
                      {prop.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50/90 dark:bg-[#060e20]/80 border border-slate-200/80 dark:border-slate-700/60 rounded-xl flex flex-col justify-between">
            <p className="text-xs font-semibold text-[#0b162c] dark:text-slate-100">
              Standard Success Structure
            </p>
            <pre className="mt-2 text-xs font-mono text-[#1e40af] dark:text-[#93c5fd] leading-relaxed">{`{
  "status": "success",
  "data": { ... }
}`}</pre>
            <p className="mt-2 text-[11px] text-[#6c7f9e] dark:text-slate-400">
              Proxy automatically unwraps <span className="font-mono">data</span> and enforces the 30 req/min throttle.
            </p>
          </div>
        </div>
      </section>

      {/* Live Affiliate Endpoints Tabs */}
      <section className="paper-card overflow-hidden">
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-700/60">
          <div className="inline-flex items-center p-1 bg-slate-100/90 dark:bg-[#060e20] border border-slate-200/80 dark:border-slate-700/60 rounded-lg">
            {(
              [
                { id: 'balance', label: 'Balance' },
                { id: 'payouts', label: 'Payout History' },
                { id: 'conversions', label: 'Conversions' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-[#11203d] text-[#0b162c] dark:text-slate-50 shadow-xs'
                    : 'text-[#475a78] dark:text-slate-400 hover:text-[#0b162c] dark:hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={loadingTab}
            onClick={() => loadTabData(activeTab)}
            className="sn-btn-silver inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingTab ? 'animate-spin' : ''}`} />
            <span>Reload Endpoint</span>
          </button>
        </div>

        <div className="p-6">
          {loadingTab ? (
            <div className="h-36 rounded-xl bg-slate-100/80 dark:bg-[#060e20]/80 animate-pulse" />
          ) : tabResult?.ok ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#475a78] dark:text-slate-400">
                <span className="font-mono">
                  GET {status?.baseUrl || 'https://www.electronicfirst.com/api/dev/v1'}/affiliates/stats/{activeTab === 'payouts' ? 'payments' : activeTab}
                </span>
                <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  HTTP {tabResult.httpStatus} · {tabResult.latencyMs}ms
                </span>
              </div>
              {renderDataRows(tabResult.data)}
            </div>
          ) : (
            <div className="py-4 space-y-2">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                HTTP {tabResult?.httpStatus || 401} ·{' '}
                <span className="font-mono">{tabResult?.errorCode || 'missing_api_key'}</span>
              </p>
              <p className="text-sm text-[#475a78] dark:text-slate-300 max-w-3xl leading-relaxed">
                {tabResult?.message ||
                  'Configure ELECTRONIC_FIRST_API_KEY in server or Worker Secrets to query live Electronic First affiliate balances, payouts, and conversions.'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* API Error Handling & Status Codes Reference Table */}
      <section className="paper-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-700/60">
          <h2 className="text-base font-semibold text-[#0b162c] dark:text-slate-50">
            Error Handling & Status Codes
          </h2>
          <p className="text-xs text-[#475a78] dark:text-slate-400">
            Standard HTTP response codes returned alongside JSON error descriptions by{' '}
            <span className="font-mono">electronicfirst.com/api/dev/v1</span>.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-700/60 text-xs font-semibold text-[#475a78] dark:text-slate-400">
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-4">Error Code</th>
                <th className="py-3 px-6">Explanation & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
              {EF_ERROR_CODES.map((row) => (
                <tr key={row.code} className="hover:bg-slate-50/80 dark:hover:bg-[#132240]/40">
                  <td className="py-2.5 px-6 font-mono font-semibold text-[#0b162c] dark:text-slate-100 whitespace-nowrap">
                    {row.status}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-amber-700 dark:text-amber-400 whitespace-nowrap">
                    {row.code}
                  </td>
                  <td className="py-2.5 px-6 text-[#475a78] dark:text-slate-300">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
