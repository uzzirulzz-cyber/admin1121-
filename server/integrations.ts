import crypto from 'node:crypto';
import type { Request } from 'express';
import type {
  AdSenseAnalyticsResponse,
  AdSenseDailyRow,
  AdSenseDomainRow,
  ChannelConnection,
  ChannelPlatform,
  CrmLead,
  ElectronicFirstApiResult,
  ElectronicFirstStatus,
  MetaEventDispatchLog,
  OrderRecord,
} from '../src/types/admin.ts';
import { channelOAuthTokens, channelProfilesStore, pushMetaLog } from './store.ts';

const GRAPH_VERSION = 'v23.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const STAGE_EVENT: Partial<Record<CrmLead['status'], 'Lead' | 'Purchase'>> = {
  Qualified: 'Lead',
  Won: 'Purchase',
};

const ADSENSE_RANGES: Record<string, string> = {
  today: 'TODAY',
  yesterday: 'YESTERDAY',
  '7d': 'LAST_7_DAYS',
  '28d': 'LAST_30_DAYS',
  mtd: 'MONTH_TO_DATE',
};

// Electronic First Developer API v1 (30 req/min rate limit)
const EF_BASE_URL = 'https://www.electronicfirst.com/api/dev/v1';
const EF_RATE_LIMIT_PER_MIN = 30;
const EF_WINDOW_MS = 60_000;
const efRequestTimestamps: number[] = [];

function getEfRateLimitState() {
  const now = Date.now();
  while (efRequestTimestamps.length > 0 && now - efRequestTimestamps[0] >= EF_WINDOW_MS) {
    efRequestTimestamps.shift();
  }
  const usedInWindow = efRequestTimestamps.length;
  return {
    limitPerMin: EF_RATE_LIMIT_PER_MIN,
    usedInWindow,
    remaining: Math.max(0, EF_RATE_LIMIT_PER_MIN - usedInWindow),
  };
}

export function getElectronicFirstStatus(): ElectronicFirstStatus {
  const affiliateRef =
    (process.env.ELECTRONIC_FIRST_AFFILIATE_REF || process.env.EF_AFFILIATE_REF || 'ywzhmdg').trim();
  const configured = Boolean(
    (process.env.ELECTRONIC_FIRST_API_KEY || process.env.EF_API_KEY || '').trim(),
  );
  return {
    ok: true,
    configured,
    baseUrl: EF_BASE_URL,
    affiliateRef,
    affiliateLink: `https://www.electronicfirst.com/?ref=${encodeURIComponent(affiliateRef)}`,
    shortLink: 'https://fas.st/t/WUFdhZbZ',
    accountEmail: 'business@playbeat.digital',
    rateLimit: getEfRateLimitState(),
  };
}

const EF_ERROR_GUIDANCE: Record<string, string> = {
  missing_api_key:
    'The Api-Key header was omitted. Configure ELECTRONIC_FIRST_API_KEY in server or Worker Secrets.',
  invalid_api_key:
    'The supplied ELECTRONIC_FIRST_API_KEY was not recognized by Electronic First.',
  api_key_disabled:
    'This API key is currently deactivated in Electronic First Dashboard -> Settings -> Developer.',
  ip_not_whitelisted:
    'This server egress IP is not permitted by your Electronic First API key IP whitelist.',
  forbidden:
    'The specified affiliate_ref is invalid or does not belong to your Electronic First account.',
  too_many_requests:
    'Rate limit exceeded (30 requests/minute). Wait up to 60 seconds before retrying.',
  cloudflare_waf_challenge:
    'Electronic First Cloudflare WAF returned a browser challenge to this server IP. Ask Electronic First support to bypass Bot Fight Mode for /api/dev/v1/* or whitelist your API key IP.',
};

export async function callElectronicFirstApi<T = unknown>(
  endpointPath:
    | '/ping'
    | '/affiliates/stats/balance'
    | '/affiliates/stats/payments'
    | '/affiliates/stats/conversions',
): Promise<ElectronicFirstApiResult<T>> {
  const started = Date.now();
  const rateBefore = getEfRateLimitState();
  const apiKey = (process.env.ELECTRONIC_FIRST_API_KEY || process.env.EF_API_KEY || '').trim();

  if (!apiKey) {
    return {
      ok: false,
      httpStatus: 401,
      latencyMs: 0,
      errorCode: 'missing_api_key',
      message: EF_ERROR_GUIDANCE.missing_api_key,
      rateLimit: rateBefore,
    };
  }

  if (rateBefore.remaining <= 0) {
    return {
      ok: false,
      httpStatus: 429,
      latencyMs: 0,
      errorCode: 'too_many_requests',
      message: EF_ERROR_GUIDANCE.too_many_requests,
      rateLimit: rateBefore,
    };
  }

  efRequestTimestamps.push(Date.now());
  const affiliateRef =
    (process.env.ELECTRONIC_FIRST_AFFILIATE_REF || process.env.EF_AFFILIATE_REF || 'ywzhmdg').trim();
  const url = new URL(`${EF_BASE_URL}${endpointPath}`);
  if (endpointPath !== '/ping') {
    url.searchParams.set('affiliate_ref', affiliateRef);
  }

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Api-Key': apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'PlayBeatAdmin/1.0 (+https://admin.playbeat.digital)',
      },
    });
    const latencyMs = Date.now() - started;
    const rawText = await res.text();
    let body: {
      status?: string;
      data?: T;
      error?: string;
      code?: string;
      error_code?: string;
      message?: string;
    } | null = null;
    try {
      body = JSON.parse(rawText);
    } catch {
      body = null;
    }

    const isCfChallenge =
      res.headers.get('cf-mitigated') === 'challenge' ||
      rawText.includes('Just a moment...') ||
      rawText.includes('cdn-cgi/challenge-platform');

    if (!body) {
      return {
        ok: false,
        httpStatus: res.status,
        latencyMs,
        errorCode: isCfChallenge ? 'cloudflare_waf_challenge' : 'invalid_json_response',
        message: isCfChallenge
          ? EF_ERROR_GUIDANCE.cloudflare_waf_challenge
          : `Electronic First returned non-JSON HTTP ${res.status}.`,
        rateLimit: getEfRateLimitState(),
      };
    }

    if (!res.ok || body.status === 'error') {
      const code =
        body.error_code ||
        body.code ||
        body.error ||
        (res.status === 401
          ? 'invalid_api_key'
          : res.status === 403
            ? 'forbidden'
            : res.status === 429
              ? 'too_many_requests'
              : `http_${res.status}`);
      return {
        ok: false,
        httpStatus: res.status,
        latencyMs,
        errorCode: code,
        message: body.message || EF_ERROR_GUIDANCE[code] || `Electronic First API returned HTTP ${res.status}.`,
        rateLimit: getEfRateLimitState(),
      };
    }

    return {
      ok: true,
      httpStatus: res.status,
      latencyMs,
      data: (body.data !== undefined ? body.data : body) as T,
      rateLimit: getEfRateLimitState(),
    };
  } catch (err) {
    return {
      ok: false,
      httpStatus: 502,
      latencyMs: Date.now() - started,
      errorCode: 'network_error',
      message: err instanceof Error ? err.message : 'Unable to reach Electronic First Developer API.',
      rateLimit: getEfRateLimitState(),
    };
  }
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

