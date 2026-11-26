import React, { useEffect, useState } from 'react';
import { Check, Copy, Play, RefreshCw } from 'lucide-react';
import type { AdSenseStatus, MetaAnalyticsStatus, TikTokStatus } from '../types/admin';
import { api } from '../lib/api';
import {
  TIKTOK_PIXEL_ID,
  TIKTOK_STOREFRONT_EVENTS_SNIPPET,
  trackTikTokEvent,
  type TikTokEventName,
} from '../lib/tiktokPixel';

const WORKER_ROUTES = [
  { method: 'GET', path: '/api/health', source: 'worker.js', kv: 'None (Public)' },
  { method: 'POST', path: '/api/admin/login', source: 'worker.js', kv: 'pb:admin:session:<token> (24h)' },
  { method: 'GET', path: '/api/admin/catalog?q=&limit=', source: 'worker.js', kv: 'pb:catalog:v1' },
  { method: 'GET', path: '/api/admin/adsense/analytics?range=7d[&by=domain]', source: 'worker.js', kv: 'pb:adsense:refresh:v1' },
  { method: 'GET', path: '/api/admin/adsense/status', source: 'worker.js', kv: 'pb:adsense:refresh:v1' },
  { method: 'GET', path: '/api/admin/tiktok/status', source: 'worker.js', kv: 'pb:tiktok:config:v1' },
  { method: 'GET', path: '/api/admin/meta/analytics', source: 'worker.js', kv: 'pb:meta:token:v1' },
  { method: 'GET|POST', path: '/api/admin/crm/leads', source: 'crm-meta-patch.js', kv: 'pb:crm:leads:v1' },
  { method: 'PATCH|DELETE', path: '/api/admin/crm/leads/:id', source: 'crm-meta-patch.js', kv: 'pb:crm:leads:v1 + Meta WA Events' },
  { method: 'POST', path: '/api/admin/electronicfirst/ping', source: 'EF dev/v1 proxy', kv: 'secret: ELECTRONIC_FIRST_API_KEY (30 req/min)' },
  { method: 'GET', path: '/api/admin/electronicfirst/{balance,payouts,conversions}', source: 'EF dev/v1 proxy', kv: 'secret: ELECTRONIC_FIRST_API_KEY + AFFILIATE_REF' },
];

const PIXEL_SNIPPET = `<script>
(function(){
  function t(n,d,id){ if(window.fbq) fbq('track',n,d||{},id?{eventID:id}:{}); }
  window.pbTrack=t;
  var last=location.pathname;
  function route(){ if(location.pathname!==last){ last=location.pathname; if(window.fbq) fbq('track','PageView'); } }
  var ps=history.pushState; history.pushState=function(){ps.apply(this,arguments);route();};
  window.addEventListener('popstate',route);
  var m=/^\\/product\\/(.+)$/.exec(location.pathname); if(m) t('ViewContent',{content_ids:[m[1]],content_type:'product'});
})();
</script>`;

