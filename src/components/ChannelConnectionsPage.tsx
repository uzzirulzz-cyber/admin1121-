import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  RefreshCw,
  Save,
  ShieldCheck,
  Unplug,
  X,
} from 'lucide-react';
import type { ChannelConnection, ChannelPlatform } from '../types/admin';
import { api } from '../lib/api';

interface ChannelConnectionsPageProps {
  onDataChanged?: () => void;
}

type FilterCategory = 'ALL' | 'Google' | 'Meta' | 'TikTok';

interface DraftFields {
  accountId: string;
  secondaryId: string;
  loginIdentifier: string;
  notes: string;
}

export function ChannelConnectionsPage({ onDataChanged }: ChannelConnectionsPageProps) {
  const [channels, setChannels] = useState<ChannelConnection[]>([]);
  const [callbackBaseUrl, setCallbackBaseUrl] = useState('');
  const [drafts, setDrafts] = useState<Record<string, DraftFields>>({});
  const [filter, setFilter] = useState<FilterCategory>('ALL');
  const [loading, setLoading] = useState(true);
  const [busyPlatform, setBusyPlatform] = useState<ChannelPlatform | null>(null);
  const [copiedUri, setCopiedUri] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

  const loadChannels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.channels();
      setChannels(res.channels);
      setCallbackBaseUrl(res.callbackBaseUrl || window.location.origin);
      setDrafts((prev) => {
        const next: Record<string, DraftFields> = { ...prev };
        for (const ch of res.channels) {
          next[ch.platform] = {
            accountId: ch.accountId,
            secondaryId: ch.secondaryId,
            loginIdentifier: ch.loginIdentifier,
            notes: ch.notes,
          };
        }
        return next;
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load channel connections.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Listen for OAuth popup completion via postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (
        origin !== window.location.origin &&
        !origin.endsWith('.run.app') &&
        !origin.includes('localhost')
      ) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setNotice({
          type: 'info',
          text: `Connected ${String(event.data.platform || '').replace('_', ' ')} via OAuth 2.0.`,
        });
        loadChannels();
        onDataChanged?.();
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setNotice({
          type: 'error',
          text: `OAuth sign-in did not complete (${event.data.error || 'cancelled'}).`,
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loadChannels, onDataChanged]);

  function updateDraft(platform: ChannelPlatform, field: keyof DraftFields, value: string) {
    setDrafts((prev) => ({
      ...prev,
      [platform]: {
        ...(prev[platform] || { accountId: '', secondaryId: '', loginIdentifier: '', notes: '' }),
        [field]: value,
      },
    }));
  }

  async function handleSaveProfile(platform: ChannelPlatform) {
    const draft = drafts[platform];
    if (!draft) return;
    setBusyPlatform(platform);
    setNotice(null);
    try {
      const res = await api.saveChannelProfile(platform, draft);
      setChannels((prev) => prev.map((c) => (c.platform === platform ? res.channel : c)));
      setNotice({ type: 'info', text: `Saved ${res.channel.name} account ID and login details.` });
      onDataChanged?.();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to save channel profile.',
      });
    } finally {
      setBusyPlatform(null);
    }
  }

  async function handleOAuthConnect(ch: ChannelConnection) {
    setBusyPlatform(ch.platform);
    setNotice(null);
    try {
      const res = await api.getChannelOAuthUrl(ch.platform, window.location.origin);
      const popup = window.open(
        res.url,
        `playbeat_oauth_${ch.platform}`,
        'width=620,height=740,noopener=no',
      );
      if (!popup) {
        setNotice({
          type: 'error',
          text: 'Popup was blocked by your browser. Allow popups for this site and click Connect again.',
        });
      }
    } catch (err) {
      setNotice({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : `Set ${ch.requiredEnvVars.join(' and ')} in Settings → Secrets to enable direct OAuth sign-in.`,
      });
    } finally {
      setBusyPlatform(null);
    }
  }

  async function handleVerify(platform: ChannelPlatform) {
    setBusyPlatform(platform);
    setNotice(null);
    try {
      const res = await api.verifyChannel(platform);
      setChannels((prev) => prev.map((c) => (c.platform === platform ? res.channel : c)));
      setNotice({
        type: res.ok ? 'info' : 'error',
        text: res.detail,
      });
      onDataChanged?.();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Verification check failed.',
      });
    } finally {
      setBusyPlatform(null);
    }
  }

  async function handleDisconnect(platform: ChannelPlatform) {
    setBusyPlatform(platform);
    setNotice(null);
    try {
      const res = await api.disconnectChannel(platform);
      setChannels((prev) => prev.map((c) => (c.platform === platform ? res.channel : c)));
      setNotice({ type: 'info', text: `Disconnected OAuth session for ${res.channel.name}.` });
      onDataChanged?.();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Disconnect failed.',
      });
    } finally {
      setBusyPlatform(null);
    }
  }

  function handleCopyCallback(uri: string) {
    navigator.clipboard?.writeText(uri);
    setCopiedUri(uri);
    setTimeout(() => setCopiedUri(null), 1800);
  }

  const visibleChannels =
    filter === 'ALL' ? channels : channels.filter((c) => c.category === filter);

  const connectedCount = channels.filter((c) => c.connected).length;
  const googleCount = channels.filter((c) => c.category === 'Google').length;
  const metaCount = channels.filter((c) => c.category === 'Meta').length;
  const tiktokCount = channels.filter((c) => c.category === 'TikTok').length;

  function statusSummary(ch: ChannelConnection): { text: string; tone: string } {
    if (ch.connectionMethod === 'oauth') {
      return {
        text: ch.connectedEmail ? `Connected via OAuth (${ch.connectedEmail})` : 'Connected via OAuth 2.0',
        tone: 'text-emerald-700 dark:text-emerald-400',
      };
    }
    if (ch.connectionMethod === 'service_account') {
      return {
        text: 'Connected via Service Account (RS256)',
        tone: 'text-emerald-700 dark:text-emerald-400',
      };
    }
    if (ch.connectionMethod === 'server_token') {
      return {
        text: 'Connected via Server API Token',
        tone: 'text-emerald-700 dark:text-emerald-400',
      };
    }
    if (ch.connectionMethod === 'profile_only') {
      return {
        text: 'Account ID Saved · OAuth Pending',
        tone: 'text-amber-700 dark:text-amber-400',
      };
    }
    return {
      text: 'Not Connected',
      tone: 'text-zinc-500 dark:text-zinc-400',
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Social & Ad Channel Accounts
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Bind Account IDs and sign in directly via OAuth 2.0 for Google AdSense, Google Ads, Google Analytics (GA4), Facebook, Instagram, Threads, and TikTok.
          </p>
        </div>
        <button
          type="button"
          onClick={loadChannels}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-[#252422] border border-zinc-200 dark:border-slate-700/60 rounded-lg hover:bg-zinc-50 dark:hover:bg-[#2c2a27] transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Channels</span>
        </button>
      </div>

      {/* Security Architecture Notice */}
      <div className="bg-white dark:bg-[#252422] border border-zinc-200 dark:border-slate-700/60 rounded-xl px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#2ca8ab] dark:text-[#51cbce] shrink-0 mt-0.5" />
          <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              Official OAuth 2.0 Direct Sign-In:
            </span>{' '}
            Google, Meta (Facebook / Instagram / Threads), and TikTok require OAuth 2.0 rather than storing third-party account passwords in plaintext. Enter each platform&apos;s Account ID &amp; login email below, then click <strong className="text-zinc-900 dark:text-zinc-100">Sign In &amp; Connect</strong> to authenticate directly in a secure popup window.
          </div>
        </div>
        <div className="text-xs font-mono tabular-nums text-zinc-600 dark:text-zinc-400 whitespace-nowrap shrink-0">
          {connectedCount} / {channels.length || 7} active
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className={`flex items-center justify-between gap-4 px-4 py-3 text-xs rounded-lg border ${
            notice.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
              : 'bg-zinc-100 dark:bg-[#252422] border-zinc-200 dark:border-slate-700/60 text-zinc-800 dark:text-zinc-200'
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notice">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-zinc-100 dark:bg-[#252422] border border-zinc-200 dark:border-slate-700/60 rounded-lg">
        {[
          { key: 'ALL' as const, label: `All Platforms (${channels.length || 7})` },
          { key: 'Google' as const, label: `Google Ads · AdSense · GA4 (${googleCount})` },
          { key: 'Meta' as const, label: `Facebook · Instagram · Threads (${metaCount})` },
          { key: 'TikTok' as const, label: `TikTok (${tiktokCount})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filter === tab.key
                ? 'bg-white dark:bg-[#1f1e1d] text-zinc-950 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Platform Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-72 bg-white dark:bg-[#252422] border border-zinc-200 dark:border-slate-700/60 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {visibleChannels.map((ch) => {
            const draft = drafts[ch.platform] || {
              accountId: ch.accountId,
              secondaryId: ch.secondaryId,
              loginIdentifier: ch.loginIdentifier,
              notes: ch.notes,
            };
            const st = statusSummary(ch);
            const fullCallbackUri = `${callbackBaseUrl || window.location.origin}${ch.callbackPath}`;
            const isBusy = busyPlatform === ch.platform;

            return (
              <section
                key={ch.platform}
                className="bg-white dark:bg-[#252422] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-6 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-slate-700/60">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                          {ch.name}
                        </h2>
                        <span className="text-xs text-zinc-400">·</span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {ch.category}
                        </span>
                      </div>
                      <p className={`mt-1 text-xs font-medium ${st.tone}`}>{st.text}</p>
                    </div>
                    <a
                      href={ch.portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 whitespace-nowrap shrink-0"
                    >
                      <span>Open Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Account ID & Login Email Form */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label
                        htmlFor={`${ch.platform}-account-id`}
                        className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                      >
                        {ch.accountIdLabel}
                      </label>
                      <input
                        id={`${ch.platform}-account-id`}
                        type="text"
                        value={draft.accountId}
                        onChange={(e) => updateDraft(ch.platform, 'accountId', e.target.value)}
                        placeholder={ch.accountIdPlaceholder}
                        className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-[#1c1b1a] border border-zinc-300 dark:border-slate-700/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`${ch.platform}-secondary-id`}
                        className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                      >
                        {ch.secondaryIdLabel}
                      </label>
                      <input
                        id={`${ch.platform}-secondary-id`}
                        type="text"
                        value={draft.secondaryId}
                        onChange={(e) => updateDraft(ch.platform, 'secondaryId', e.target.value)}
                        placeholder={ch.secondaryIdPlaceholder}
                        className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-[#1c1b1a] border border-zinc-300 dark:border-slate-700/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label
                        htmlFor={`${ch.platform}-login-id`}
                        className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                      >
                        Account Login Email / Handle
                      </label>
                      <input
                        id={`${ch.platform}-login-id`}
                        type="text"
                        value={draft.loginIdentifier}
                        onChange={(e) => updateDraft(ch.platform, 'loginIdentifier', e.target.value)}
                        placeholder="email@playbeat.digital or @handle"
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-[#1c1b1a] border border-zinc-300 dark:border-slate-700/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`${ch.platform}-notes`}
                        className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                      >
                        Workspace Notes
                      </label>
                      <input
                        id={`${ch.platform}-notes`}
                        type="text"
                        value={draft.notes}
                        onChange={(e) => updateDraft(ch.platform, 'notes', e.target.value)}
                        placeholder="Property / ad set purpose"
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-[#1c1b1a] border border-zinc-300 dark:border-slate-700/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                      />
                    </div>
                  </div>

                  {/* OAuth Callback URI + Server Secrets Status */}
                  <div className="pt-3 border-t border-zinc-100 dark:border-slate-700/50 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        OAuth Callback URI:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCallback(fullCallbackUri)}
                        className="inline-flex items-center gap-1 text-[#2ca8ab] dark:text-[#51cbce] hover:underline whitespace-nowrap shrink-0"
                      >
                        {copiedUri === fullCallbackUri ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedUri === fullCallbackUri ? 'Copied' : 'Copy URI'}</span>
                      </button>
                    </div>
                    <p className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 break-all">
                      {fullCallbackUri}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Server OAuth App Secrets:{' '}
                      <span className="font-mono text-zinc-700 dark:text-zinc-300">
                        {ch.requiredEnvVars.join(', ')}
                      </span>{' '}
                      —{' '}
                      <span
                        className={
                          ch.oauthReady
                            ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                            : 'text-amber-700 dark:text-amber-400 font-medium'
                        }
                      >
                        {ch.oauthReady ? 'Configured' : 'Set in Settings → Secrets'}
                      </span>
                    </p>
                    {ch.lastVerifyDetail && (
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        Last check: {ch.lastVerifyDetail}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-4 border-t border-zinc-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSaveProfile(ch.platform)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-slate-700/70 rounded-lg hover:bg-zinc-50 dark:hover:bg-[#2c2a27] disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save ID</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleVerify(ch.platform)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-slate-700/70 rounded-lg hover:bg-zinc-50 dark:hover:bg-[#2c2a27] disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Verify</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {ch.connectionMethod === 'oauth' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDisconnect(ch.platform)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 whitespace-nowrap shrink-0"
                      >
                        <Unplug className="w-3.5 h-3.5" />
                        <span>Disconnect</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleOAuthConnect(ch)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs paper-btn-primary disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>
                        {ch.connectionMethod === 'oauth'
                          ? 'Reconnect OAuth'
                          : 'Sign In & Connect'}
                      </span>
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