function normPhone(phone: string): string {
  return String(phone || '').replace(/\D/g, '');
}

export function isValidUpstreamWorkerUrl(rawUrl: string | undefined): boolean {
  if (!rawUrl) return false;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

interface ParsedServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
  token_uri?: string;
}

let cachedSaToken: { token: string; expiresAt: number } | null = null;

function parseServiceAccountFromEnv(): ParsedServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ParsedServiceAccount>;
    if (
      typeof parsed.client_email === 'string' &&
      parsed.client_email.includes('@') &&
      typeof parsed.private_key === 'string' &&
      parsed.private_key.includes('BEGIN PRIVATE KEY')
    ) {
      return {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
        project_id: typeof parsed.project_id === 'string' ? parsed.project_id : undefined,
        token_uri: 'https://oauth2.googleapis.com/token',
      };
    }
    return null;
  } catch {
    return null;
  }
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function getServiceAccountAccessToken(sa: ParsedServiceAccount): Promise<string> {
  if (cachedSaToken && cachedSaToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedSaToken.token;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimSet = base64UrlEncode(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/adsense.readonly',
      aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
      iat: nowSec,
      exp: nowSec + 3600,
    }),
  );

  const signingInput = `${header}.${claimSet}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = base64UrlEncode(signer.sign(sa.private_key));
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
    error?: string;
  };
  if (!res.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || 'GOOGLE_SA_TOKEN_FAILED');
  }

  cachedSaToken = {
    token: payload.access_token,
    expiresAt: Date.now() + (Number(payload.expires_in) || 3600) * 1000,
  };
  return payload.access_token;
}

export function getAdSenseConfigStatus() {
  const clientId = Boolean(process.env.GOOGLE_CLIENT_ID?.trim());
  const clientSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim());
  const runtimeToken = channelOAuthTokens.get('google_adsense');
  const refreshToken = Boolean(
    process.env.GOOGLE_ADSENSE_REFRESH_TOKEN?.trim() ||
      runtimeToken?.refreshToken ||
      runtimeToken?.accessToken,
  );
  const oauthReady = (clientId && clientSecret && refreshToken) || Boolean(runtimeToken?.accessToken);
  const sa = parseServiceAccountFromEnv();
  const serviceAccountConfigured = Boolean(sa);
  const account =
    channelProfilesStore.google_adsense.accountId?.trim() ||
    process.env.ADSENSE_ACCOUNT?.trim() ||
    'accounts/pub-9777611286139666';
  const authMode: 'oauth' | 'service_account' | 'none' = oauthReady
    ? 'oauth'
    : serviceAccountConfigured
      ? 'service_account'
      : 'none';

  return {
    ok: true,
    connected: oauthReady || serviceAccountConfigured,
    authMode,
    account,
    publisherId: 'ca-pub-9777611286139666',
    adsTxtLine: 'google.com, pub-9777611286139666, DIRECT, f08c47fec0942fa0',
    oauthClientConfigured: clientId && clientSecret,
    refreshTokenPresent: refreshToken,
    serviceAccountConfigured,
    serviceAccountEmail: sa?.client_email || null,
    serviceAccountProjectId: sa?.project_id || null,
    kvKey: 'pb:adsense:refresh:v1',
    note: 'Supports OAuth 2.0 refresh token (priority) with automatic Google Service Account RS256 JWT fallback (GOOGLE_SERVICE_ACCOUNT_JSON).',
  };
}

async function getGoogleAccessToken(): Promise<string> {
  const runtimeToken = channelOAuthTokens.get('google_adsense');
  if (
    runtimeToken?.accessToken &&
    (!runtimeToken.expiresAt || runtimeToken.expiresAt > Date.now() + 60_000)
  ) {
    return runtimeToken.accessToken;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken =
    runtimeToken?.refreshToken || process.env.GOOGLE_ADSENSE_REFRESH_TOKEN?.trim();

  if (clientId && clientSecret && refreshToken) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const payload = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      error_description?: string;
      error?: string;
    };
    if (!res.ok || !payload.access_token) {
      throw new Error(payload.error_description || payload.error || 'GOOGLE_TOKEN_FAILED');
    }
    if (runtimeToken) {
      runtimeToken.accessToken = payload.access_token;
      runtimeToken.expiresAt = Date.now() + (Number(payload.expires_in) || 3600) * 1000;
    }
    return payload.access_token;
  }

  const sa = parseServiceAccountFromEnv();
  if (sa) {
    return getServiceAccountAccessToken(sa);
  }

  throw new Error('ADSENSE_NOT_CONNECTED');
}

export async function fetchAdSenseAnalytics(
  rangeParam: string,
  byParam: string,
): Promise<AdSenseAnalyticsResponse> {
  const range = ADSENSE_RANGES[rangeParam] || 'LAST_7_DAYS';
  const by: 'DATE' | 'DOMAIN_NAME' = byParam === 'domain' ? 'DOMAIN_NAME' : 'DATE';
  const account =
    channelProfilesStore.google_adsense.accountId?.trim() ||
    process.env.ADSENSE_ACCOUNT?.trim() ||
    'accounts/pub-9777611286139666';

  const status = getAdSenseConfigStatus();
  if (!status.connected) {
    return {
      ok: false,
      range,
      by,
      error: 'ADSENSE_NOT_CONNECTED',
      code: 'AUTH_REQUIRED',
      message:
        'Configure either OAuth2 secrets (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_ADSENSE_REFRESH_TOKEN) or a Service Account JSON secret (GOOGLE_SERVICE_ACCOUNT_JSON) in Settings -> Secrets.',
    };
  }

  const token = await getGoogleAccessToken();
  const query = new URLSearchParams({ dateRange: range, dimensions: by });
  ['ESTIMATED_EARNINGS', 'PAGE_VIEWS', 'IMPRESSIONS', 'CLICKS'].forEach((m) =>
    query.append('metrics', m),
  );

  const res = await fetch(
    `https://adsense.googleapis.com/v2/${encodeURIComponent(account).replace('%2F', '/')}/reports:generate?${query.toString()}`,
    {
      headers: { authorization: `Bearer ${token}` },
    },
  );
  const data = (await res.json().catch(() => ({}))) as {
    rows?: Array<{ cells: Array<{ value: string }> }>;
    totals?: { cells?: Array<{ value: string }> };
    error?: { message?: string; status?: string };
  };

  if (!res.ok) {
    return {
      ok: false,
      range,
      by,
      error: data.error?.status || 'ADSENSE_API_ERROR',
      message: data.error?.message || `AdSense API returned HTTP ${res.status}`,
    };
  }

  const parsedRows = (data.rows || []).map((row) => {
    const c = row.cells.map((v) => v.value);
    return {
      key: c[0] || '',
      earnings: Number(c[1]) || 0,
      pageViews: Number(c[2]) || 0,
      impressions: Number(c[3]) || 0,
      clicks: Number(c[4]) || 0,
    };
  });

  const totalsEarnings = parsedRows.reduce((s, r) => s + r.earnings, 0);
  const totalsPageViews = parsedRows.reduce((s, r) => s + r.pageViews, 0);
  const totalsImpressions = parsedRows.reduce((s, r) => s + r.impressions, 0);
  const totalsClicks = parsedRows.reduce((s, r) => s + r.clicks, 0);

  const totals = {
    earnings: Number(totalsEarnings.toFixed(2)),
    pageViews: totalsPageViews,
    impressions: totalsImpressions,
    clicks: totalsClicks,
    rpm: totalsPageViews > 0 ? Number(((totalsEarnings / totalsPageViews) * 1000).toFixed(2)) : 0,
    ctr:
      totalsImpressions > 0
        ? Number(((totalsClicks / totalsImpressions) * 100).toFixed(2))
        : 0,
  };

  if (by === 'DATE') {
    const daily: AdSenseDailyRow[] = parsedRows.map((r) => ({
      date: r.key,
      earnings: r.earnings,
      pageViews: r.pageViews,
      impressions: r.impressions,
      clicks: r.clicks,
    }));
    return { ok: true, range, by, daily, totals };
  }

  const domains: AdSenseDomainRow[] = parsedRows.map((r) => ({
    domain: r.key,
    earnings: r.earnings,
    pageViews: r.pageViews,
    impressions: r.impressions,
    clicks: r.clicks,
  }));
  return { ok: true, range, by, domains, totals };
}