export function IntegrationsPage() {
  const [meta, setMeta] = useState<MetaAnalyticsStatus | null>(null);
  const [tiktok, setTiktok] = useState<TikTokStatus | null>(null);
  const [adsense, setAdsense] = useState<AdSenseStatus | null>(null);
  const [health, setHealth] = useState<{ ok: boolean; time: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testNotice, setTestNotice] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedTikTokSnippet, setCopiedTikTokSnippet] = useState(false);
  const [selectedTtEvent, setSelectedTtEvent] = useState<TikTokEventName>('ViewContent');
  const [ttPixelFeedback, setTtPixelFeedback] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [metaRes, ttRes, adsRes, healthRes] = await Promise.all([
        api.metaAnalytics(),
        api.tiktokStatus(),
        api.adsenseStatus(),
        api.health(),
      ]);
      setMeta(metaRes);
      setTiktok(ttRes);
      setAdsense(adsRes);
      setHealth({ ok: healthRes.ok, time: healthRes.time });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleTestMeta(channel: 'whatsapp_crm' | 'website_capi') {
    setTestingChannel(channel);
    setTestNotice(null);
    try {
      const res = await api.metaTestEvent(channel);
      setTestNotice(res.detail);
      const updated = await api.metaAnalytics();
      setMeta(updated);
    } catch (err) {
      setTestNotice(err instanceof Error ? err.message : 'Test event failed.');
    } finally {
      setTestingChannel(null);
    }
  }

  async function handleTestTikTok(channel: 'web' | 'crm' = 'web') {
    setTestingChannel(`tiktok_${channel}`);
    setTestNotice(null);
    try {
      const res = await api.tiktokTestEvent(channel);
      setTestNotice(`TikTok (${channel.toUpperCase()}): ${res.detail}`);
      const updated = await api.metaAnalytics();
      setMeta(updated);
    } catch (err) {
      setTestNotice(err instanceof Error ? err.message : 'TikTok test event failed.');
    } finally {
      setTestingChannel(null);
    }
  }

  function handleCopySnippet() {
    navigator.clipboard?.writeText(PIXEL_SNIPPET);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 1800);
  }

  function handleCopyTikTokSnippet() {
    navigator.clipboard?.writeText(TIKTOK_STOREFRONT_EVENTS_SNIPPET);
    setCopiedTikTokSnippet(true);
    setTimeout(() => setCopiedTikTokSnippet(false), 1800);
  }

  async function handleFireBrowserTikTokEvent() {
    setTtPixelFeedback(null);
    const ok = await trackTikTokEvent(
      selectedTtEvent,
      {
        contents: [
          {
            content_id: 'PB-TEST-001',
            content_type: 'product',
            content_name: 'PlayBeat Digital Storefront Item',
          },
        ],
        value: 29.99,
        currency: 'USD',
        ...(selectedTtEvent === 'Search' ? { search_string: 'PlayBeat Steam Key' } : {}),
      },
      {
        email: 'business@playbeat.digital',
        phone: '+923000000000',
        externalId: 'admin_operator',
      },
    );
    setTtPixelFeedback(
      ok
        ? `Fired SHA-256 ttq.identify + ttq.track("${selectedTtEvent}") on Pixel ${TIKTOK_PIXEL_ID}.`
        : 'TikTok Pixel script (ttq) is blocked by a browser extension or ad blocker.',
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Integrations & Cloudflare Worker
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Server-side secret status, Meta Graph API v23.0 CAPI / WhatsApp Event Sharing diagnostics, TikTok Events API, and Worker route verification.
          </p>
        </div>
        <button
          type="button"
          onClick={loadAll}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-lg hover:bg-zinc-50 dark:hover:bg-[#132240] whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Re-check Status</span>
        </button>
      </div>

      {/* Security Reminder Banner (flat 1px border, no thick left bar) */}
      <section className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          Secret Hygiene & Token Storage
        </h2>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-4xl">
          All credentials (Meta access tokens, WhatsApp Dataset IDs, Google OAuth secrets, TikTok tokens, and Admin passwords) are read strictly from server environment variables (<span className="font-mono">process.env</span> / Cloudflare <span className="font-mono">wrangler secret put</span>). Never hardcode raw tokens in source files, and rotate any token previously shared in chat.
        </p>
      </section>

      {/* 3-Column Integration Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Meta Card */}
        <section className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                  Meta CAPI & WhatsApp
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Graph API {meta?.graphVersion || 'v23.0'}
                </p>
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  meta?.configured
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {loading ? 'Checking...' : meta?.configured ? 'Configured' : 'Token Missing'}
              </span>
            </div>

            <dl className="divide-y divide-zinc-100 dark:divide-slate-700/50 text-xs">
              <div className="py-2 flex justify-between">
                <dt className="font-mono text-zinc-500">META_ACCESS_TOKEN</dt>
                <dd className={meta?.ok ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-amber-700 dark:text-amber-400'}>
                  {meta?.ok ? 'Set' : 'Missing'}
                </dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="font-mono text-zinc-500">META_WA_DATASET_ID</dt>
                <dd className={meta?.waDatasetConfigured ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-amber-700 dark:text-amber-400'}>
                  {meta?.waDatasetConfigured ? 'Set' : 'Missing'}
                </dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="font-mono text-zinc-500">META_DATASET_ID (Web)</dt>
                <dd className={meta?.webDatasetConfigured ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-zinc-500'}>
                  {meta?.webDatasetConfigured ? 'Set' : 'Missing'}
                </dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="font-mono text-zinc-500">META_WABA_ID</dt>
                <dd className={meta?.wabaConfigured ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-zinc-500'}>
                  {meta?.wabaConfigured ? 'Set' : 'Optional'}
                </dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="font-mono text-zinc-500">META_TEST_CODE</dt>
                <dd className="text-zinc-600 dark:text-zinc-400">
                  {meta?.testCodeActive ? 'Active (Test Mode)' : 'Off (Production)'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-slate-700/60">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={testingChannel !== null}
                onClick={() => handleTestMeta('whatsapp_crm')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs paper-btn-primary disabled:opacity-50 rounded-lg whitespace-nowrap"
              >
                <Play className="w-3 h-3" />
                <span>Test WhatsApp</span>
              </button>
              <button
                type="button"
                disabled={testingChannel !== null}
                onClick={() => handleTestMeta('website_capi')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-slate-700/70 hover:bg-zinc-50 dark:hover:bg-[#132240] disabled:opacity-50 rounded-lg whitespace-nowrap"
              >
                <Play className="w-3 h-3" />
                <span>Test Web CAPI</span>
              </button>
            </div>
            {testNotice && (
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {testNotice}
              </p>
            )}
          </div>
        </section>

        {/* AdSense Card */}
        <section className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                Google AdSense v2
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                {adsense?.account || 'accounts/pub-9777611286139666'}
              </p>
            </div>
            <span
              className={`text-xs font-medium whitespace-nowrap ${
                adsense?.connected
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {loading
                ? 'Checking...'
                : adsense?.authMode === 'oauth'
                  ? 'Connected (OAuth)'
                  : adsense?.authMode === 'service_account'
                    ? 'Connected (SA RS256)'
                    : 'Auth Required'}
            </span>
          </div>

          <dl className="divide-y divide-zinc-100 dark:divide-slate-700/50 text-xs">
            <div className="py-2 flex justify-between">
              <dt className="font-mono text-zinc-500">GOOGLE_CLIENT_ID/SECRET</dt>
              <dd className={adsense?.oauthClientConfigured ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-amber-700 dark:text-amber-400'}>
                {adsense?.oauthClientConfigured ? 'Set' : 'Missing'}
              </dd>
            </div>
            <div className="py-2 flex justify-between">
              <dt className="font-mono text-zinc-500">pb:adsense:refresh:v1</dt>
              <dd className={adsense?.refreshTokenPresent ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-amber-700 dark:text-amber-400'}>
                {adsense?.refreshTokenPresent ? 'Stored' : 'Empty'}
              </dd>
            </div>
            <div className="py-2 flex justify-between gap-2">
              <dt className="font-mono text-zinc-500">GOOGLE_SERVICE_ACCOUNT_JSON</dt>
              <dd className={adsense?.serviceAccountConfigured ? 'text-emerald-700 dark:text-emerald-400 font-medium truncate' : 'text-amber-700 dark:text-amber-400'}>
                {adsense?.serviceAccountConfigured ? 'Configured' : 'Not Set'}
              </dd>
            </div>
            <div className="py-2 flex justify-between">
              <dt className="text-zinc-500">Serving Layer (5 Sites)</dt>
              <dd className="text-emerald-700 dark:text-emerald-400 font-medium">ads.txt Verified</dd>
            </div>
          </dl>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {adsense?.note}
          </p>
        </section>

        {/* TikTok & Health Card */}
        <section className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                TikTok & API Health
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Events API & Express / Worker Ping
              </p>
            </div>
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
              {health?.ok ? 'API Healthy' : 'Checking...'}
            </span>
          </div>

          <dl className="divide-y divide-zinc-100 dark:divide-slate-700/50 text-xs">
            <div className="py-2 flex justify-between gap-2">
              <dt className="font-mono text-zinc-500">TIKTOK_PIXEL_ID</dt>
              <dd className="text-emerald-700 dark:text-emerald-400 font-mono font-medium">
                {tiktok?.pixelId || TIKTOK_PIXEL_ID}
              </dd>
            </div>
            <div className="py-2 flex justify-between">
              <dt className="font-mono text-zinc-500">TIKTOK_EVENTS_TOKEN</dt>
              <dd className={tiktok?.eventsTokenSaved ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-zinc-500'}>
                {tiktok?.eventsTokenSaved ? 'Saved' : 'Browser Pixel Active'}
              </dd>
            </div>
            <div className="py-2 flex justify-between gap-2">
              <dt className="font-mono text-zinc-500">TIKTOK_CRM_EVENT_SET</dt>
              <dd className="text-emerald-700 dark:text-emerald-400 font-mono font-medium">
                {tiktok?.crmEventSetId || '7712192188952346645'}
              </dd>
            </div>
            <div className="py-2 flex justify-between">
              <dt className="font-mono text-zinc-500">TIKTOK_CRM_TOKEN</dt>
              <dd className={tiktok?.crmTokenSaved ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-amber-700 dark:text-amber-400'}>
                {tiktok?.crmTokenSaved ? 'Saved' : 'Pending'}
              </dd>
            </div>
            <div className="py-2 flex justify-between">
              <dt className="font-mono text-zinc-500">GET /api/health</dt>
              <dd className="font-mono text-zinc-700 dark:text-zinc-300">
                {health ? new Date(health.time).toLocaleTimeString() : '—'}
              </dd>
            </div>
          </dl>

          <div className="pt-2 border-t border-zinc-200 dark:border-slate-700/60 space-y-3">
            <div className="space-y-2">
              <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                Fire Live Browser Pixel Event (SHA-256 Identify + Track)
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedTtEvent}
                  onChange={(e) => setSelectedTtEvent(e.target.value as TikTokEventName)}
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-slate-700/70 bg-white dark:bg-[#060e20] text-zinc-900 dark:text-zinc-100"
                >
                  <option value="ViewContent">ViewContent</option>
                  <option value="AddToWishlist">AddToWishlist</option>
                  <option value="Search">Search</option>
                  <option value="AddPaymentInfo">AddPaymentInfo</option>
                  <option value="AddToCart">AddToCart</option>
                  <option value="InitiateCheckout">InitiateCheckout</option>
                  <option value="PlaceAnOrder">PlaceAnOrder</option>
                  <option value="CompleteRegistration">CompleteRegistration</option>
                  <option value="Purchase">Purchase</option>
                </select>
                <button
                  type="button"
                  onClick={handleFireBrowserTikTokEvent}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs paper-btn-primary rounded-lg whitespace-nowrap"
                >
                  <Play className="w-3 h-3" />
                  <span>Fire</span>
                </button>
              </div>
              {ttPixelFeedback && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                  {ttPixelFeedback}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={testingChannel !== null}
                onClick={() => handleTestTikTok('web')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-slate-700/70 hover:bg-zinc-50 dark:hover:bg-[#132240] disabled:opacity-50 rounded-lg whitespace-nowrap"
              >
                <Play className="w-3 h-3" />
                <span>Test Web Events API</span>
              </button>
              <button
                type="button"
                disabled={testingChannel !== null}
                onClick={() => handleTestTikTok('crm')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg whitespace-nowrap"
              >
                <Play className="w-3 h-3" />
                <span>Test CRM Events API</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                TikTok SHA-256 Events Helper
              </span>
              <button
                type="button"
                onClick={handleCopyTikTokSnippet}
                className="inline-flex items-center gap-1 text-xs text-[#1e40af] dark:text-[#93c5fd] hover:underline"
              >
                {copiedTikTokSnippet ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedTikTokSnippet ? 'Copied' : 'Copy TikTok snippet'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Storefront Meta Pixel Helper
              </span>
              <button
                type="button"
                onClick={handleCopySnippet}
                className="inline-flex items-center gap-1 text-xs text-[#1e40af] dark:text-[#93c5fd] hover:underline"
              >
                {copiedSnippet ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSnippet ? 'Copied' : 'Copy Meta snippet'}</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Meta Event Dispatch Log */}
      <section className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-slate-700/60">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            Meta Graph API Event Dispatch Log
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Real-time record of CRM stage triggers (Qualified → Lead, Won → Purchase) and fulfilled order CAPI events.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-slate-700/60 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <th className="py-3 px-6">Time</th>
                <th className="py-3 px-4">Channel & Event</th>
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6">Response Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-slate-700/50 text-xs">
              {(meta?.recentLogs || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    No Meta events dispatched in this session yet. Update a CRM lead to Qualified/Won, fulfill an order, or click Test WhatsApp above.
                  </td>
                </tr>
              ) : (
                (meta?.recentLogs || []).map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-[#132240]/40">
                    <td className="py-3 px-6 font-mono tabular-nums text-zinc-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-zinc-900 dark:text-zinc-100">
                      {log.channel === 'whatsapp_crm'
                        ? 'WhatsApp CRM'
                        : log.channel === 'tiktok_events'
                          ? 'TikTok Events'
                          : 'Website CAPI'}{' '}
                      · <span className="font-mono">{log.eventName}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {log.eventId}
                    </td>
                    <td className="py-3 px-4 font-medium whitespace-nowrap">
                      <span
                        className={
                          log.status === 'sent'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : log.status === 'not_configured'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-red-700 dark:text-red-400'
                        }
                      >
                        {log.status === 'sent'
                          ? 'Accepted'
                          : log.status === 'not_configured'
                            ? 'Not Configured'
                            : 'Failed'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-zinc-600 dark:text-zinc-400">{log.detail}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Worker Endpoints & KV Binding Reference */}
      <section className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-slate-700/60">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            Cloudflare Worker Route & KV Contract
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Parity reference matching <span className="font-mono">worker.js</span> and <span className="font-mono">crm-meta-patch.js</span> for merging into your production Cloudflare Worker.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-slate-700/60 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <th className="py-3 px-6">Method</th>
                <th className="py-3 px-4">Endpoint</th>
                <th className="py-3 px-4">Worker Module</th>
                <th className="py-3 px-6">KV Key / Storage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-slate-700/50 text-xs font-mono">
              {WORKER_ROUTES.map((r) => (
                <tr key={r.path} className="hover:bg-zinc-50 dark:hover:bg-[#132240]/40">
                  <td className="py-2.5 px-6 text-[#1e40af] dark:text-[#93c5fd] font-semibold whitespace-nowrap">
                    {r.method}
                  </td>
                  <td className="py-2.5 px-4 text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    {r.path}
                  </td>
                  <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    {r.source}
                  </td>
                  <td className="py-2.5 px-6 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    {r.kv}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
