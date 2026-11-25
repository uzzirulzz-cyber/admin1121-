import React, { useEffect, useState } from 'react';
import { Activity, Check, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import type { ElectronicFirstApiResult, ElectronicFirstStatus } from '../types/admin';
import { api } from '../lib/api';

type EfTab = 'balance' | 'payouts' | 'conversions';

const EF_ERROR_CODES = [
  { status: '401', code: 'missing_api_key', action: 'Pass Api-Key header by setting EF_API_KEY in Settings -> Secrets.' },
  { status: '401', code: 'invalid_api_key', action: 'Verify or regenerate your key in Electronic First Dashboard -> Settings -> Developer.' },
  { status: '401', code: 'api_key_disabled', action: 'Toggle the Developer API key back ON in Electronic First settings.' },
  { status: '401', code: 'ip_not_whitelisted', action: 'Add this server egress IP to your Electronic First IP whitelist or disable IP restriction.' },
  { status: '403', code: 'forbidden', action: 'Confirm EF_AFFILIATE_REF (ywzhmdg) belongs to your Electronic First account.' },
  { status: '429', code: 'too_many_requests', action: 'Respect the 30 requests/minute throttle and retry after the rolling window resets.' },
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
          <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
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
                <tr className="border-b border-zinc-200 dark:border-slate-700/60 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {columns.map((col) => (
                    <th key={col} className="py-2.5 px-4">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-slate-700/50 text-xs font-mono tabular-nums">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-[#1a202c]/40">
                    {columns.map((col) => (
                      <td key={col} className="py-2.5 px-4 text-zinc-800 dark:text-zinc-200">
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
              className="p-4 bg-zinc-50 dark:bg-[#161c24] border border-zinc-200 dark:border-slate-700/60 rounded-lg"
            >
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{k}</p>
              <p className="mt-1 text-base font-semibold font-mono tabular-nums text-zinc-950 dark:text-zinc-50 break-all">
                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
              </p>
            </div>
          ))}
        </div>
      );
    }

    return (
      <pre className="p-4 text-xs font-mono bg-zinc-50 dark:bg-[#161c24] border border-zinc-200 dark:border-slate-700/60 rounded-lg overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Electronic First Affiliate API
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            REST JSON API <span className="font-mono text-xs">dev/v1</span> · Header <span className="font-mono text-xs">Api-Key</span> · Throttled at 30 req/min.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            disabled={pinging}
            onClick={handlePing}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#161c24] font-semibold bg-[#f78109] hover:bg-[#fda92d] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{pinging ? 'Pinging...' : 'Run Ping Test'}</span>
          </button>
        </div>
      </div>

      {/* Top 4-column status strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-5">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Api-Key Status
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
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            env: EF_API_KEY
          </p>
        </div>

        <div className="bg-white dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-5">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Affiliate Reference
          </p>
          <p className="mt-2 text-lg font-semibold font-mono text-zinc-950 dark:text-zinc-50">
            {status?.affiliateRef || 'ywzhmdg'}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {status?.accountEmail || 'business@playbeat.digital'}
          </p>
        </div>

        <div className="bg-white dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-5">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Throttle Budget (60s)
          </p>
          <p className="mt-2 text-lg font-semibold font-mono tabular-nums text-zinc-950 dark:text-zinc-50">
            {status?.rateLimit.remaining ?? 30}{' '}
            <span className="text-sm font-normal text-zinc-400">
              / {status?.rateLimit.limitPerMin ?? 30}
            </span>
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {status?.rateLimit.usedInWindow ?? 0} calls in rolling minute
          </p>
        </div>

        <div className="bg-white dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-5">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Last Ping Check
          </p>
          <p
            className={`mt-2 text-lg font-semibold font-mono tabular-nums ${
              pingResult
                ? pingResult.ok
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            {pingResult
              ? pingResult.ok
                ? `200 OK · ${pingResult.latencyMs}ms`
                : `HTTP ${pingResult.httpStatus}`
              : 'Not run'}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {pingResult ? pingResult.errorCode || 'Connected' : 'Click Run Ping Test'}
          </p>
        </div>
      </section>

      {/* Referral Links + Setup Note */}
      <section className="bg-white dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              Affiliate Links & Credential Setup
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Generate your Developer API key in Electronic First Dashboard → Settings → Developer, then store it in <span className="font-mono">EF_API_KEY</span> under Settings → Secrets. Account passwords are never stored in this app.
            </p>
          </div>
          <a
            href={status?.affiliateLink || 'https://www.electronicfirst.com/?ref=ywzhmdg'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#f78109] dark:text-[#fda92d] hover:underline whitespace-nowrap shrink-0"
          >
            <span>Open Electronic First</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-zinc-200 dark:border-slate-700/60">
          <div className="flex items-center justify-between gap-3 p-3.5 bg-zinc-50 dark:bg-[#161c24] border border-zinc-200 dark:border-slate-700/60 rounded-lg">
            <div className="min-w-0">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Primary Affiliate Link</p>
              <p className="mt-0.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 truncate">
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
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-zinc-200 dark:border-slate-700/70 rounded-md hover:bg-white dark:hover:bg-zinc-900 whitespace-nowrap shrink-0"
            >
              {copiedField === 'ref' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedField === 'ref' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 p-3.5 bg-zinc-50 dark:bg-[#161c24] border border-zinc-200 dark:border-slate-700/60 rounded-lg">
            <div className="min-w-0">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Campaign Shortlink</p>
              <p className="mt-0.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 truncate">
                {status?.shortLink || 'https://fas.st/t/WUFdhZbZ'}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                handleCopy(status?.shortLink || 'https://fas.st/t/WUFdhZbZ', 'short')
              }
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-zinc-200 dark:border-slate-700/70 rounded-md hover:bg-white dark:hover:bg-zinc-900 whitespace-nowrap shrink-0"
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
      </section>

      {/* Live Affiliate Endpoints Tabs */}
      <section className="bg-white dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 dark:border-slate-700/60">
          <div className="inline-flex items-center p-1 bg-zinc-100 dark:bg-[#161c24] border border-zinc-200 dark:border-slate-700/60 rounded-lg">
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
                    ? 'bg-white dark:bg-[#1a202c] text-zinc-950 dark:text-zinc-50 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-slate-700/70 rounded-lg hover:bg-zinc-50 dark:hover:bg-[#1a202c] whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Endpoint</span>
          </button>
        </div>

        <div className="p-6">
          {loadingTab ? (
            <div className="h-36 rounded-lg bg-zinc-50 dark:bg-[#161c24] animate-pulse" />
          ) : tabResult?.ok ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-mono">
                  GET {status?.baseUrl || 'https://www.electronicfirst.com/api/dev/v1'}/affiliate/{activeTab}
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
              <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-3xl leading-relaxed">
                {tabResult?.message ||
                  'Add EF_API_KEY in Settings -> Secrets to query live Electronic First affiliate balances, payouts, and conversions.'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* API Error Handling & Contract Table */}
      <section className="bg-white dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-slate-700/60">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            Electronic First v1 Error Codes & Actions
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Base URL <span className="font-mono">https://www.electronicfirst.com/api/dev/v1</span> · JSON envelope <span className="font-mono">{'{ "status": "success", "data": ... }'}</span>
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-slate-700/60 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <th className="py-3 px-6">HTTP</th>
                <th className="py-3 px-4">Error Code</th>
                <th className="py-3 px-6">Remediation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-slate-700/50 text-xs">
              {EF_ERROR_CODES.map((row) => (
                <tr key={row.code} className="hover:bg-zinc-50 dark:hover:bg-[#1a202c]/40">
                  <td className="py-2.5 px-6 font-mono font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    {row.status}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-amber-700 dark:text-amber-400 whitespace-nowrap">
                    {row.code}
                  </td>
                  <td className="py-2.5 px-6 text-zinc-600 dark:text-zinc-400">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