export async function reportCrmStageToMeta(lead: CrmLead): Promise<{
  ok: boolean;
  skipped?: boolean;
  status: 'sent' | 'skipped' | 'not_configured' | 'failed';
  eventName: 'Lead' | 'Purchase' | null;
  message: string;
}> {
  const eventName = STAGE_EVENT[lead.status] || null;
  if (!eventName) {
    return {
      ok: true,
      skipped: true,
      status: 'skipped',
      eventName: null,
      message: `Stage "${lead.status}" does not trigger a Meta conversion event.`,
    };
  }

  const dataset = process.env.META_WA_DATASET_ID?.trim();
  const token = process.env.META_ACCESS_TOKEN?.trim();
  const waba = process.env.META_WABA_ID?.trim();
  const testCode = process.env.META_TEST_CODE?.trim();
  const eventId = `crm-${lead.leadId}-${lead.status.toLowerCase()}`;

  if (!dataset || !token) {
    const logEntry: MetaEventDispatchLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      channel: 'whatsapp_crm',
      eventName,
      eventId,
      entityRef: lead.leadId,
      status: 'not_configured',
      detail: 'META_WA_DATASET_ID or META_ACCESS_TOKEN missing in server environment.',
    };
    pushMetaLog(logEntry);
    return {
      ok: false,
      status: 'not_configured',
      eventName,
      message: logEntry.detail,
    };
  }

  const user_data: Record<string, unknown> = {};
  if (waba) user_data.whatsapp_business_account_id = waba;
  if (lead.ctwaClid) user_data.ctwa_clid = lead.ctwaClid;
  if (lead.phone && normPhone(lead.phone)) {
    user_data.ph = [sha256(normPhone(lead.phone))];
  }
  if (lead.email) {
    user_data.em = [sha256(normEmail(lead.email))];
  }

  const ev = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: 'business_messaging',
    messaging_channel: 'whatsapp',
    user_data,
    custom_data:
      eventName === 'Purchase'
        ? { currency: 'USD', value: Number(lead.expectedValueUsd) || 0 }
        : {},
  };

  const body: Record<string, unknown> = { data: [ev] };
  if (testCode) body.test_event_code = testCode;

  try {
    const res = await fetch(`${GRAPH_BASE}/${encodeURIComponent(dataset)}/events`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const out = (await res.json().catch(() => ({}))) as {
      events_received?: number;
      error?: { message?: string };
    };
    const status = res.ok ? 'sent' : 'failed';
    const detail = res.ok
      ? `Meta Graph ${GRAPH_VERSION} accepted event (${out.events_received ?? 1} received).`
      : out.error?.message || `Meta Graph API returned HTTP ${res.status}.`;

    pushMetaLog({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      channel: 'whatsapp_crm',
      eventName,
      eventId,
      entityRef: lead.leadId,
      status,
      httpStatus: res.status,
      detail,
    });

    return { ok: res.ok, status, eventName, message: detail };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Network error reaching Meta Graph API';
    pushMetaLog({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      channel: 'whatsapp_crm',
      eventName,
      eventId,
      entityRef: lead.leadId,
      status: 'failed',
      detail,
    });
    return { ok: false, status: 'failed', eventName, message: detail };
  }
}

export async function dispatchTikTokEvent(
  eventName: string,
  entityRef: string,
  payload: { email?: string; phone?: string; valueUsd?: number } = {},
): Promise<{ ok: boolean; status: 'sent' | 'not_configured' | 'failed'; detail: string }> {
  const pixelId = process.env.TIKTOK_PIXEL_ID?.trim();
  const token = process.env.TIKTOK_EVENTS_TOKEN?.trim();
  const eventId = `tt-${entityRef}-${Date.now()}`;

  if (!pixelId || !token) {
    const detail = 'TIKTOK_PIXEL_ID or TIKTOK_EVENTS_TOKEN missing in server environment.';
    pushMetaLog({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      channel: 'tiktok_events',
      eventName,
      eventId,
      entityRef,
      status: 'not_configured',
      detail,
    });
    return { ok: false, status: 'not_configured', detail };
  }

  try {
    const user: Record<string, string> = {};
    if (payload.email) user.email = sha256(normEmail(payload.email));
    if (payload.phone && normPhone(payload.phone)) user.phone = sha256(normPhone(payload.phone));

    const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Access-Token': token,
      },
      body: JSON.stringify({
        event_source: 'web',
        event_source_id: pixelId,
        data: [
          {
            event: eventName,
            event_id: eventId,
            event_time: Math.floor(Date.now() / 1000),
            user,
            properties:
              payload.valueUsd !== undefined
                ? { currency: 'USD', value: Number(payload.valueUsd) || 0 }
                : {},
          },
        ],
      }),
    });
    const out = (await res.json().catch(() => ({}))) as { code?: number; message?: string };
    const ok = res.ok && (out.code === undefined || out.code === 0);
    const detail = ok
      ? 'TikTok Events API v1.3 accepted event.'
      : out.message || `TikTok Events API returned HTTP ${res.status}.`;

    pushMetaLog({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      channel: 'tiktok_events',
      eventName,
      eventId,
      entityRef,
      status: ok ? 'sent' : 'failed',
      httpStatus: res.status,
      detail,
    });

    return { ok, status: ok ? 'sent' : 'failed', detail };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Network error reaching TikTok Events API';
    pushMetaLog({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      channel: 'tiktok_events',
      eventName,
      eventId,
      entityRef,
      status: 'failed',
      detail,
    });
    return { ok: false, status: 'failed', detail };
  }
}

export async function sendMetaOrderPurchase(
  order: OrderRecord,
  req: Request,
): Promise<{ status: 'sent' | 'not_configured' | 'failed'; detail: string }> {
  const dataset = process.env.META_DATASET_ID?.trim();
  const token = process.env.META_ACCESS_TOKEN?.trim();
  const testCode = process.env.META_TEST_CODE?.trim();
  const eventId = `purchase-${order.id}`;

  if (!dataset || !token) {
    const detail = 'META_DATASET_ID or META_ACCESS_TOKEN not configured in server environment.';
    pushMetaLog({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      channel: 'website_capi',
      eventName: 'Purchase',
      eventId,
      entityRef: order.id,
      status: 'not_configured',
      detail,
    });
    return { status: 'not_configured', detail };
  }

  const user_data: Record<string, unknown> = {
    client_user_agent: req.get('user-agent') || 'PlayBeatAdmin/2.0',
  };
  if (order.customerEmail) user_data.em = [sha256(normEmail(order.customerEmail))];
  if (order.customerPhone && normPhone(order.customerPhone)) {
    user_data.ph = [sha256(normPhone(order.customerPhone))];
  }

  const ev = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: 'website',
    event_source_url: 'https://playbeat.digital/checkout',
    user_data,
    custom_data: {
      currency: 'USD',
      value: Number(order.totalUsd),
      content_type: 'product',
      content_ids: order.items.map((i) => i.sku),
      contents: order.items.map((i) => ({
        id: i.sku,
        quantity: i.qty,
        item_price: Number(i.priceUsd),
      })),
      num_items: order.items.reduce((sum, i) => sum + i.qty, 0),
    },
  };

  const body: Record<string, unknown> = { data: [ev] };
  if (testCode) body.test_event_code = testCode;

  try {
    const res = await fetch(`${GRAPH_BASE}/${encodeURIComponent(dataset)}/events`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const out = (await res.json().catch(() => ({}))) as {
      events_received?: number;
      error?: { message?: string };
    };
    const status = res.ok ? 'sent' : 'failed';
    const detail = res.ok
      ? `Meta CAPI Purchase event accepted (${out.events_received ?? 1} received).`
      : out.error?.message || `Meta CAPI returned HTTP ${res.status}.`;

    pushMetaLog({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      channel: 'website_capi',
      eventName: 'Purchase',
      eventId,
      entityRef: order.id,
      status,
      httpStatus: res.status,
      detail,
    });
    return { status, detail };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Network error sending Meta CAPI event';
    pushMetaLog({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      channel: 'website_capi',
      eventName: 'Purchase',
      eventId,
      entityRef: order.id,
      status: 'failed',
      detail,
    });
    return { status: 'failed', detail };
  }
}

export async function dispatchMetaTestEvent(channel: 'whatsapp_crm' | 'website_capi') {
  const token = process.env.META_ACCESS_TOKEN?.trim();
  const dataset =
    channel === 'whatsapp_crm'
      ? process.env.META_WA_DATASET_ID?.trim()
      : process.env.META_DATASET_ID?.trim();
  const testCode = process.env.META_TEST_CODE?.trim();
  const waba = process.env.META_WABA_ID?.trim();
  const eventId = `test-${channel}-${Date.now()}`;

  if (!token || !dataset) {
    const missing = [];
    if (!token) missing.push('META_ACCESS_TOKEN');
    if (!dataset) {
      missing.push(channel === 'whatsapp_crm' ? 'META_WA_DATASET_ID' : 'META_DATASET_ID');
    }
    const detail = `Missing server secrets: ${missing.join(', ')}.`;
    pushMetaLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      channel,
      eventName: channel === 'whatsapp_crm' ? 'Lead' : 'PageView',
      eventId,
      entityRef: 'TEST',
      status: 'not_configured',
      detail,
    });
    return { ok: false, error: 'META_NOT_CONFIGURED', detail };
  }

  const ev =
    channel === 'whatsapp_crm'
      ? {
          event_name: 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: 'business_messaging',
          messaging_channel: 'whatsapp',
          user_data: {
            ...(waba ? { whatsapp_business_account_id: waba } : {}),
            em: [sha256('test@playbeat.digital')],
          },
          custom_data: {},
        }
      : {
          event_name: 'PageView',
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: 'website',
          event_source_url: 'https://playbeat.digital/',
          user_data: {
            em: [sha256('test@playbeat.digital')],
          },
        };

  const body: Record<string, unknown> = { data: [ev] };
  if (testCode) body.test_event_code = testCode;

  try {
    const res = await fetch(`${GRAPH_BASE}/${encodeURIComponent(dataset)}/events`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const out = (await res.json().catch(() => ({}))) as {
      events_received?: number;
      error?: { message?: string };
    };
    const detail = res.ok
      ? `Test event accepted by Meta Graph ${GRAPH_VERSION} (${out.events_received ?? 1} received).`
      : out.error?.message || `Meta Graph API returned HTTP ${res.status}.`;
    pushMetaLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      channel,
      eventName: ev.event_name,
      eventId,
      entityRef: 'TEST',
      status: res.ok ? 'sent' : 'failed',
      httpStatus: res.status,
      detail,
    });
    return { ok: res.ok, detail, httpStatus: res.status };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Network error reaching Meta Graph API';
    pushMetaLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      channel,
      eventName: ev.event_name,
      eventId,
      entityRef: 'TEST',
      status: 'failed',
      detail,
    });
    return { ok: false, error: 'NETWORK_ERROR', detail };
  }
}

export function getMetaStatusPayload() {
  const tokenPresent = Boolean(process.env.META_ACCESS_TOKEN?.trim());
  const webDatasetConfigured = Boolean(process.env.META_DATASET_ID?.trim());
  const waDatasetConfigured = Boolean(process.env.META_WA_DATASET_ID?.trim());
  const wabaConfigured = Boolean(process.env.META_WABA_ID?.trim());
  const testCodeActive = Boolean(process.env.META_TEST_CODE?.trim());

  return {
    ok: tokenPresent,
    configured: tokenPresent && (webDatasetConfigured || waDatasetConfigured),
    graphVersion: GRAPH_VERSION,
    webDatasetConfigured,
    waDatasetConfigured,
    wabaConfigured,
    testCodeActive,
    error: tokenPresent ? undefined : 'META_TOKEN_MISSING',
  };
}

// ============================================================================
// Social & Ad Platform Direct OAuth 2.0 & Account Connections
// Platforms: Google AdSense, Google Ads, Google Analytics (GA4),
//            Facebook, Instagram, Threads, TikTok
// ============================================================================

export const CHANNEL_PLATFORMS: ChannelPlatform[] = [
  'google_adsense',
  'google_ads',
  'google_analytics',
  'facebook',
  'instagram',
  'threads',
  'tiktok',
];

interface PlatformMetaSpec {
  platform: ChannelPlatform;
  name: string;
  category: 'Google' | 'Meta' | 'TikTok';
  accountIdLabel: string;
  accountIdPlaceholder: string;
  secondaryIdLabel: string;
  secondaryIdPlaceholder: string;
  requiredEnvVars: string[];
  portalUrl: string;
  scopes: string[];
  authorizeBaseUrl: string;
  tokenUrl: string;
}

const CHANNEL_SPECS: Record<ChannelPlatform, PlatformMetaSpec> = {
  google_adsense: {
    platform: 'google_adsense',
    name: 'Google AdSense',
    category: 'Google',
    accountIdLabel: 'Publisher Account Resource',
    accountIdPlaceholder: 'accounts/pub-9777611286139666',
    secondaryIdLabel: 'Publisher Client ID',
    secondaryIdPlaceholder: 'ca-pub-9777611286139666',
    requiredEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    portalUrl: 'https://adsense.google.com',
    scopes: ['openid', 'email', 'https://www.googleapis.com/auth/adsense.readonly'],
    authorizeBaseUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
  },
  google_ads: {
    platform: 'google_ads',
    name: 'Google Ads',
    category: 'Google',
    accountIdLabel: 'Customer Account ID',
    accountIdPlaceholder: '123-456-7890',
    secondaryIdLabel: 'Manager (MCC) ID',
    secondaryIdPlaceholder: '987-654-3210 (optional)',
    requiredEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    portalUrl: 'https://ads.google.com',
    scopes: ['openid', 'email', 'https://www.googleapis.com/auth/adwords'],
    authorizeBaseUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
  },
  google_analytics: {
    platform: 'google_analytics',
    name: 'Google Analytics (GA4)',
    category: 'Google',
    accountIdLabel: 'GA4 Property ID',
    accountIdPlaceholder: 'properties/123456789',
    secondaryIdLabel: 'Measurement ID',
    secondaryIdPlaceholder: 'G-XXXXXXXXXX',
    requiredEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    portalUrl: 'https://analytics.google.com',
    scopes: ['openid', 'email', 'https://www.googleapis.com/auth/analytics.readonly'],
    authorizeBaseUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
  },
  facebook: {
    platform: 'facebook',
    name: 'Facebook (Meta Business)',
    category: 'Meta',
    accountIdLabel: 'Ad Account / Dataset ID',
    accountIdPlaceholder: 'act_1234567890 or Dataset ID',
    secondaryIdLabel: 'WhatsApp / Business ID',
    secondaryIdPlaceholder: '1971402550484565',
    requiredEnvVars: ['META_APP_ID', 'META_APP_SECRET'],
    portalUrl: 'https://business.facebook.com',
    scopes: ['public_profile', 'email', 'ads_read', 'business_management', 'pages_show_list'],
    authorizeBaseUrl: `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`,
    tokenUrl: `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`,
  },
  instagram: {
    platform: 'instagram',
    name: 'Instagram Business',
    category: 'Meta',
    accountIdLabel: 'IG Business Account ID',
    accountIdPlaceholder: '17841400000000000',
    secondaryIdLabel: 'Linked Facebook Page ID',
    secondaryIdPlaceholder: '100000000000000',
    requiredEnvVars: ['META_APP_ID', 'META_APP_SECRET'],
    portalUrl: 'https://www.instagram.com',
    scopes: ['instagram_basic', 'instagram_manage_insights', 'pages_show_list'],
    authorizeBaseUrl: `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`,
    tokenUrl: `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`,
  },
  threads: {
    platform: 'threads',
    name: 'Threads (Meta)',
    category: 'Meta',
    accountIdLabel: 'Threads User ID',
    accountIdPlaceholder: 'Threads numeric user ID',
    secondaryIdLabel: 'Threads Handle',
    secondaryIdPlaceholder: '@playbeat.digital',
    requiredEnvVars: ['THREADS_APP_ID', 'THREADS_APP_SECRET'],
    portalUrl: 'https://www.threads.net',
    scopes: ['threads_basic', 'threads_manage_insights'],
    authorizeBaseUrl: 'https://threads.net/oauth/authorize',
    tokenUrl: 'https://graph.threads.net/oauth/access_token',
  },
  tiktok: {
    platform: 'tiktok',
    name: 'TikTok for Business',
    category: 'TikTok',
    accountIdLabel: 'Advertiser / Pixel ID',
    accountIdPlaceholder: 'Pixel or Advertiser ID',
    secondaryIdLabel: 'Business Center ID',
    secondaryIdPlaceholder: 'Optional Business Center ID',
    requiredEnvVars: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
    portalUrl: 'https://ads.tiktok.com',
    scopes: ['user.info.basic'],
    authorizeBaseUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
  },
};

interface PendingOAuthState {
  platform: ChannelPlatform;
  redirectUri: string;
  createdAt: number;
  expiresAt: number;
}

const oauthStateStore = new Map<string, PendingOAuthState>();

function getChannelOAuthCredentials(platform: ChannelPlatform): {
  clientId: string;
  clientSecret: string;
} | null {
  if (platform === 'google_adsense' || platform === 'google_ads' || platform === 'google_analytics') {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || '';
    return clientId && clientSecret ? { clientId, clientSecret } : null;
  }
  if (platform === 'facebook' || platform === 'instagram') {
    const clientId = process.env.META_APP_ID?.trim() || '';
    const clientSecret = process.env.META_APP_SECRET?.trim() || '';
    return clientId && clientSecret ? { clientId, clientSecret } : null;
  }
  if (platform === 'threads') {
    const clientId = process.env.THREADS_APP_ID?.trim() || '';
    const clientSecret = process.env.THREADS_APP_SECRET?.trim() || '';
    return clientId && clientSecret ? { clientId, clientSecret } : null;
  }
  if (platform === 'tiktok') {
    const clientId = process.env.TIKTOK_CLIENT_KEY?.trim() || '';
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim() || '';
    return clientId && clientSecret ? { clientId, clientSecret } : null;
  }
  return null;
}

export function isValidChannelPlatform(value: string): value is ChannelPlatform {
  return CHANNEL_PLATFORMS.includes(value as ChannelPlatform);
}

export function getChannelCallbackBaseUrl(): string {
  const raw = process.env.APP_URL?.trim();
  if (raw && raw !== 'MY_APP_URL') {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.origin;
      }
    } catch {
      // fall through
    }
  }
  return '';
}

export function getChannelConnectionPayload(platform: ChannelPlatform): ChannelConnection {
  const spec = CHANNEL_SPECS[platform];
  const stored = channelProfilesStore[platform];
  const oauthToken = channelOAuthTokens.get(platform);
  const oauthReady = Boolean(getChannelOAuthCredentials(platform));

  let connected = Boolean(oauthToken?.accessToken);
  let connectionMethod: ChannelConnection['connectionMethod'] = oauthToken?.accessToken
    ? 'oauth'
    : 'none';

  if (!connected && platform === 'google_adsense') {
    const adsenseStatus = getAdSenseConfigStatus();
    if (adsenseStatus.connected) {
      connected = true;
      connectionMethod = adsenseStatus.authMode === 'service_account' ? 'service_account' : 'oauth';
    }
  } else if (!connected && platform === 'facebook') {
    if (process.env.META_ACCESS_TOKEN?.trim()) {
      connected = true;
      connectionMethod = 'server_token';
    }
  } else if (!connected && platform === 'tiktok') {
    if (process.env.TIKTOK_EVENTS_TOKEN?.trim() && process.env.TIKTOK_PIXEL_ID?.trim()) {
      connected = true;
      connectionMethod = 'server_token';
    }
  }

  if (!connected && stored.accountId.trim()) {
    connectionMethod = 'profile_only';
  }

  return {
    platform,
    name: spec.name,
    category: spec.category,
    accountId: stored.accountId,
    accountIdLabel: spec.accountIdLabel,
    accountIdPlaceholder: spec.accountIdPlaceholder,
    secondaryId: stored.secondaryId,
    secondaryIdLabel: spec.secondaryIdLabel,
    secondaryIdPlaceholder: spec.secondaryIdPlaceholder,
    loginIdentifier: stored.loginIdentifier,
    notes: stored.notes,
    connected,
    connectionMethod,
    oauthReady,
    requiredEnvVars: spec.requiredEnvVars,
    callbackPath: `/auth/oauth/${platform}/callback`,
    portalUrl: spec.portalUrl,
    scopes: spec.scopes,
    connectedEmail: stored.connectedEmail,
    connectedAt: oauthToken?.connectedAt || stored.connectedAt,
    lastVerifiedAt: stored.lastVerifiedAt,
    lastVerifyDetail: stored.lastVerifyDetail,
  };
}

export function getAllChannelConnections(): ChannelConnection[] {
  return CHANNEL_PLATFORMS.map((p) => getChannelConnectionPayload(p));
}

export function buildChannelOAuthUrl(
  platform: ChannelPlatform,
  fallbackOrigin?: string,
): { ok: true; url: string; redirectUri: string } | { ok: false; error: string; message: string; requiredEnvVars: string[]; redirectUri: string } {
  const spec = CHANNEL_SPECS[platform];
  const baseOrigin = getChannelCallbackBaseUrl() || fallbackOrigin || '';
  const redirectUri = `${baseOrigin}${`/auth/oauth/${platform}/callback`}`;
  const creds = getChannelOAuthCredentials(platform);

  if (!creds) {
    return {
      ok: false,
      error: 'OAUTH_APP_NOT_CONFIGURED',
      message: `Configure ${spec.requiredEnvVars.join(' and ')} in Settings → Secrets to enable direct ${spec.name} OAuth sign-in.`,
      requiredEnvVars: spec.requiredEnvVars,
      redirectUri,
    };
  }

  if (!baseOrigin) {
    return {
      ok: false,
      error: 'APP_URL_MISSING',
      message: 'Unable to determine callback origin for OAuth redirect URI.',
      requiredEnvVars: spec.requiredEnvVars,
      redirectUri,
    };
  }

  // Prune expired state entries
  const now = Date.now();
  for (const [k, v] of oauthStateStore.entries()) {
    if (v.expiresAt < now) oauthStateStore.delete(k);
  }

  const state = crypto.randomBytes(24).toString('hex');
  oauthStateStore.set(state, {
    platform,
    redirectUri,
    createdAt: now,
    expiresAt: now + 10 * 60 * 1000,
  });

  const params = new URLSearchParams();
  if (platform === 'tiktok') {
    params.set('client_key', creds.clientId);
    params.set('redirect_uri', redirectUri);
    params.set('response_type', 'code');
    params.set('scope', spec.scopes.join(','));
    params.set('state', state);
  } else if (platform === 'google_adsense' || platform === 'google_ads' || platform === 'google_analytics') {
    params.set('client_id', creds.clientId);
    params.set('redirect_uri', redirectUri);
    params.set('response_type', 'code');
    params.set('scope', spec.scopes.join(' '));
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
    params.set('include_granted_scopes', 'true');
    params.set('state', state);
    const hint = channelProfilesStore[platform].loginIdentifier.trim();
    if (hint && hint.includes('@')) {
      params.set('login_hint', hint);
    }
  } else {
    // Facebook, Instagram, Threads
    params.set('client_id', creds.clientId);
    params.set('redirect_uri', redirectUri);
    params.set('response_type', 'code');
    params.set('scope', spec.scopes.join(','));
    params.set('state', state);
  }

  return {
    ok: true,
    url: `${spec.authorizeBaseUrl}?${params.toString()}`,
    redirectUri,
  };
}

export async function exchangeChannelOAuthCode(
  platform: ChannelPlatform,
  code: string,
  state: string,
): Promise<{ ok: boolean; error?: string }> {
  const pending = oauthStateStore.get(state);
  if (!pending || pending.platform !== platform || pending.expiresAt < Date.now()) {
    if (pending) oauthStateStore.delete(state);
    return { ok: false, error: 'INVALID_OR_EXPIRED_STATE' };
  }
  oauthStateStore.delete(state);

  const creds = getChannelOAuthCredentials(platform);
  if (!creds) {
    return { ok: false, error: 'OAUTH_APP_NOT_CONFIGURED' };
  }

  const spec = CHANNEL_SPECS[platform];
  try {
    let tokenBody: Record<string, unknown> = {};
    if (platform === 'tiktok') {
      const res = await fetch(spec.tokenUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: creds.clientId,
          client_secret: creds.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: pending.redirectUri,
        }),
      });
      tokenBody = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok || !tokenBody.access_token) {
        return {
          ok: false,
          error: String(tokenBody.error_description || tokenBody.error || 'TIKTOK_TOKEN_EXCHANGE_FAILED'),
        };
      }
    } else if (platform === 'facebook' || platform === 'instagram') {
      const url = new URL(spec.tokenUrl);
      url.searchParams.set('client_id', creds.clientId);
      url.searchParams.set('client_secret', creds.clientSecret);
      url.searchParams.set('redirect_uri', pending.redirectUri);
      url.searchParams.set('code', code);
      const res = await fetch(url.toString(), { method: 'GET' });
      tokenBody = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok || !tokenBody.access_token) {
        const errObj = tokenBody.error as { message?: string } | undefined;
        return { ok: false, error: errObj?.message || 'META_TOKEN_EXCHANGE_FAILED' };
      }
    } else {
      // Google (AdSense, Google Ads, GA4) and Threads
      const res = await fetch(spec.tokenUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: pending.redirectUri,
        }),
      });
      tokenBody = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok || !tokenBody.access_token) {
        return {
          ok: false,
          error: String(tokenBody.error_description || tokenBody.error || 'OAUTH_TOKEN_EXCHANGE_FAILED'),
        };
      }
    }

    const accessToken = String(tokenBody.access_token);
    const refreshToken =
      typeof tokenBody.refresh_token === 'string' ? tokenBody.refresh_token : undefined;
    const expiresIn = Number(tokenBody.expires_in) || 3600;
    const nowIso = new Date().toISOString();

    channelOAuthTokens.set(platform, {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
      scope: typeof tokenBody.scope === 'string' ? tokenBody.scope : spec.scopes.join(' '),
      connectedAt: nowIso,
    });

    // Fetch identity email/name when Google OAuth completes
    const stored = channelProfilesStore[platform];
    stored.connectedAt = nowIso;
    stored.lastVerifiedAt = nowIso;
    stored.lastVerifyDetail = `Connected via ${spec.name} OAuth 2.0.`;

    if (platform.startsWith('google_')) {
      try {
        const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { authorization: `Bearer ${accessToken}` },
        });
        const info = (await infoRes.json().catch(() => ({}))) as { email?: string };
        if (infoRes.ok && info.email) {
          stored.connectedEmail = info.email;
          if (!stored.loginIdentifier) stored.loginIdentifier = info.email;
        }
      } catch {
        // non-fatal
      }
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'OAUTH_EXCHANGE_NETWORK_ERROR',
    };
  }
}

export async function verifyChannelConnection(
  platform: ChannelPlatform,
): Promise<{ ok: boolean; detail: string }> {
  const stored = channelProfilesStore[platform];
  const token = channelOAuthTokens.get(platform);
  const nowIso = new Date().toISOString();

  if (platform === 'google_adsense') {
    const report = await fetchAdSenseAnalytics('7d', 'date');
    const detail = report.ok
      ? `AdSense Management API v2 reachable (${report.daily?.length || 0} days returned).`
      : report.message || report.error || 'AdSense not yet connected.';
    stored.lastVerifiedAt = nowIso;
    stored.lastVerifyDetail = detail;
    return { ok: report.ok, detail };
  }

  if (platform === 'facebook' || platform === 'instagram') {
    const activeToken = token?.accessToken || process.env.META_ACCESS_TOKEN?.trim();
    if (!activeToken) {
      const detail = 'No Meta OAuth session or META_ACCESS_TOKEN configured on server.';
      stored.lastVerifiedAt = nowIso;
      stored.lastVerifyDetail = detail;
      return { ok: false, detail };
    }
    try {
      const res = await fetch(`${GRAPH_BASE}/me?fields=id,name`, {
        headers: { authorization: `Bearer ${activeToken}` },
      });
      const body = (await res.json().catch(() => ({}))) as {
        id?: string;
        name?: string;
        error?: { message?: string };
      };
      const detail = res.ok
        ? `Meta Graph ${GRAPH_VERSION} verified (${body.name || body.id || 'authorized'}).`
        : body.error?.message || `Meta Graph API returned HTTP ${res.status}.`;
      stored.lastVerifiedAt = nowIso;
      stored.lastVerifyDetail = detail;
      return { ok: res.ok, detail };
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Network error reaching Meta Graph.';
      stored.lastVerifiedAt = nowIso;
      stored.lastVerifyDetail = detail;
      return { ok: false, detail };
    }
  }

  if (token?.accessToken) {
    const detail = `${CHANNEL_SPECS[platform].name} OAuth 2.0 session active (connected ${token.connectedAt.slice(0, 10)}).`;
    stored.lastVerifiedAt = nowIso;
    stored.lastVerifyDetail = detail;
    return { ok: true, detail };
  }

  if (platform === 'tiktok' && process.env.TIKTOK_EVENTS_TOKEN?.trim() && process.env.TIKTOK_PIXEL_ID?.trim()) {
    const detail = 'TikTok Events API server credentials configured (TIKTOK_PIXEL_ID & TIKTOK_EVENTS_TOKEN).';
    stored.lastVerifiedAt = nowIso;
    stored.lastVerifyDetail = detail;
    return { ok: true, detail };
  }

  const detail = `Account ID saved (${stored.accountId || 'not set'}). Click Connect to sign in via ${CHANNEL_SPECS[platform].name} OAuth 2.0.`;
  stored.lastVerifiedAt = nowIso;
  stored.lastVerifyDetail = detail;
  return { ok: false, detail };
}

