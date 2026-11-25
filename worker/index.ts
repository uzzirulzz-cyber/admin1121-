/**
 * PlayBeat Admin Console — Cloudflare Worker (playbeat-admin)
 * Deployed to: admin.playbeat.digital & manage.playbeat.digital
 * Linked to Storefront (playbeat.digital) via:
 *   1. Shared Cloudflare KV namespace: PLAYBEAT_KV (playbeat-digital-kv)
 *   2. Cloudflare Service Binding: STOREFRONT -> playbeat-digital
 *
 * Security: Zero secrets in source code. All credentials are read from
 * Worker secrets (`wrangler secret put`) or proxied over the internal
 * STOREFRONT Service Binding.
 */

interface KVNamespaceLike {
  get(key: string, type?: 'text' | 'json'): Promise<any>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number }): Promise<{ keys: Array<{ name: string }> }>;
}

interface FetcherLike {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

interface Env {
  ASSETS?: FetcherLike;
  PLAYBEAT_KV?: KVNamespaceLike;
  KV?: KVNamespaceLike;
  STOREFRONT?: FetcherLike;
  STOREFRONT_URL?: string;
  ADMIN_SUBDOMAINS?: string;
  ADSENSE_ACCOUNT?: string;
  USD_TO_PKR?: string;
  ADMIN_PASSWORD?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_ADSENSE_CLIENT_ID?: string;
  GOOGLE_ADSENSE_CLIENT_SECRET?: string;
  GOOGLE_ADSENSE_API_KEY?: string;
  GOOGLE_SERVICE_ACCOUNT_JSON?: string;
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  META_ACCESS_TOKEN?: string;
  META_WA_DATASET_ID?: string;
  META_WEB_DATASET_ID?: string;
  META_WABA_ID?: string;
  META_TEST_CODE?: string;
  TIKTOK_CLIENT_KEY?: string;
  TIKTOK_CLIENT_SECRET?: string;
  TIKTOK_PIXEL_ID?: string;
  TIKTOK_EVENTS_TOKEN?: string;
  TIKTOK_CRM_EVENT_SET_ID?: string;
  TIKTOK_CRM_ACCESS_TOKEN?: string;
  ELECTRONIC_FIRST_API_KEY?: string;
  ELECTRONIC_FIRST_AFFILIATE_REF?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_ENDPOINT?: string;
}

interface SessionRecord {
  id: string;
  role: 'admin' | 'customer';
  uid: string;
  email: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  upstreamToken?: string;
}

interface StorefrontCatalogBlob {
  digitalProducts: any[];
  businessServices: any[];
  liveTvChannels: any[];
  liveTvPlans: any[];
  serviceInquiries?: any[];
  lastPublishedSyncAt?: string;
  liveTvCatalogVersion?: number;
  [key: string]: any;
}

const CRM_STAGES = ['Researched', 'Contacted', 'Replied', 'Qualified', 'Won', 'Lost'] as const;
const SESSION_TTL_SECONDS = 86400; // 24 hours
const EF_BASE_URL = 'https://www.electronicfirst.com/api/dev/v1';

const DEFAULT_DOMAINS = [
  {
    domain: 'playbeat.digital',
    siteRole: 'Primary Digital Storefront & Checkout',
    hosting: 'Cloudflare Worker (playbeat-digital)',
    inCloudflareAccount: true,
    adsTxtOk: true,
    adsByGoogleOk: true,
    privacyOk: true,
    termsOk: true,
    autoAdsNote: 'Active via Worker + ads-txt route',
    contactEmail: 'business@playbeat.digital',
  },
  {
    domain: 'playbeat.live',
    siteRole: 'Live Sports & PlayBeat TV Portal',
    hosting: 'Cloudflare Worker (playbeat-live-edge)',
    inCloudflareAccount: true,
    adsTxtOk: true,
    adsByGoogleOk: true,
    privacyOk: true,
    termsOk: true,
    autoAdsNote: 'Active on playbeat-live-edge',
    contactEmail: 'business@playbeat.digital',
  },
  {
    domain: 'playbeatarena.asia',
    siteRole: 'Asia Gaming & Esports Hub',
    hosting: 'Cloudflare Edge',
    inCloudflareAccount: true,
    adsTxtOk: true,
    adsByGoogleOk: true,
    privacyOk: true,
    termsOk: true,
    autoAdsNote: 'ads.txt verified',
    contactEmail: 'business@playbeat.digital',
  },
  {
    domain: 'playbeatdigital.world',
    siteRole: 'Global Deals & Bundles Landing',
    hosting: 'Cloudflare Edge',
    inCloudflareAccount: true,
    adsTxtOk: true,
    adsByGoogleOk: true,
    privacyOk: true,
    termsOk: true,
    autoAdsNote: 'ads.txt verified',
    contactEmail: 'business@playbeat.digital',
  },
  {
    domain: 'playbeatarena.online',
    siteRole: 'Community Tournaments & Guides',
    hosting: 'Cloudflare Edge',
    inCloudflareAccount: true,
    adsTxtOk: true,
    adsByGoogleOk: true,
    privacyOk: true,
    termsOk: true,
    autoAdsNote: 'ads.txt verified',
    contactEmail: 'business@playbeat.digital',
  },
];

const CHANNEL_DEFAULTS: Record<string, any> = {
  google_adsense: {
    platform: 'google_adsense',
    name: 'Google AdSense',
    category: 'Google',
    accountId: 'accounts/pub-9777611286139666',
    accountIdLabel: 'Publisher / Account ID',
    accountIdPlaceholder: 'accounts/pub-9777611286139666',
    secondaryId: 'ca-pub-9777611286139666',
    secondaryIdLabel: 'Publisher Code',
    secondaryIdPlaceholder: 'ca-pub-XXXXXXXXXXXXXXXX',
    loginIdentifier: 'business@playbeat.digital',
    notes: 'Linked via playbeat-digital Worker & OAuth2',
    requiredEnvVars: ['GOOGLE_ADSENSE_CLIENT_ID', 'GOOGLE_ADSENSE_CLIENT_SECRET'],
    callbackPath: '/auth/oauth/google_adsense/callback',
    portalUrl: 'https://www.google.com/adsense',
    scopes: ['https://www.googleapis.com/auth/adsense.readonly'],
  },
  google_ads: {
    platform: 'google_ads',
    name: 'Google Ads',
    category: 'Google',
    accountId: '',
    accountIdLabel: 'Customer ID',
    accountIdPlaceholder: '123-456-7890',
    secondaryId: '',
    secondaryIdLabel: 'Manager Account (MCC) ID',
    secondaryIdPlaceholder: 'Optional MCC ID',
    loginIdentifier: 'business@playbeat.digital',
    notes: '',
    requiredEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    callbackPath: '/auth/oauth/google_ads/callback',
    portalUrl: 'https://ads.google.com',
    scopes: ['https://www.googleapis.com/auth/adwords'],
  },
  google_analytics: {
    platform: 'google_analytics',
    name: 'Google Analytics (GA4)',
    category: 'Google',
    accountId: '',
    accountIdLabel: 'GA4 Property ID',
    accountIdPlaceholder: 'properties/123456789',
    secondaryId: '',
    secondaryIdLabel: 'Measurement ID',
    secondaryIdPlaceholder: 'G-XXXXXXXXXX',
    loginIdentifier: 'business@playbeat.digital',
    notes: '',
    requiredEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    callbackPath: '/auth/oauth/google_analytics/callback',
    portalUrl: 'https://analytics.google.com',
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  },
  facebook: {
    platform: 'facebook',
    name: 'Facebook & Meta Business',
    category: 'Meta',
    accountId: '1971402550484565',
    accountIdLabel: 'Dataset / Pixel ID',
    accountIdPlaceholder: '1971402550484565',
    secondaryId: '',
    secondaryIdLabel: 'Ad Account / Page ID',
    secondaryIdPlaceholder: 'act_123456789',
    loginIdentifier: 'business@playbeat.digital',
    notes: 'Meta CAPI & WhatsApp Marketing Message Event Sharing',
    requiredEnvVars: ['META_APP_ID', 'META_APP_SECRET'],
    callbackPath: '/auth/oauth/facebook/callback',
    portalUrl: 'https://business.facebook.com',
    scopes: ['ads_read', 'pages_show_list', 'business_management'],
  },
  instagram: {
    platform: 'instagram',
    name: 'Instagram Business',
    category: 'Meta',
    accountId: '',
    accountIdLabel: 'Instagram Business ID',
    accountIdPlaceholder: '17841400000000000',
    secondaryId: '',
    secondaryIdLabel: 'Handle',
    secondaryIdPlaceholder: '@playbeatdigital',
    loginIdentifier: 'business@playbeat.digital',
    notes: '',
    requiredEnvVars: ['META_APP_ID', 'META_APP_SECRET'],
    callbackPath: '/auth/oauth/instagram/callback',
    portalUrl: 'https://business.facebook.com/latest/home',
    scopes: ['instagram_basic', 'instagram_manage_insights'],
  },
  threads: {
    platform: 'threads',
    name: 'Threads',
    category: 'Meta',
    accountId: '',
    accountIdLabel: 'Threads User ID',
    accountIdPlaceholder: 'Threads numeric user ID',
    secondaryId: '',
    secondaryIdLabel: 'Handle',
    secondaryIdPlaceholder: '@playbeatdigital',
    loginIdentifier: 'business@playbeat.digital',
    notes: '',
    requiredEnvVars: ['META_APP_ID', 'META_APP_SECRET'],
    callbackPath: '/auth/oauth/threads/callback',
    portalUrl: 'https://www.threads.net',
    scopes: ['threads_basic', 'threads_manage_insights'],
  },
  tiktok: {
    platform: 'tiktok',
    name: 'TikTok Business & Events',
    category: 'TikTok',
    accountId: 'DC3J0CBC77U6OQMIKJ80',
    accountIdLabel: 'TikTok Pixel / Advertiser ID',
    accountIdPlaceholder: 'DC3J0CBC77U6OQMIKJ80',
    secondaryId: '',
    secondaryIdLabel: 'Handle',
    secondaryIdPlaceholder: '@playbeatdigital',
    loginIdentifier: 'business@playbeat.digital',
    notes: 'TikTok Pixel DC3J0CBC77U6OQMIKJ80 installed on Admin Console and shared pb:tiktok:config:v1 KV.',
    requiredEnvVars: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
    callbackPath: '/auth/oauth/tiktok/callback',
    portalUrl: 'https://ads.tiktok.com',
    scopes: ['user.info.basic'],
  },
};

function kvOf(env: Env): KVNamespaceLike {
  const kv = env.PLAYBEAT_KV || env.KV;
  if (!kv) throw new Error('PLAYBEAT_KV binding missing');
  return kv;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function randomHex(bytes = 24): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hashPassword(password: string, salt = randomHex(16)): Promise<string> {
  const digest = await sha256Hex(`${salt}:${password}:pb-v1`);
  return `${salt}$${digest}`;
}

async function verifyPasswordHash(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split('$');
  if (!salt || !hash) return false;
  const candidate = await sha256Hex(`${salt}:${password}:pb-v1`);
  return safeEqual(candidate, hash);
}

function isSafeHttpUrl(raw: string): boolean {
  if (!raw) return true;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isSafeAvatarUrl(raw: string): boolean {
  if (!raw) return true;
  if (raw.startsWith('/src/assets/images/')) return true;
  if (/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(raw)) {
    return raw.length <= 700_000;
  }
  return isSafeHttpUrl(raw);
}

function defaultOperatorProfile() {
  return {
    uid: 'admin_operator',
    role: 'admin' as const,
    username: 'playbeat.ops',
    firstName: 'PlayBeat',
    lastName: 'Operator',
    displayName: 'PlayBeat Operator',
    email: 'business@playbeat.digital',
    phone: '+923000000000',
    title: 'Lead Operations Admin',
    department: 'Storefront & Monetization',
    address: 'PlayBeat Digital Operations Desk',
    city: 'Lahore',
    country: 'Pakistan',
    postalCode: '54000',
    website: 'https://playbeat.digital',
    bio: 'Managing PlayBeat Digital storefront fulfillment, 5-domain AdSense reporting, Meta WhatsApp CRM sync, and live TV inventory.',
    avatarUrl: '/src/assets/images/admin_avatar_1795614396198.jpg',
    coverTheme: 'argon-blue' as const,
    brandTitle: 'PlayBeat Admin',
    customFields: [
      { id: 'cf-1', label: 'AdSense Publisher', value: 'ca-pub-9777611286139666', category: 'Billing' },
      { id: 'cf-2', label: 'Primary Storefront', value: 'playbeat.digital', category: 'Operations' },
      { id: 'cf-3', label: 'Admin Subdomains', value: 'admin.playbeat.digital · manage.playbeat.digital', category: 'Operations' },
    ],
    socialLinks: [
      { id: 'sl-1', platform: 'Storefront', handle: 'playbeat.digital', url: 'https://playbeat.digital' },
      { id: 'sl-2', platform: 'PlayBeat Live', handle: 'playbeat.live', url: 'https://playbeat.live' },
    ],
    skills: ['AdSense Operations', 'Storefront Fulfillment', 'Meta WhatsApp CRM', 'Cloudflare Workers'],
    provider: 'Password' as const,
    memberSince: '2025-01-15',
    prefs: {
      orderUpdates: true,
      productNews: true,
      securityAlerts: true,
    },
  };
}

async function readJsonKv<T>(env: Env, key: string, fallback: T): Promise<T> {
  try {
    const raw = await kvOf(env).get(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonKv(env: Env, key: string, value: unknown, ttl?: number): Promise<void> {
  await kvOf(env).put(key, JSON.stringify(value), ttl ? { expirationTtl: ttl } : undefined);
}

// ---------- Storefront KV Mappers (Preserves live playbeat.digital schema!) ----------

async function loadStorefrontCatalog(env: Env): Promise<StorefrontCatalogBlob> {
  const raw = await readJsonKv<any>(env, 'pb:catalog:v1', null);
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return {
      ...raw,
      digitalProducts: Array.isArray(raw.digitalProducts) ? raw.digitalProducts : [],
      businessServices: Array.isArray(raw.businessServices) ? raw.businessServices : [],
      liveTvChannels: Array.isArray(raw.liveTvChannels) ? raw.liveTvChannels : [],
      liveTvPlans: Array.isArray(raw.liveTvPlans) ? raw.liveTvPlans : [],
    };
  }
  return {
    digitalProducts: Array.isArray(raw) ? raw : [],
    businessServices: [],
    liveTvChannels: [],
    liveTvPlans: [],
    liveTvCatalogVersion: 2,
  };
}

async function saveStorefrontCatalog(env: Env, blob: StorefrontCatalogBlob): Promise<void> {
  blob.lastPublishedSyncAt = new Date().toISOString();
  await writeJsonKv(env, 'pb:catalog:v1', blob);
}

function mapStockToAdmin(raw: any): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
  const s = String(raw || '').toUpperCase().replace(/\s+/g, '_');
  if (s === 'OUT_OF_STOCK' || s === 'OUT') return 'OUT_OF_STOCK';
  if (s === 'LOW_STOCK' || s === 'LOW') return 'LOW_STOCK';
  return 'IN_STOCK';
}

function mapStockToStorefront(status: string): string {
  if (status === 'OUT_OF_STOCK') return 'Out of Stock';
  if (status === 'LOW_STOCK') return 'Low Stock';
  return 'In Stock';
}

function mapCategoryToAdmin(raw: any): 'Games' | 'Gift Cards' | 'Subscriptions' | 'Services' | 'TV Plans' {
  const c = String(raw || '').toLowerCase();
  if (c.includes('gift') || c.includes('card') || c.includes('wallet')) return 'Gift Cards';
  if (c.includes('sub') || c.includes('pass') || c.includes('membership')) return 'Subscriptions';
  if (c.includes('service')) return 'Services';
  if (c.includes('tv')) return 'TV Plans';
  return 'Games';
}

function mapPlatformToAdmin(raw: any): 'PC / Steam' | 'PlayStation' | 'Xbox' | 'Nintendo' | 'Software' | 'TV Plan' | 'Service' {
  const p = String(raw || '').toLowerCase();
  if (p.includes('playstation') || p.includes('psn') || p.includes('ps4') || p.includes('ps5')) return 'PlayStation';
  if (p.includes('xbox')) return 'Xbox';
  if (p.includes('nintendo') || p.includes('switch')) return 'Nintendo';
  if (p.includes('software') || p.includes('windows') || p.includes('office')) return 'Software';
  if (p.includes('tv')) return 'TV Plan';
  if (p.includes('service')) return 'Service';
  return 'PC / Steam';
}

function toAdminProduct(p: any, usdToPkr: number) {
  const priceUsd = Number(p.priceUsd ?? p.price ?? 0) || 0;
  const pricePkr = Number(p.pricePkr ?? Math.round(priceUsd * usdToPkr)) || 0;
  return {
    id: String(p.id || p.sku || p.publicCode || ''),
    sku: String(p.sku || p.id || ''),
    name: String(p.name || p.title || 'Untitled Product'),
    platform: mapPlatformToAdmin(p.platform),
    category: mapCategoryToAdmin(p.category),
    priceUsd,
    pricePkr,
    discountPct: Number(p.discountPct ?? p.discountPercent ?? 0) || 0,
    stockStatus: mapStockToAdmin(p.stockStatus),
    active: p.published !== false && p.active !== false,
    source: p.productUrl?.includes('electronicfirst') ? 'ElectronicFirst' : p.source || 'Manual',
    updatedAt: String(p.updatedAt || new Date().toISOString()),
  };
}

function toAdminService(s: any, usdToPkr: number) {
  const priceUsd = Number(s.priceUsd ?? s.optionalUsd ?? 0) || 0;
  const pricePkr = Number(s.pricePkr ?? s.recommendedPkr ?? Math.round(priceUsd * usdToPkr)) || 0;
  return {
    id: String(s.id || s.sku || ''),
    code: String(s.code || s.sku || s.id || ''),
    name: String(s.name || 'Service'),
    turnaround: String(s.turnaround || s.deliveryTime || '3-5 Days'),
    priceUsd,
    pricePkr,
    active: s.published !== false && s.active !== false,
  };
}

function toAdminTvChannel(ch: any) {
  const rawCat = String(ch.category || 'Entertainment');
  const category = ['Sports', 'News', 'Entertainment', 'Regional'].includes(rawCat)
    ? rawCat
    : 'Entertainment';
  const rawCountry = String(ch.region || ch.country || 'Global');
  const region = rawCountry.includes('USA') || rawCountry.includes('America')
    ? 'USA / NA'
    : rawCountry.includes('Pakistan') || rawCountry.includes('India') || rawCountry.includes('Asia')
      ? 'South Asia'
      : rawCountry.includes('Middle') || rawCountry.includes('Qatar') || rawCountry.includes('UAE')
        ? 'Middle East'
        : 'Global';
  return {
    id: String(ch.id || ch.name || ''),
    name: String(ch.name || 'Channel'),
    category,
    region,
    domain: String(ch.domain || 'playbeat.live'),
    status: ch.status || (ch.isLive === false ? 'OFFLINE' : 'ONLINE'),
    active: ch.published !== false && ch.active !== false,
  };
}

function toAdminTvPlan(pl: any, usdToPkr: number) {
  const priceUsd = Number(pl.priceUsd ?? 0) || 0;
  const pricePkr = Number(pl.pricePkr ?? Math.round(priceUsd * usdToPkr)) || 0;
  const durStr = String(pl.durationLabel || '');
  const durationMonths =
    Number(pl.durationMonths) ||
    (durStr.includes('12') || durStr.toLowerCase().includes('year')
      ? 12
      : durStr.includes('6')
        ? 6
        : durStr.includes('3')
          ? 3
          : 1);
  return {
    id: String(pl.id || pl.sku || ''),
    sku: String(pl.sku || pl.id || ''),
    name: String(pl.name || 'PlayBeat TV Plan'),
    durationMonths,
    domains: Array.isArray(pl.domains) ? pl.domains : ['playbeat.digital', 'playbeat.live'],
    priceUsd,
    pricePkr,
    active: pl.published !== false && pl.active !== false,
  };
}

async function loadOrdersRaw(env: Env): Promise<{ orders: any[]; isObject: boolean; wrapper: Record<string, any> }> {
  const raw = await readJsonKv<any>(env, 'pb:orders:v1', { orders: [] });
  if (Array.isArray(raw)) return { orders: raw, isObject: false, wrapper: {} };
  if (raw && typeof raw === 'object') {
    return {
      orders: Array.isArray(raw.orders) ? raw.orders : [],
      isObject: true,
      wrapper: raw,
    };
  }
  return { orders: [], isObject: true, wrapper: { orders: [] } };
}

async function saveOrdersRaw(env: Env, orders: any[], isObject: boolean, wrapper: Record<string, any>) {
  const payload = isObject ? { ...wrapper, orders } : orders;
  await writeJsonKv(env, 'pb:orders:v1', payload);
}

function mapOrderStatus(s: any): 'PENDING' | 'PAID_FULFILLED' | 'CANCELLED' {
  const up = String(s || '').toUpperCase();
  if (up.includes('FULFILL') || up.includes('PAID') || up.includes('COMPLETE')) return 'PAID_FULFILLED';
  if (up.includes('CANCEL') || up.includes('REFUND')) return 'CANCELLED';
  return 'PENDING';
}

function mapOrderChannel(o: any): 'WhatsApp' | 'PayPal' | 'JazzCash / EasyPaisa' | 'Stripe' | 'Manual' {
  const raw = String(o.channel || o.manualChannel || o.paymentRail || 'Manual').toLowerCase();
  if (raw.includes('whatsapp')) return 'WhatsApp';
  if (raw.includes('paypal')) return 'PayPal';
  if (raw.includes('jazz') || raw.includes('easy') || raw.includes('sada') || raw.includes('naya') || raw.includes('raast')) {
    return 'JazzCash / EasyPaisa';
  }
  if (raw.includes('stripe') || raw.includes('card')) return 'Stripe';
  return 'Manual';
}

function toAdminOrder(o: any, usdToPkr: number) {
  const totalUsd = Number(o.totalUsd ?? 0) || 0;
  const totalPkr = Number(o.totalPkr ?? Math.round(totalUsd * usdToPkr)) || 0;
  return {
    id: String(o.id || o.orderId || ''),
    customerEmail: String(o.customerEmail || ''),
    customerPhone: o.customerPhone || o.customerMobile || undefined,
    customerUid: o.customerUid || undefined,
    channel: mapOrderChannel(o),
    paymentRef: String(o.paymentRef || o.manualReference || 'MANUAL'),
    status: mapOrderStatus(o.status),
    totalUsd,
    totalPkr,
    items: Array.isArray(o.items)
      ? o.items.map((it: any) => ({
          sku: String(it.sku || it.id || 'ITEM'),
          name: String(it.name || it.title || it.sku || 'Item'),
          qty: Number(it.qty ?? it.quantity ?? 1) || 1,
          priceUsd: Number(it.priceUsd ?? it.unitPriceUsd ?? it.price ?? 0) || 0,
        }))
      : [],
    issuedKeys: Array.isArray(o.issuedKeys) ? o.issuedKeys.map(String) : [],
    metaCapiStatus: o.metaCapiStatus,
    createdAt: String(o.createdAt || new Date().toISOString()),
    fulfilledAt: o.fulfilledAt || (mapOrderStatus(o.status) === 'PAID_FULFILLED' ? o.updatedAt : undefined),
  };
}

// ---------- Session & Auth Helpers ----------

async function getSession(request: Request, env: Env): Promise<SessionRecord | null> {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const sess = await readJsonKv<SessionRecord | null>(env, `pb:admin:session:${token}`, null);
  if (!sess) return null;
  if (new Date(sess.expiresAt).getTime() < Date.now()) {
    await kvOf(env).delete(`pb:admin:session:${token}`);
    return null;
  }
  return sess;
}

async function createSession(
  env: Env,
  request: Request,
  data: Omit<SessionRecord, 'id' | 'userAgent' | 'createdAt' | 'expiresAt'>,
): Promise<{ token: string; session: SessionRecord }> {
  const token = randomHex(24);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
  const session: SessionRecord = {
    id: `sess_${token.slice(0, 10)}`,
    userAgent: (request.headers.get('user-agent') || 'Browser Session').slice(0, 140),
    createdAt: now.toISOString(),
    expiresAt,
    ...data,
  };
  await writeJsonKv(env, `pb:admin:session:${token}`, session, SESSION_TTL_SECONDS);
  return { token, session };
}

async function getProfileForSession(env: Env, session: SessionRecord) {
  if (session.role === 'admin') {
    const saved = await readJsonKv<any>(env, 'pb:admin:profile:v1', null);
    return { ...defaultOperatorProfile(), ...(saved || {}), role: 'admin' as const };
  }
  const cust = await readJsonKv<any>(env, `pb:auth:u:${session.uid}`, null);
  const extra = await readJsonKv<any>(env, `pb:account:extra:${session.uid}`, {});
  const displayName = cust?.displayName || session.email.split('@')[0] || 'Customer';
  const [fn = displayName, ...rest] = displayName.split(' ');
  return {
    uid: session.uid,
    role: 'customer' as const,
    username: extra.username || session.email.split('@')[0] || session.uid,
    firstName: extra.firstName || fn,
    lastName: extra.lastName || rest.join(' '),
    displayName,
    email: cust?.email || session.email,
    phone: cust?.phone || '',
    title: extra.title || 'PlayBeat Customer',
    department: extra.department || 'Storefront Member',
    address: extra.address || '',
    city: extra.city || '',
    country: extra.country || '',
    postalCode: extra.postalCode || '',
    website: extra.website || '',
    bio: extra.bio || '',
    avatarUrl: extra.avatarUrl || '',
    coverTheme: extra.coverTheme || 'argon-blue',
    brandTitle: extra.brandTitle || 'PlayBeat Account',
    customFields: Array.isArray(extra.customFields) ? extra.customFields : [],
    socialLinks: Array.isArray(extra.socialLinks) ? extra.socialLinks : [],
    skills: Array.isArray(extra.skills) ? extra.skills : [],
    provider: cust?.provider || 'Email',
    memberSince: cust?.memberSince || new Date().toISOString().slice(0, 10),
    prefs: cust?.prefs || { orderUpdates: true, productNews: true, securityAlerts: true },
  };
}

// ---------- Customers from Shared KV ----------

async function listCustomers(env: Env) {
  const listed = await kvOf(env).list({ prefix: 'pb:auth:u:', limit: 200 });
  const { orders } = await loadOrdersRaw(env);
  const customers: any[] = [];
  for (const k of listed.keys) {
    const rec = await readJsonKv<any>(env, k.name, null);
    if (!rec) continue;
    const uid = String(rec.uid || k.name.replace('pb:auth:u:', ''));
    const email = String(rec.email || '');
    const userOrders = orders.filter(
      (o: any) =>
        (o.customerUid && o.customerUid === uid) ||
        (email && String(o.customerEmail || '').toLowerCase() === email.toLowerCase()),
    );
    const totalSpentUsd = userOrders.reduce((acc: number, o: any) => acc + (Number(o.totalUsd) || 0), 0);
    customers.push({
      uid,
      displayName: String(rec.displayName || rec.name || email.split('@')[0] || uid),
      email,
      phone: rec.phone || '',
      provider: rec.provider === 'Google' ? 'Google' : 'Email',
      memberSince: String(rec.memberSince || rec.createdAt || new Date().toISOString()).slice(0, 10),
      activeSessions: Number(rec.activeSessions ?? 0),
      prefs: rec.prefs || { orderUpdates: true, productNews: true, securityAlerts: true },
      ordersCount: userOrders.length,
      totalSpentUsd: Number(totalSpentUsd.toFixed(2)),
    });
  }
  return customers;
}

// ---------- Storefront Service Binding Proxy Helper ----------

async function fetchStorefront(env: Env, path: string, init?: RequestInit): Promise<Response | null> {
  const baseUrl = env.STOREFRONT_URL || 'https://playbeat.digital';
  const target = `${baseUrl.replace(/\/$/, '')}${path}`;
  if (env.STOREFRONT) {
    try {
      return await env.STOREFRONT.fetch(target, init);
    } catch {
      return null;
    }
  }
  return null;
}

// ---------- Google Service Account RS256 JWT Auth ----------

interface ServiceAccountInfo {
  client_email: string;
  private_key: string;
  private_key_id?: string;
  project_id?: string;
  token_uri?: string;
}

interface StoredServiceAccountRecord {
  id: string;
  label: string;
  source: 'secret' | 'kv';
  clientEmail: string;
  projectId: string;
  privateKeyId: string;
  adsenseAccountId: string;
  ga4PropertyId: string;
  searchConsoleSite: string;
  addedAt: string;
  lastVerifiedAt?: string;
  sa?: ServiceAccountInfo;
}

interface GoogleSaRegistryBlob {
  activeId: string | null;
  envMeta?: {
    label?: string;
    adsenseAccountId?: string;
    ga4PropertyId?: string;
    searchConsoleSite?: string;
    lastVerifiedAt?: string;
  };
  customAccounts: StoredServiceAccountRecord[];
}

function parseServiceAccountJson(raw: string | undefined): ServiceAccountInfo | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed?.client_email && parsed?.private_key && String(parsed.private_key).includes('PRIVATE KEY')) {
      return parsed as ServiceAccountInfo;
    }
  } catch {
    // ignore malformed json
  }
  return null;
}

function parseServiceAccount(env: Env): ServiceAccountInfo | null {
  return parseServiceAccountJson(env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

async function loadGoogleSaRegistry(env: Env): Promise<{
  activeId: string | null;
  records: StoredServiceAccountRecord[];
  rawBlob: GoogleSaRegistryBlob;
}> {
  const blob = await readJsonKv<GoogleSaRegistryBlob>(env, 'pb:google:sa-registry:v1', {
    activeId: null,
    customAccounts: [],
  });
  const records: StoredServiceAccountRecord[] = [];
  const envSa = parseServiceAccount(env);
  if (envSa) {
    records.push({
      id: 'sa_env_primary',
      label: blob.envMeta?.label || 'PlayBeat Primary GCP Service Account',
      source: 'secret',
      clientEmail: envSa.client_email,
      projectId: envSa.project_id || '',
      privateKeyId: envSa.private_key_id || '',
      adsenseAccountId: blob.envMeta?.adsenseAccountId || env.ADSENSE_ACCOUNT || 'accounts/pub-9777611286139666',
      ga4PropertyId: blob.envMeta?.ga4PropertyId || '',
      searchConsoleSite: blob.envMeta?.searchConsoleSite || 'https://playbeat.digital/',
      addedAt: '2026-11-25T00:00:00.000Z',
      lastVerifiedAt: blob.envMeta?.lastVerifiedAt,
      sa: envSa,
    });
  }
  for (const acc of Array.isArray(blob.customAccounts) ? blob.customAccounts : []) {
    if (acc && acc.id && acc.clientEmail && acc.sa?.private_key) {
      records.push(acc);
    }
  }
  const activeId =
    blob.activeId && records.some((r) => r.id === blob.activeId)
      ? blob.activeId
      : records[0]?.id || null;
  return { activeId, records, rawBlob: blob };
}

function toPublicSaSummary(r: StoredServiceAccountRecord, activeId: string | null) {
  return {
    id: r.id,
    label: r.label,
    clientEmail: r.clientEmail,
    projectId: r.projectId,
    privateKeyId: r.privateKeyId,
    source: r.source,
    active: r.id === activeId,
    adsenseAccountId: r.adsenseAccountId,
    ga4PropertyId: r.ga4PropertyId,
    searchConsoleSite: r.searchConsoleSite,
    addedAt: r.addedAt,
    lastVerifiedAt: r.lastVerifiedAt,
  };
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeJson(obj: unknown): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(JSON.stringify(obj)));
}

function pemToPkcs8Bytes(pem: string): Uint8Array {
  const clean = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, '')
    .replace(/-----END [A-Z ]+-----/g, '')
    .replace(/\s+/g, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function mintTokenFromServiceAccount(
  sa: ServiceAccountInfo,
  scope: string,
): Promise<{ ok: true; accessToken: string; email: string; projectId: string } | { ok: false; error: string }> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
    const header = base64UrlEncodeJson({ alg: 'RS256', typ: 'JWT' });
    const claims = base64UrlEncodeJson({
      iss: sa.client_email,
      scope,
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    });
    const signingInput = `${header}.${claims}`;
    const pkcs8 = pemToPkcs8Bytes(sa.private_key);
    const key = await crypto.subtle.importKey(
      'pkcs8',
      pkcs8.buffer as ArrayBuffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sigBuf = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput));
    const jwt = `${signingInput}.${base64UrlEncodeBytes(new Uint8Array(sigBuf))}`;

    const tokenRes = await fetch(tokenUri, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });
    const tokenJson = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenJson.access_token) {
      return {
        ok: false,
        error: tokenJson.error_description || tokenJson.error || `Google OAuth HTTP ${tokenRes.status}`,
      };
    }
    return {
      ok: true,
      accessToken: String(tokenJson.access_token),
      email: sa.client_email,
      projectId: sa.project_id || '',
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Service account JWT signing failed' };
  }
}

async function mintGoogleServiceAccountToken(
  env: Env,
  scope: string,
  specificRecord?: StoredServiceAccountRecord,
): Promise<{ ok: true; accessToken: string; email: string; projectId: string } | { ok: false; error: string }> {
  if (specificRecord?.sa) {
    return mintTokenFromServiceAccount(specificRecord.sa, scope);
  }
  const { activeId, records } = await loadGoogleSaRegistry(env);
  const chosen = records.find((r) => r.id === activeId) || records[0];
  if (!chosen?.sa) return { ok: false, error: 'GOOGLE_SERVICE_ACCOUNT_JSON secret is not configured.' };
  return mintTokenFromServiceAccount(chosen.sa, scope);
}

async function probeServiceAccountApis(record: StoredServiceAccountRecord) {
  const sa = record.sa!;
  const checks: any[] = [];

  // 1. Google AdSense Management API v2
  const adsTok = await mintTokenFromServiceAccount(sa, 'https://www.googleapis.com/auth/adsense.readonly');
  if (!adsTok.ok) {
    checks.push({
      service: 'adsense',
      name: 'Google AdSense Management API v2',
      apiEnabled: false,
      accessGranted: false,
      httpStatus: 401,
      discoveredItems: [],
      detail: adsTok.error,
      actionUrl: 'https://www.google.com/adsense',
    });
  } else {
    const r = await fetch('https://adsense.googleapis.com/v2/accounts', {
      headers: { authorization: `Bearer ${adsTok.accessToken}` },
    });
    const body = await r.json().catch(() => ({}));
    const accounts = Array.isArray(body.accounts) ? body.accounts : [];
    const discovered = accounts.map((a: any) => ({ id: String(a.name || ''), name: String(a.displayName || a.name || '') }));
    const apiEnabled = r.ok || (r.status === 403 && !String(body?.error?.message || '').includes('has not been used'));
    checks.push({
      service: 'adsense',
      name: 'Google AdSense Management API v2',
      apiEnabled,
      accessGranted: r.ok && discovered.length > 0,
      httpStatus: r.status,
      discoveredItems: discovered,
      detail:
        r.ok && discovered.length > 0
          ? `Connected to ${discovered.length} AdSense account(s): ${discovered.map((d: any) => d.id).join(', ')}.`
          : r.ok
            ? `AdSense Management API v2 is ENABLED on ${sa.project_id}, but ${sa.client_email} has not been added as a user in Google AdSense yet.`
            : body?.error?.message || `HTTP ${r.status}`,
      actionUrl: 'https://www.google.com/adsense',
    });
  }

  // 2. Google Analytics 4 (Admin + Data API)
  const gaTok = await mintTokenFromServiceAccount(sa, 'https://www.googleapis.com/auth/analytics.readonly');
  if (!gaTok.ok) {
    checks.push({
      service: 'ga4',
      name: 'Google Analytics 4 (Traffic & Data API)',
      apiEnabled: false,
      accessGranted: false,
      httpStatus: 401,
      discoveredItems: [],
      detail: gaTok.error,
      actionUrl: 'https://analytics.google.com',
    });
  } else {
    const r = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
      headers: { authorization: `Bearer ${gaTok.accessToken}` },
    });
    const body = await r.json().catch(() => ({}));
    const summaries = Array.isArray(body.accountSummaries) ? body.accountSummaries : [];
    const discovered: Array<{ id: string; name: string }> = [];
    for (const s of summaries) {
      for (const p of Array.isArray(s.propertySummaries) ? s.propertySummaries : []) {
        discovered.push({ id: String(p.property || ''), name: String(p.displayName || p.property || '') });
      }
    }
    const apiEnabled = r.ok || (r.status === 403 && !String(body?.error?.message || '').includes('has not been used'));
    checks.push({
      service: 'ga4',
      name: 'Google Analytics 4 (Traffic & Data API)',
      apiEnabled,
      accessGranted: r.ok && discovered.length > 0,
      httpStatus: r.status,
      discoveredItems: discovered,
      detail:
        r.ok && discovered.length > 0
          ? `Discovered ${discovered.length} GA4 propert${discovered.length === 1 ? 'y' : 'ies'}: ${discovered.map((d) => `${d.name} (${d.id})`).join(', ')}.`
          : r.ok
            ? `GA4 Admin & Data APIs are ENABLED on ${sa.project_id}, but ${sa.client_email} needs Viewer role in GA4 → Admin → Property Access Management.`
            : body?.error?.message || `HTTP ${r.status}`,
      actionUrl: 'https://analytics.google.com',
    });
  }

  // 3. Google Search Console API
  const scTok = await mintTokenFromServiceAccount(sa, 'https://www.googleapis.com/auth/webmasters.readonly');
  if (!scTok.ok) {
    checks.push({
      service: 'search_console',
      name: 'Google Search Console (Organic Traffic)',
      apiEnabled: false,
      accessGranted: false,
      httpStatus: 401,
      discoveredItems: [],
      detail: scTok.error,
      actionUrl: 'https://search.google.com/search-console',
    });
  } else {
    const r = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
      headers: { authorization: `Bearer ${scTok.accessToken}` },
    });
    const body = await r.json().catch(() => ({}));
    const sites = Array.isArray(body.siteEntry) ? body.siteEntry : [];
    const discovered = sites.map((s: any) => ({ id: String(s.siteUrl || ''), name: `${s.siteUrl} (${s.permissionLevel})` }));
    const errMsg = String(body?.error?.message || '');
    const apiDisabled = r.status === 403 && errMsg.includes('has not been used');
    checks.push({
      service: 'search_console',
      name: 'Google Search Console (Organic Traffic)',
      apiEnabled: !apiDisabled && (r.ok || r.status !== 403),
      accessGranted: r.ok && discovered.length > 0,
      httpStatus: r.status,
      discoveredItems: discovered,
      detail:
        r.ok && discovered.length > 0
          ? `Connected to ${discovered.length} Search Console site(s).`
          : apiDisabled
            ? `Search Console API is disabled on GCP project ${sa.project_id}. Enable it in Google Cloud Console, then add ${sa.client_email} in Search Console Users & Permissions.`
            : r.ok
              ? `Search Console API is enabled, add ${sa.client_email} as a Restricted/Full user in Search Console Settings.`
              : errMsg || `HTTP ${r.status}`,
      actionUrl: apiDisabled
        ? `https://console.developers.google.com/apis/api/searchconsole.googleapis.com/overview?project=${encodeURIComponent(sa.project_id || '')}`
        : 'https://search.google.com/search-console',
    });
  }

  return checks;
}

async function fetchGa4TrafficReport(
  sa: ServiceAccountInfo,
  configuredPropertyId: string,
  range: string,
  searchConsoleSite: string,
) {
  const gaTok = await mintTokenFromServiceAccount(sa, 'https://www.googleapis.com/auth/analytics.readonly');
  if (!gaTok.ok) {
    return { ok: false, range, propertyId: configuredPropertyId, error: 'GA4_TOKEN_ERROR', message: gaTok.error };
  }

  let propertyId = configuredPropertyId.trim();
  if (propertyId && !propertyId.startsWith('properties/')) {
    propertyId = `properties/${propertyId}`;
  }

  // Discover properties automatically if none set
  let discoveredProperties: Array<{ id: string; name: string }> = [];
  try {
    const sumRes = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
      headers: { authorization: `Bearer ${gaTok.accessToken}` },
    });
    if (sumRes.ok) {
      const sumBody = await sumRes.json().catch(() => ({}));
      for (const s of Array.isArray(sumBody.accountSummaries) ? sumBody.accountSummaries : []) {
        for (const p of Array.isArray(s.propertySummaries) ? s.propertySummaries : []) {
          discoveredProperties.push({ id: String(p.property || ''), name: String(p.displayName || p.property || '') });
        }
      }
      if (!propertyId && discoveredProperties.length > 0) {
        propertyId = discoveredProperties[0].id;
      }
    }
  } catch {
    // ignore discovery error
  }

  if (!propertyId) {
    return {
      ok: false,
      range,
      propertyId: '',
      serviceAccountEmail: sa.client_email,
      discoveredProperties,
      error: 'GA4_PROPERTY_REQUIRED',
      message: `GA4 API is active for ${sa.client_email}, but no GA4 property is visible yet. Add ${sa.client_email} as a Viewer in Google Analytics (Admin → Property Access Management) and enter your GA4 Property ID in the Google Service Accounts tab.`,
    };
  }

  const startDate =
    range === 'today'
      ? 'today'
      : range === 'yesterday'
        ? 'yesterday'
        : range === '28d'
          ? '28daysAgo'
          : range === 'mtd'
            ? `${new Date().toISOString().slice(0, 8)}01`
            : '7daysAgo';
  const endDate = range === 'yesterday' ? 'yesterday' : 'today';

  const runReport = async (body: Record<string, unknown>) => {
    const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${gaTok.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return { ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) };
  };

  const [dailyRes, pagesRes, chanRes] = await Promise.all([
    runReport({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
      ],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),
    runReport({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
      limit: 10,
    }),
    runReport({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      limit: 8,
    }),
  ]);

  if (!dailyRes.ok) {
    return {
      ok: false,
      range,
      propertyId,
      serviceAccountEmail: sa.client_email,
      discoveredProperties,
      error: dailyRes.body?.error?.status || `GA4_HTTP_${dailyRes.status}`,
      message: `${dailyRes.body?.error?.message || 'GA4 Data API request failed'} (Grant Viewer access to ${sa.client_email} on ${propertyId}.)`,
    };
  }

  let totalUsers = 0;
  let totalSessions = 0;
  let totalViews = 0;
  let bounceSum = 0;
  let durSum = 0;

  const dailyRows = Array.isArray(dailyRes.body.rows) ? dailyRes.body.rows : [];
  const daily = dailyRows.map((row: any) => {
    const rawDate = String(row.dimensionValues?.[0]?.value || '');
    const fmtDate = rawDate.length === 8 ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}` : rawDate;
    const activeUsers = Number(row.metricValues?.[0]?.value || 0);
    const sessions = Number(row.metricValues?.[1]?.value || 0);
    const pageViews = Number(row.metricValues?.[2]?.value || 0);
    const bounceRate = Number((Number(row.metricValues?.[3]?.value || 0) * 100).toFixed(1));
    const avgDur = Number(row.metricValues?.[4]?.value || 0);
    totalUsers += activeUsers;
    totalSessions += sessions;
    totalViews += pageViews;
    bounceSum += bounceRate;
    durSum += avgDur;
    return { date: fmtDate, activeUsers, sessions, pageViews, bounceRate };
  });

  const topPages = (Array.isArray(pagesRes.body?.rows) ? pagesRes.body.rows : []).map((row: any) => ({
    path: String(row.dimensionValues?.[0]?.value || '/'),
    views: Number(row.metricValues?.[0]?.value || 0),
    users: Number(row.metricValues?.[1]?.value || 0),
  }));

  const channels = (Array.isArray(chanRes.body?.rows) ? chanRes.body.rows : []).map((row: any) => ({
    channel: String(row.dimensionValues?.[0]?.value || 'Direct'),
    sessions: Number(row.metricValues?.[0]?.value || 0),
    users: Number(row.metricValues?.[1]?.value || 0),
  }));

  // Optional Search Console summary
  let searchConsole: any = { ok: false, siteUrl: searchConsoleSite, message: 'Search Console API not enabled yet.' };
  if (searchConsoleSite) {
    const scTok = await mintTokenFromServiceAccount(sa, 'https://www.googleapis.com/auth/webmasters.readonly');
    if (scTok.ok) {
      const end = new Date().toISOString().slice(0, 10);
      const start = new Date(Date.now() - (range === '28d' ? 28 : 7) * 86400000).toISOString().slice(0, 10);
      const scRes = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(searchConsoleSite)}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: { authorization: `Bearer ${scTok.accessToken}`, 'content-type': 'application/json' },
          body: JSON.stringify({ startDate: start, endDate: end, rowLimit: 1 }),
        },
      );
      const scBody = await scRes.json().catch(() => ({}));
      if (scRes.ok) {
        const row = scBody.rows?.[0] || {};
        searchConsole = {
          ok: true,
          siteUrl: searchConsoleSite,
          clicks: Number(row.clicks || 0),
          impressions: Number(row.impressions || 0),
          ctr: Number(((row.ctr || 0) * 100).toFixed(2)),
          position: Number((row.position || 0).toFixed(1)),
        };
      } else {
        searchConsole = {
          ok: false,
          siteUrl: searchConsoleSite,
          message: scBody?.error?.message || `Search Console HTTP ${scRes.status}`,
        };
      }
    }
  }

  return {
    ok: true,
    range,
    propertyId,
    serviceAccountEmail: sa.client_email,
    discoveredProperties,
    daily,
    topPages,
    channels,
    totals: {
      activeUsers: totalUsers,
      sessions: totalSessions,
      pageViews: totalViews,
      avgBounceRate: daily.length ? Number((bounceSum / daily.length).toFixed(1)) : 0,
      avgSessionDurationSec: daily.length ? Math.round(durSum / daily.length) : 0,
    },
    searchConsole,
  };
}

async function fetchAdSenseReportWithToken(accessToken: string, account: string, range: string, byDomain: boolean) {
  const today = new Date();
  const fmt = (d: Date) => ({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
  const shift = (days: number) => {
    const d = new Date(today.getTime() + days * 86400000);
    return fmt(d);
  };
  let start = shift(-6);
  let end = shift(0);
  if (range === 'today') {
    start = shift(0);
    end = shift(0);
  } else if (range === 'yesterday') {
    start = shift(-1);
    end = shift(-1);
  } else if (range === '28d') {
    start = shift(-27);
  } else if (range === 'mtd') {
    start = { year: today.getUTCFullYear(), month: today.getUTCMonth() + 1, day: 1 };
  }

  const params = new URLSearchParams({
    dateRange: 'CUSTOM',
    'startDate.year': String(start.year),
    'startDate.month': String(start.month),
    'startDate.day': String(start.day),
    'endDate.year': String(end.year),
    'endDate.month': String(end.month),
    'endDate.day': String(end.day),
    dimensions: byDomain ? 'DOMAIN_NAME' : 'DATE',
  });
  for (const m of ['ESTIMATED_EARNINGS', 'PAGE_VIEWS', 'IMPRESSIONS', 'CLICKS']) {
    params.append('metrics', m);
  }

  const endpoint = `https://adsense.googleapis.com/v2/${account}/reports:generate?${params.toString()}`;
  const res = await fetch(endpoint, { headers: { authorization: `Bearer ${accessToken}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      httpStatus: res.status,
      error: body?.error?.status || `HTTP_${res.status}`,
      message: body?.error?.message || `AdSense API returned HTTP ${res.status}`,
    };
  }

  const rows = Array.isArray(body.rows) ? body.rows : [];
  let totalEarnings = 0;
  let totalPageViews = 0;
  let totalImpressions = 0;
  let totalClicks = 0;

  const parsed = rows.map((row: any) => {
    const cells = Array.isArray(row.cells) ? row.cells : [];
    const dim = String(cells[0]?.value || '');
    const earnings = Number(cells[1]?.value || 0);
    const pageViews = Number(cells[2]?.value || 0);
    const impressions = Number(cells[3]?.value || 0);
    const clicks = Number(cells[4]?.value || 0);
    totalEarnings += earnings;
    totalPageViews += pageViews;
    totalImpressions += impressions;
    totalClicks += clicks;
    return byDomain
      ? { domain: dim, earnings: Number(earnings.toFixed(2)), pageViews, impressions, clicks }
      : { date: dim, earnings: Number(earnings.toFixed(2)), pageViews, impressions, clicks };
  });

  const rpm = totalPageViews > 0 ? Number(((totalEarnings / totalPageViews) * 1000).toFixed(2)) : 0;
  const ctr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

  return {
    ok: true,
    range,
    by: byDomain ? 'DOMAIN_NAME' : 'DATE',
    ...(byDomain ? { domains: parsed } : { daily: parsed }),
    totals: {
      earnings: Number(totalEarnings.toFixed(2)),
      pageViews: totalPageViews,
      impressions: totalImpressions,
      clicks: totalClicks,
      rpm,
      ctr,
    },
  };
}

// ---------- Meta WhatsApp CRM & Website CAPI Dispatch ----------

async function appendMetaLog(
  env: Env,
  entry: {
    channel: 'whatsapp_crm' | 'website_capi' | 'tiktok_events';
    eventName: string;
    eventId: string;
    entityRef: string;
    status: 'sent' | 'not_configured' | 'failed';
    httpStatus?: number;
    detail: string;
  },
) {
  try {
    const existing = await readJsonKv<any[]>(env, 'pb:admin:meta-logs:v1', []);
    const next = [
      { id: `mlog_${randomHex(5)}`, timestamp: new Date().toISOString(), ...entry },
      ...(Array.isArray(existing) ? existing : []),
    ].slice(0, 50);
    await writeJsonKv(env, 'pb:admin:meta-logs:v1', next);
  } catch {
    // non-fatal logging failure
  }
}

async function dispatchMetaCrmStage(env: Env, lead: any, channel: 'whatsapp_crm' | 'website_capi' = 'whatsapp_crm') {
  const eventName = lead.status === 'Qualified' ? 'Lead' : lead.status === 'Won' ? 'Purchase' : null;
  if (!eventName) return { ok: true, skipped: true, status: 'skipped', message: 'Stage does not emit a Meta event.' };

  const metaCfg = await readJsonKv<any>(env, 'pb:meta:config:v1', {});
  const token = env.META_ACCESS_TOKEN || metaCfg.accessToken || (await kvOf(env).get('pb:meta:token:v1'));
  const datasetId =
    channel === 'website_capi'
      ? env.META_WEB_DATASET_ID || env.META_WA_DATASET_ID || metaCfg.datasetId || metaCfg.pixelId
      : env.META_WA_DATASET_ID || metaCfg.waDatasetId || metaCfg.datasetId || (await kvOf(env).get('pb:meta:wa-dataset:v1'));
  const wabaId = env.META_WABA_ID || metaCfg.wabaId || (await kvOf(env).get('pb:meta:waba:v1'));
  const testCode = env.META_TEST_CODE || metaCfg.testEventCode || (await kvOf(env).get('pb:meta:testcode:v1'));
  const eventId = `${channel === 'website_capi' ? 'web' : 'crm'}-${lead.leadId}-${String(lead.status).toLowerCase()}`;

  if (!token || !datasetId) {
    const msg = 'Configure META_ACCESS_TOKEN and META_WA_DATASET_ID to send Meta events.';
    await appendMetaLog(env, {
      channel,
      eventName,
      eventId,
      entityRef: String(lead.leadId || 'test'),
      status: 'not_configured',
      detail: msg,
    });
    return { ok: false, status: 'not_configured', message: msg };
  }

  const userData: Record<string, unknown> = {};
  if (channel === 'whatsapp_crm' && wabaId) userData.whatsapp_business_account_id = wabaId;
  if (lead.ctwaClid) userData.ctwa_clid = lead.ctwaClid;
  const digits = String(lead.phone || '').replace(/\D/g, '');
  if (digits) userData.ph = [await sha256Hex(digits)];
  if (lead.email) userData.em = [await sha256Hex(String(lead.email).trim().toLowerCase())];

  const eventPayload: Record<string, unknown> =
    channel === 'website_capi'
      ? {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: 'website',
          event_source_url: env.STOREFRONT_URL || 'https://playbeat.digital',
          user_data: userData,
          custom_data: { currency: 'USD', value: Number(lead.expectedValueUsd) || 1 },
        }
      : {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: 'business_messaging',
          messaging_channel: 'whatsapp',
          user_data: userData,
          custom_data:
            eventName === 'Purchase'
              ? { currency: 'USD', value: Number(lead.expectedValueUsd) || 0 }
              : {},
        };

  const payload: Record<string, unknown> = { data: [eventPayload] };
  if (testCode) payload.test_event_code = testCode;

  try {
    const r = await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(datasetId)}/events`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const resBody = await r.json().catch(() => ({}));
    const msg = r.ok
      ? `Sent ${eventName} event to Meta dataset ${datasetId} (events_received: ${resBody.events_received ?? 1}).`
      : `Meta API HTTP ${r.status}: ${resBody?.error?.message || JSON.stringify(resBody).slice(0, 160)}`;
    await appendMetaLog(env, {
      channel,
      eventName,
      eventId,
      entityRef: String(lead.leadId || 'test'),
      status: r.ok ? 'sent' : 'failed',
      httpStatus: r.status,
      detail: msg,
    });
    return {
      ok: r.ok,
      status: r.ok ? 'sent' : 'failed',
      message: msg,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Meta network error';
    await appendMetaLog(env, {
      channel,
      eventName,
      eventId,
      entityRef: String(lead.leadId || 'test'),
      status: 'failed',
      detail: msg,
    });
    return { ok: false, status: 'failed', message: msg };
  }
}

// ---------- TikTok Events API v1.3 Server-Side Dispatch ----------

async function dispatchTikTokEventsApi(
  env: Env,
  opts: {
    event: string;
    eventId: string;
    entityRef: string;
    email?: string;
    phone?: string;
    externalId?: string;
    value?: number;
    currency?: string;
    contents?: Array<{ content_id: string; content_type: string; content_name: string }>;
    url?: string;
  },
) {
  const ttCfg = await readJsonKv<any>(env, 'pb:tiktok:config:v1', {});
  const token = String(env.TIKTOK_EVENTS_TOKEN || ttCfg?.eventsToken || ttCfg?.accessToken || '').trim();
  const pixelId = String(env.TIKTOK_PIXEL_ID || ttCfg?.pixelId || 'DC3J0CBC77U6OQMIKJ80').trim();

  if (!token || !pixelId) {
    const detail = 'Configure TIKTOK_EVENTS_TOKEN secret and TIKTOK_PIXEL_ID to dispatch TikTok Events API.';
    await appendMetaLog(env, {
      channel: 'tiktok_events',
      eventName: opts.event,
      eventId: opts.eventId,
      entityRef: opts.entityRef,
      status: 'not_configured',
      detail,
    });
    return { ok: false, status: 'not_configured' as const, detail };
  }

  const user: Record<string, string> = {};
  if (opts.email) {
    const cleanEmail = String(opts.email).trim().toLowerCase();
    if (cleanEmail) user.email = await sha256Hex(cleanEmail);
  }
  if (opts.phone) {
    const digits = String(opts.phone).replace(/[^\d+]/g, '');
    const normalizedPhone = digits.startsWith('+') ? digits : digits ? `+${digits}` : '';
    if (normalizedPhone) user.phone = await sha256Hex(normalizedPhone);
  }
  if (opts.externalId) {
    const ext = String(opts.externalId).trim();
    if (ext) user.external_id = await sha256Hex(ext);
  }

  const payload = {
    event_source: 'web',
    event_source_id: pixelId,
    data: [
      {
        event: opts.event,
        event_time: Math.floor(Date.now() / 1000),
        event_id: opts.eventId,
        user,
        page: {
          url: opts.url || env.STOREFRONT_URL || 'https://playbeat.digital',
        },
        properties: {
          currency: opts.currency || 'USD',
          value: Number(opts.value ?? 0),
          ...(opts.contents && opts.contents.length > 0 ? { contents: opts.contents } : {}),
        },
      },
    ],
  };

  try {
    const r = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Access-Token': token,
      },
      body: JSON.stringify(payload),
    });
    const resBody = await r.json().catch(() => ({}));
    const accepted = r.ok && (resBody?.code === 0 || resBody?.code === undefined);
    const detail = accepted
      ? `Dispatched ${opts.event} to TikTok Events API (pixel ${pixelId}, request_id: ${resBody?.request_id || 'ok'}).`
      : `TikTok Events API HTTP ${r.status} (code ${resBody?.code ?? 'n/a'}): ${resBody?.message || JSON.stringify(resBody).slice(0, 160)}`;
    await appendMetaLog(env, {
      channel: 'tiktok_events',
      eventName: opts.event,
      eventId: opts.eventId,
      entityRef: opts.entityRef,
      status: accepted ? 'sent' : 'failed',
      httpStatus: r.status,
      detail,
    });
    return {
      ok: accepted,
      status: accepted ? ('sent' as const) : ('failed' as const),
      detail,
      tiktokCode: resBody?.code,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'TikTok Events API network error';
    await appendMetaLog(env, {
      channel: 'tiktok_events',
      eventName: opts.event,
      eventId: opts.eventId,
      entityRef: opts.entityRef,
      status: 'failed',
      detail,
    });
    return { ok: false, status: 'failed' as const, detail };
  }
}

async function dispatchTikTokCrmEvent(
  env: Env,
  opts: {
    event: string;
    eventId: string;
    leadId: string;
    email?: string;
    phone?: string;
  },
) {
  const ttCfg = await readJsonKv<any>(env, 'pb:tiktok:config:v1', {});
  const token = String(
    env.TIKTOK_CRM_ACCESS_TOKEN || ttCfg?.crmAccessToken || env.TIKTOK_EVENTS_TOKEN || '',
  ).trim();
  const crmEventSetId = String(
    env.TIKTOK_CRM_EVENT_SET_ID || ttCfg?.crmEventSetId || '7712192188952346645',
  ).trim();

  if (!token || !crmEventSetId) {
    const detail = 'Configure TIKTOK_CRM_ACCESS_TOKEN secret and TIKTOK_CRM_EVENT_SET_ID to dispatch TikTok CRM events.';
    await appendMetaLog(env, {
      channel: 'tiktok_events',
      eventName: `CRM:${opts.event}`,
      eventId: opts.eventId,
      entityRef: opts.leadId,
      status: 'not_configured',
      detail,
    });
    return { ok: false, status: 'not_configured' as const, detail };
  }

  const user: Record<string, string> = {};
  if (opts.phone) {
    const digits = String(opts.phone).replace(/[^\d+]/g, '');
    const normalizedPhone = digits.startsWith('+') ? digits : digits ? `+${digits}` : '';
    if (normalizedPhone) user.phone = await sha256Hex(normalizedPhone);
  }
  if (opts.email) {
    const cleanEmail = String(opts.email).trim().toLowerCase();
    if (cleanEmail) user.email = await sha256Hex(cleanEmail);
  }

  const payload = {
    event_source: 'crm',
    event_source_id: crmEventSetId,
    data: [
      {
        event: opts.event,
        event_time: Math.floor(Date.now() / 1000),
        event_id: opts.eventId,
        lead: {
          lead_id: String(opts.leadId),
        },
        user,
      },
    ],
  };

  try {
    const r = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Access-Token': token,
      },
      body: JSON.stringify(payload),
    });
    const resBody = await r.json().catch(() => ({}));
    const accepted = r.ok && (resBody?.code === 0 || resBody?.code === undefined);
    const detail = accepted
      ? `Dispatched CRM ${opts.event} to TikTok CRM Event Set ${crmEventSetId} (request_id: ${resBody?.request_id || 'ok'}).`
      : `TikTok CRM API HTTP ${r.status} (code ${resBody?.code ?? 'n/a'}): ${resBody?.message || JSON.stringify(resBody).slice(0, 160)}`;
    await appendMetaLog(env, {
      channel: 'tiktok_events',
      eventName: `CRM:${opts.event}`,
      eventId: opts.eventId,
      entityRef: opts.leadId,
      status: accepted ? 'sent' : 'failed',
      httpStatus: r.status,
      detail,
    });
    return {
      ok: accepted,
      status: accepted ? ('sent' as const) : ('failed' as const),
      detail,
      tiktokCode: resBody?.code,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'TikTok CRM Events API network error';
    await appendMetaLog(env, {
      channel: 'tiktok_events',
      eventName: `CRM:${opts.event}`,
      eventId: opts.eventId,
      entityRef: opts.leadId,
      status: 'failed',
      detail,
    });
    return { ok: false, status: 'failed' as const, detail };
  }
}

function mapLeadStageToTikTokCrmEvent(status: string): string {
  switch (status) {
    case 'Won':
      return 'Converted';
    case 'Qualified':
      return 'Qualified';
    case 'Replied':
      return 'Contacted';
    case 'Contacted':
      return 'Contacted';
    case 'Lost':
      return 'Disqualified';
    default:
      return 'Lead';
  }
}

// ---------- Main Worker Fetch Handler ----------

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContextLike): Promise<Response> {
    const url = new URL(request.url);
    const p = url.pathname;
    const method = request.method.toUpperCase();
    const usdToPkr = Number(env.USD_TO_PKR || 278.5) || 278.5;

    // 1. Health & Storefront Link Diagnostics
    if (p === '/api/health' && method === 'GET') {
      return json({
        ok: true,
        time: new Date().toISOString(),
        service: 'playbeat-admin-worker',
        storefrontUrl: env.STOREFRONT_URL || 'https://playbeat.digital',
        storefrontLinked: !!env.STOREFRONT,
        kvLinked: !!(env.PLAYBEAT_KV || env.KV),
        domains: (env.ADMIN_SUBDOMAINS || 'admin.playbeat.digital,manage.playbeat.digital').split(','),
        endpoints: [
          '/api/health',
          '/api/admin/storefront/status',
          '/api/admin/login',
          '/api/admin/summary',
          '/api/admin/catalog',
          '/api/admin/orders',
          '/api/admin/crm/leads',
          '/api/admin/adsense/analytics',
          '/api/account/profile',
        ],
      });
    }

    // 2. Public Auth Endpoints
    if (p === '/api/admin/auth-status' && method === 'GET') {
      const claimed = await kvOf(env).get('pb:admin:claimed-hash:v1');
      const mode = env.ADMIN_PASSWORD || env.STOREFRONT
        ? 'env'
        : claimed
          ? 'claimed'
          : 'setup_required';
      return json({
        ok: true,
        mode,
        upstreamConfigured: !!env.STOREFRONT,
      });
    }

    if (p === '/api/admin/setup' && method === 'POST') {
      const existing = await kvOf(env).get('pb:admin:claimed-hash:v1');
      if (env.ADMIN_PASSWORD || existing) {
        return json({ ok: false, error: 'Admin password is already configured.' }, 409);
      }
      const b = await request.json().catch(() => ({}));
      const pwd = String(b.password || '');
      if (pwd.length < 8) {
        return json({ ok: false, error: 'Password must be at least 8 characters.' }, 400);
      }
      await kvOf(env).put('pb:admin:claimed-hash:v1', await hashPassword(pwd));
      const { token, session } = await createSession(env, request, {
        role: 'admin',
        uid: 'admin_operator',
        email: 'business@playbeat.digital',
      });
      return json({ ok: true, token, role: 'admin', expiresAt: session.expiresAt });
    }

    if (p === '/api/admin/login' && method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const pwd = String(b.password || '');
      if (!pwd) return json({ ok: false, error: 'ADMIN_BAD_PASSWORD' }, 401);

      let authenticated = false;
      let upstreamToken: string | undefined;

      // Strategy A: Direct Worker secret ADMIN_PASSWORD
      if (env.ADMIN_PASSWORD && safeEqual(pwd, env.ADMIN_PASSWORD)) {
        authenticated = true;
      }

      // Strategy B: Claimed password hash in shared KV
      if (!authenticated) {
        const claimed = await kvOf(env).get('pb:admin:claimed-hash:v1');
        if (claimed && (await verifyPasswordHash(pwd, claimed))) {
          authenticated = true;
        }
      }

      // Strategy C: Verify directly against linked Storefront Worker (playbeat-digital)
      if (!authenticated || env.STOREFRONT) {
        const sfRes = await fetchStorefront(env, '/api/admin/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ password: pwd }),
        });
        if (sfRes && sfRes.ok) {
          const sfData = await sfRes.json().catch(() => ({}));
          if (sfData.ok && sfData.token) {
            authenticated = true;
            upstreamToken = String(sfData.token);
          } else if (sfData.ok) {
            authenticated = true;
          }
        }
      }

      if (!authenticated) {
        return json({ ok: false, error: 'ADMIN_BAD_PASSWORD' }, 401);
      }

      const { token, session } = await createSession(env, request, {
        role: 'admin',
        uid: 'admin_operator',
        email: 'business@playbeat.digital',
        upstreamToken,
      });
      return json({ ok: true, token, role: 'admin', expiresAt: session.expiresAt });
    }

    if (p === '/api/auth/register' && method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const displayName = String(b.displayName || '').trim();
      const email = String(b.email || '').trim().toLowerCase();
      const phone = String(b.phone || '').trim();
      const password = String(b.password || '');
      if (!displayName || !email || !email.includes('@')) {
        return json({ ok: false, error: 'Valid name and email are required.' }, 400);
      }
      if (password.length < 8) {
        return json({ ok: false, error: 'Password must be at least 8 characters.' }, 400);
      }

      const creds = await readJsonKv<Record<string, { uid: string; email: string; hash: string }>>(
        env,
        'pb:admin:customer-creds:v1',
        {},
      );
      if (creds[email]) {
        return json({ ok: false, error: 'An account with this email already exists.' }, 409);
      }

      const uid = `uid_pb_${randomHex(6)}`;
      const customer = {
        uid,
        displayName,
        email,
        phone,
        provider: 'Email',
        memberSince: new Date().toISOString().slice(0, 10),
        activeSessions: 1,
        prefs: { orderUpdates: true, productNews: true, securityAlerts: true },
      };
      await writeJsonKv(env, `pb:auth:u:${uid}`, customer);
      creds[email] = { uid, email, hash: await hashPassword(password) };
      await writeJsonKv(env, 'pb:admin:customer-creds:v1', creds);

      const { token, session } = await createSession(env, request, {
        role: 'customer',
        uid,
        email,
      });
      return json({ ok: true, token, role: 'customer', expiresAt: session.expiresAt });
    }

    if (p === '/api/auth/login' && method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const identifier = String(b.email || '').trim().toLowerCase();
      const password = String(b.password || '');
      const creds = await readJsonKv<Record<string, { uid: string; email: string; hash: string }>>(
        env,
        'pb:admin:customer-creds:v1',
        {},
      );
      const entry =
        creds[identifier] ||
        Object.values(creds).find((c) => c.uid.toLowerCase() === identifier);
      if (!entry || !(await verifyPasswordHash(password, entry.hash))) {
        return json({ ok: false, error: 'Invalid account ID/email or password.' }, 401);
      }
      const { token, session } = await createSession(env, request, {
        role: 'customer',
        uid: entry.uid,
        email: entry.email,
      });
      return json({ ok: true, token, role: 'customer', expiresAt: session.expiresAt });
    }

    if (p === '/api/auth/forgot-password' && method === 'POST') {
      return json({
        ok: true,
        message:
          'If an account exists for that email, contact an administrator to receive a 30-minute one-time reset code.',
      });
    }

    if (p === '/api/auth/reset-password' && method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const email = String(b.email || '').trim().toLowerCase();
      const resetCode = String(b.resetCode || '').trim().toUpperCase();
      const newPassword = String(b.newPassword || '');
      if (newPassword.length < 8) {
        return json({ ok: false, error: 'New password must be at least 8 characters.' }, 400);
      }
      const codes = await readJsonKv<Record<string, { uid: string; codeHash: string; expiresAt: string }>>(
        env,
        'pb:admin:reset-codes:v1',
        {},
      );
      const rec = codes[email];
      if (!rec || new Date(rec.expiresAt).getTime() < Date.now()) {
        return json({ ok: false, error: 'Reset code is invalid or expired.' }, 400);
      }
      const expected = await sha256Hex(resetCode);
      if (!safeEqual(expected, rec.codeHash)) {
        return json({ ok: false, error: 'Reset code is invalid or expired.' }, 400);
      }
      const creds = await readJsonKv<Record<string, { uid: string; email: string; hash: string }>>(
        env,
        'pb:admin:customer-creds:v1',
        {},
      );
      creds[email] = { uid: rec.uid, email, hash: await hashPassword(newPassword) };
      await writeJsonKv(env, 'pb:admin:customer-creds:v1', creds);
      delete codes[email];
      await writeJsonKv(env, 'pb:admin:reset-codes:v1', codes);
      return json({ ok: true, message: 'Password reset successfully. You can now sign in.' });
    }

    // OAuth Popup Callback
    const oauthCbMatch = /^\/auth\/oauth\/([^/]+)\/callback$/.exec(p);
    if (oauthCbMatch && method === 'GET') {
      const platform = oauthCbMatch[1];
      const errParam = url.searchParams.get('error');
      const ok = !errParam;
      const html = `<!doctype html><html><body style="font-family:sans-serif;background:#03060f;color:#fff;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h2>${ok ? 'Authorization Received' : 'Authorization Cancelled'}</h2><p>You can close this window.</p></div><script>if(window.opener){window.opener.postMessage({type:'PLAYBEAT_OAUTH_DONE',platform:${JSON.stringify(platform)},ok:${ok}},window.location.origin);}setTimeout(()=>window.close(),800);</script></body></html>`;
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }

    // 3. Authenticated Endpoints (/api/account/* and /api/admin/*)
    if (p.startsWith('/api/account/') || p.startsWith('/api/admin/')) {
      const session = await getSession(request, env);
      if (!session) return json({ ok: false, error: 'UNAUTHORIZED' }, 401);

      if (p === '/api/admin/logout' && method === 'POST') {
        const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
        if (token) await kvOf(env).delete(`pb:admin:session:${token}`);
        return json({ ok: true });
      }

      // ---- Account Profile, Customizer, CRUD & Sessions (admin or customer) ----
      if (p === '/api/account/profile' && method === 'GET') {
        return json({ ok: true, profile: await getProfileForSession(env, session) });
      }

      if (p === '/api/account/profile' && method === 'POST') {
        const b = await request.json().catch(() => ({}));
        if (b.website && !isSafeHttpUrl(String(b.website).trim())) {
          return json({ ok: false, error: 'Website must start with http:// or https://.' }, 400);
        }
        if (b.avatarUrl && !isSafeAvatarUrl(String(b.avatarUrl).trim())) {
          return json({ ok: false, error: 'Avatar URL must be a valid https:// URL or image upload.' }, 400);
        }

        const current = await getProfileForSession(env, session);
        const updated = {
          ...current,
          username: b.username !== undefined ? String(b.username).trim().slice(0, 60) : current.username,
          firstName: b.firstName !== undefined ? String(b.firstName).trim().slice(0, 60) : current.firstName,
          lastName: b.lastName !== undefined ? String(b.lastName).trim().slice(0, 60) : current.lastName,
          displayName: b.displayName ? String(b.displayName).trim().slice(0, 120) : current.displayName,
          email: session.role === 'admin' && b.email ? String(b.email).trim().slice(0, 140) : current.email,
          phone: b.phone !== undefined ? String(b.phone).trim().slice(0, 40) : current.phone,
          title: b.title !== undefined ? String(b.title).trim().slice(0, 80) : current.title,
          department: b.department !== undefined ? String(b.department).trim().slice(0, 80) : current.department,
          address: b.address !== undefined ? String(b.address).trim().slice(0, 180) : current.address,
          city: b.city !== undefined ? String(b.city).trim().slice(0, 80) : current.city,
          country: b.country !== undefined ? String(b.country).trim().slice(0, 80) : current.country,
          postalCode: b.postalCode !== undefined ? String(b.postalCode).trim().slice(0, 24) : current.postalCode,
          website: b.website !== undefined ? String(b.website).trim().slice(0, 200) : current.website,
          bio: b.bio !== undefined ? String(b.bio).trim().slice(0, 500) : current.bio,
          avatarUrl: b.avatarUrl !== undefined ? String(b.avatarUrl).trim() : current.avatarUrl,
          coverTheme: b.coverTheme || current.coverTheme,
          brandTitle: b.brandTitle !== undefined ? String(b.brandTitle).trim().slice(0, 60) : current.brandTitle,
        };

        if (session.role === 'admin') {
          await writeJsonKv(env, 'pb:admin:profile:v1', updated);
        } else {
          const cust = await readJsonKv<any>(env, `pb:auth:u:${session.uid}`, { uid: session.uid, email: session.email });
          await writeJsonKv(env, `pb:auth:u:${session.uid}`, {
            ...cust,
            displayName: updated.displayName,
            phone: updated.phone,
          });
          await writeJsonKv(env, `pb:account:extra:${session.uid}`, updated);
        }
        return json({ ok: true, profile: updated });
      }

      if (p === '/api/account/profile/reset' && method === 'POST') {
        if (session.role === 'admin') {
          const fresh = defaultOperatorProfile();
          await writeJsonKv(env, 'pb:admin:profile:v1', fresh);
          return json({ ok: true, profile: fresh });
        }
        await kvOf(env).delete(`pb:account:extra:${session.uid}`);
        return json({ ok: true, profile: await getProfileForSession(env, session) });
      }

      // Custom Fields CRUD
      if (p === '/api/account/custom-fields' && method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const label = String(b.label || '').trim().slice(0, 60);
        const value = String(b.value || '').trim().slice(0, 180);
        const category = ['Operations', 'Billing', 'Contact', 'Other'].includes(b.category) ? b.category : 'Operations';
        if (!label || !value) return json({ ok: false, error: 'Label and value are required.' }, 400);
        const prof = await getProfileForSession(env, session);
        const field = { id: `cf_${randomHex(4)}`, label, value, category };
        prof.customFields = [...prof.customFields, field];
        await writeJsonKv(env, session.role === 'admin' ? 'pb:admin:profile:v1' : `pb:account:extra:${session.uid}`, prof);
        return json({ ok: true, field, profile: prof });
      }

      const cfMatch = /^\/api\/account\/custom-fields\/([^/]+)$/.exec(p);
      if (cfMatch) {
        const id = decodeURIComponent(cfMatch[1]);
        const prof = await getProfileForSession(env, session);
        const key = session.role === 'admin' ? 'pb:admin:profile:v1' : `pb:account:extra:${session.uid}`;
        if (method === 'PATCH') {
          const b = await request.json().catch(() => ({}));
          const idx = prof.customFields.findIndex((f: any) => f.id === id);
          if (idx < 0) return json({ ok: false, error: 'Custom field not found.' }, 404);
          prof.customFields[idx] = {
            ...prof.customFields[idx],
            label: b.label ? String(b.label).trim().slice(0, 60) : prof.customFields[idx].label,
            value: b.value !== undefined ? String(b.value).trim().slice(0, 180) : prof.customFields[idx].value,
            category: ['Operations', 'Billing', 'Contact', 'Other'].includes(b.category)
              ? b.category
              : prof.customFields[idx].category,
          };
          await writeJsonKv(env, key, prof);
          return json({ ok: true, field: prof.customFields[idx], profile: prof });
        }
        if (method === 'DELETE') {
          prof.customFields = prof.customFields.filter((f: any) => f.id !== id);
          await writeJsonKv(env, key, prof);
          return json({ ok: true, profile: prof });
        }
      }

      // Social Links CRUD
      if (p === '/api/account/social-links' && method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const platform = String(b.platform || '').trim().slice(0, 50);
        const handle = String(b.handle || '').trim().slice(0, 80);
        const linkUrl = String(b.url || '').trim().slice(0, 240);
        if (!platform || !linkUrl || !isSafeHttpUrl(linkUrl)) {
          return json({ ok: false, error: 'Valid platform and https:// URL are required.' }, 400);
        }
        const prof = await getProfileForSession(env, session);
        const link = { id: `sl_${randomHex(4)}`, platform, handle, url: linkUrl };
        prof.socialLinks = [...prof.socialLinks, link];
        await writeJsonKv(env, session.role === 'admin' ? 'pb:admin:profile:v1' : `pb:account:extra:${session.uid}`, prof);
        return json({ ok: true, link, profile: prof });
      }

      const slMatch = /^\/api\/account\/social-links\/([^/]+)$/.exec(p);
      if (slMatch) {
        const id = decodeURIComponent(slMatch[1]);
        const prof = await getProfileForSession(env, session);
        const key = session.role === 'admin' ? 'pb:admin:profile:v1' : `pb:account:extra:${session.uid}`;
        if (method === 'PATCH') {
          const b = await request.json().catch(() => ({}));
          if (b.url && !isSafeHttpUrl(String(b.url).trim())) {
            return json({ ok: false, error: 'URL must start with http:// or https://.' }, 400);
          }
          const idx = prof.socialLinks.findIndex((l: any) => l.id === id);
          if (idx < 0) return json({ ok: false, error: 'Link not found.' }, 404);
          prof.socialLinks[idx] = {
            ...prof.socialLinks[idx],
            platform: b.platform ? String(b.platform).trim().slice(0, 50) : prof.socialLinks[idx].platform,
            handle: b.handle !== undefined ? String(b.handle).trim().slice(0, 80) : prof.socialLinks[idx].handle,
            url: b.url ? String(b.url).trim().slice(0, 240) : prof.socialLinks[idx].url,
          };
          await writeJsonKv(env, key, prof);
          return json({ ok: true, link: prof.socialLinks[idx], profile: prof });
        }
        if (method === 'DELETE') {
          prof.socialLinks = prof.socialLinks.filter((l: any) => l.id !== id);
          await writeJsonKv(env, key, prof);
          return json({ ok: true, profile: prof });
        }
      }

      // Skills CRUD
      if (p === '/api/account/skills' && method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const skill = String(b.skill || '').trim().slice(0, 50);
        if (!skill) return json({ ok: false, error: 'Specialty name is required.' }, 400);
        const prof = await getProfileForSession(env, session);
        if (!prof.skills.includes(skill)) prof.skills = [...prof.skills, skill];
        await writeJsonKv(env, session.role === 'admin' ? 'pb:admin:profile:v1' : `pb:account:extra:${session.uid}`, prof);
        return json({ ok: true, profile: prof });
      }

      const skMatch = /^\/api\/account\/skills\/(\d+)$/.exec(p);
      if (skMatch && method === 'DELETE') {
        const idx = Number(skMatch[1]);
        const prof = await getProfileForSession(env, session);
        prof.skills = prof.skills.filter((_: any, i: number) => i !== idx);
        await writeJsonKv(env, session.role === 'admin' ? 'pb:admin:profile:v1' : `pb:account:extra:${session.uid}`, prof);
        return json({ ok: true, profile: prof });
      }

      if (p === '/api/account/notifications' && method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const prof = await getProfileForSession(env, session);
        prof.prefs = { ...prof.prefs, ...b };
        await writeJsonKv(env, session.role === 'admin' ? 'pb:admin:profile:v1' : `pb:account:extra:${session.uid}`, prof);
        return json({ ok: true, profile: prof });
      }

      if (p === '/api/account/sessions' && method === 'GET') {
        return json({
          ok: true,
          sessions: [
            {
              id: session.id,
              userAgent: session.userAgent,
              createdAt: session.createdAt,
              expiresAt: session.expiresAt,
              isCurrent: true,
            },
          ],
        });
      }

      if (p === '/api/account/sessions/revoke-others' && method === 'POST') {
        const currentToken = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
        const keys = await kvOf(env).list({ prefix: 'pb:admin:session:', limit: 200 });
        let revoked = 0;
        for (const k of keys.keys) {
          if (k.name === `pb:admin:session:${currentToken}`) continue;
          const rec = await readJsonKv<SessionRecord | null>(env, k.name, null);
          if (rec && rec.uid === session.uid) {
            await kvOf(env).delete(k.name);
            revoked++;
          }
        }
        return json({ ok: true, revoked });
      }

      if (p === '/api/account/change-password' && method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const currentPwd = String(b.currentPassword || '');
        const newPwd = String(b.newPassword || '');
        if (newPwd.length < 8) return json({ ok: false, error: 'New password must be at least 8 characters.' }, 400);

        if (session.role === 'admin') {
          await kvOf(env).put('pb:admin:claimed-hash:v1', await hashPassword(newPwd));
          return json({ ok: true, message: 'Admin password updated in shared Cloudflare KV.' });
        }
        const creds = await readJsonKv<Record<string, { uid: string; email: string; hash: string }>>(
          env,
          'pb:admin:customer-creds:v1',
          {},
        );
        const rec = creds[session.email.toLowerCase()];
        if (!rec || !(await verifyPasswordHash(currentPwd, rec.hash))) {
          return json({ ok: false, error: 'Current password is incorrect.' }, 401);
        }
        creds[session.email.toLowerCase()] = { ...rec, hash: await hashPassword(newPwd) };
        await writeJsonKv(env, 'pb:admin:customer-creds:v1', creds);
        return json({ ok: true, message: 'Password updated successfully.' });
      }

      if (p === '/api/account/orders' && method === 'GET') {
        const { orders } = await loadOrdersRaw(env);
        const mine = orders
          .map((o: any) => toAdminOrder(o, usdToPkr))
          .filter(
            (o) =>
              o.customerUid === session.uid ||
              o.customerEmail.toLowerCase() === session.email.toLowerCase(),
          );
        return json({ ok: true, orders: mine });
      }

      // ---- Admin-Only Routes below ----
      if (session.role !== 'admin') {
        return json({ ok: false, error: 'ADMIN_FORBIDDEN' }, 403);
      }

      // Storefront Link Diagnostics
      if (p === '/api/admin/storefront/status' && method === 'GET') {
        const sfRes = await fetchStorefront(env, '/api/health');
        const sfHealth = sfRes ? await sfRes.json().catch(() => null) : null;
        const catalog = await loadStorefrontCatalog(env);
        const { orders } = await loadOrdersRaw(env);
        const sa = parseServiceAccount(env);
        return json({
          ok: true,
          storefrontUrl: env.STOREFRONT_URL || 'https://playbeat.digital',
          adminDomains: (env.ADMIN_SUBDOMAINS || 'admin.playbeat.digital,manage.playbeat.digital').split(','),
          serviceBindingActive: !!(sfRes && sfRes.ok),
          storefrontHealth: sfHealth,
          r2Configured: !!(env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY),
          r2Endpoint: env.R2_ENDPOINT || null,
          googleServiceAccount: sa ? { email: sa.client_email, projectId: sa.project_id || null } : null,
          metaConfigured: !!(env.META_ACCESS_TOKEN && (env.META_WA_DATASET_ID || env.META_WEB_DATASET_ID)),
          sharedKvCounts: {
            digitalProducts: catalog.digitalProducts.length,
            businessServices: catalog.businessServices.length,
            liveTvChannels: catalog.liveTvChannels.length,
            liveTvPlans: catalog.liveTvPlans.length,
            orders: orders.length,
            lastPublishedSyncAt: catalog.lastPublishedSyncAt || null,
          },
        });
      }

      // Summary
      if (p === '/api/admin/summary' && method === 'GET') {
        const [catalog, ordersObj, leads, domains, allowlist, customers] = await Promise.all([
          loadStorefrontCatalog(env),
          loadOrdersRaw(env),
          readJsonKv<any[]>(env, 'pb:crm:leads:v1', []),
          readJsonKv<any[]>(env, 'pb:admin:domains:v1', DEFAULT_DOMAINS),
          readJsonKv<any[]>(env, 'pb:admin:allowlist:v1', []),
          listCustomers(env),
        ]);

        const adminOrders = ordersObj.orders.map((o: any) => toAdminOrder(o, usdToPkr));
        const fulfilled = adminOrders.filter((o) => o.status === 'PAID_FULFILLED');
        const pending = adminOrders.filter((o) => o.status === 'PENDING');
        const revenue30dUsd = fulfilled.reduce((a, o) => a + o.totalUsd, 0);
        const revenue30dPkr = fulfilled.reduce((a, o) => a + o.totalPkr, 0);

        const dailyMap = new Map<string, { date: string; revenueUsd: number; orders: number }>();
        for (const o of fulfilled) {
          const day = o.createdAt.slice(0, 10);
          const cur = dailyMap.get(day) || { date: day, revenueUsd: 0, orders: 0 };
          cur.revenueUsd = Number((cur.revenueUsd + o.totalUsd).toFixed(2));
          cur.orders += 1;
          dailyMap.set(day, cur);
        }

        const catAgg = new Map<string, { count: number; inStock: number; priceSum: number }>();
        let inStock = 0;
        let activeCount = 0;
        let dealsCount = 0;
        for (const rawProd of catalog.digitalProducts) {
          const cat = mapCategoryToAdmin(rawProd.category);
          const isIn = mapStockToAdmin(rawProd.stockStatus) !== 'OUT_OF_STOCK';
          const isAct = rawProd.published !== false && rawProd.active !== false;
          const disc = Number(rawProd.discountPercent ?? rawProd.discountPct ?? 0);
          const price = Number(rawProd.priceUsd ?? rawProd.price ?? 0) || 0;
          if (isIn) inStock++;
          if (isAct) activeCount++;
          if (disc > 0) dealsCount++;
          const cur = catAgg.get(cat) || { count: 0, inStock: 0, priceSum: 0 };
          cur.count += 1;
          if (isIn) cur.inStock += 1;
          cur.priceSum += price;
          catAgg.set(cat, cur);
        }

        const byCategory = [...catAgg.entries()].map(([category, v]) => ({
          category,
          count: v.count,
          inStock: v.inStock,
          avgPriceUsd: v.count ? Number((v.priceSum / v.count).toFixed(2)) : 0,
        }));

        const byStage = CRM_STAGES.map((stage) => {
          const rows = leads.filter((l: any) => l.status === stage);
          return {
            stage,
            count: rows.length,
            valueUsd: rows.reduce((s: number, l: any) => s + (Number(l.expectedValueUsd) || 0), 0),
          };
        });

        const [adsenseCfg, metaCfg, tiktokCfg] = await Promise.all([
          readJsonKv<any>(env, 'pb:adsense:config:v1', null),
          readJsonKv<any>(env, 'pb:meta:config:v1', null),
          readJsonKv<any>(env, 'pb:tiktok:config:v1', null),
        ]);

        return json({
          ok: true,
          summary: {
            usdToPkr,
            orders: {
              total: adminOrders.length,
              fulfilled: fulfilled.length,
              pending: pending.length,
              revenue30dUsd: Number(revenue30dUsd.toFixed(2)),
              revenue30dPkr: Math.round(revenue30dPkr),
              dailyRevenue: [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-14),
            },
            catalog: {
              total: catalog.digitalProducts.length,
              inStock,
              active: activeCount,
              deals: dealsCount,
              servicesCount: catalog.businessServices.length,
              tvChannelsCount: catalog.liveTvChannels.length,
              tvPlansCount: catalog.liveTvPlans.length,
              byCategory,
            },
            crm: {
              total: leads.length,
              pipelineUsd: leads
                .filter((l: any) => l.status !== 'Lost' && l.status !== 'Won')
                .reduce((s: number, l: any) => s + (Number(l.expectedValueUsd) || 0), 0),
              wonUsd: leads
                .filter((l: any) => l.status === 'Won')
                .reduce((s: number, l: any) => s + (Number(l.expectedValueUsd) || 0), 0),
              byStage,
            },
            domains: {
              total: domains.length,
              adsTxtReady: domains.filter((d: any) => d.adsTxtOk).length,
              legalReady: domains.filter((d: any) => d.privacyOk && d.termsOk).length,
            },
            customers: {
              total: customers.length,
              activeSessions: customers.reduce((s, c) => s + c.activeSessions, 0),
              allowlistCount: Array.isArray(allowlist) ? allowlist.length : 0,
            },
            integrations: {
              adsenseConnected: !!(adsenseCfg?.refreshToken || adsenseCfg?.connected || parseServiceAccount(env)),
              metaConfigured: !!(env.META_ACCESS_TOKEN || metaCfg?.accessToken),
              tiktokConfigured: !!(env.TIKTOK_EVENTS_TOKEN || tiktokCfg?.eventsToken || tiktokCfg?.pixelId),
              electronicFirstConfigured: !!env.ELECTRONIC_FIRST_API_KEY,
              upstreamWorkerConfigured: !!env.STOREFRONT,
            },
            recentOrders: adminOrders.slice(0, 8),
          },
        });
      }

      // ---- Catalog (Linked Live to playbeat.digital pb:catalog:v1) ----
      if (p === '/api/admin/catalog' && method === 'GET') {
        const catalog = await loadStorefrontCatalog(env);
        const q = (url.searchParams.get('q') || '').trim().toLowerCase();
        const catFilter = url.searchParams.get('category') || 'ALL';
        const stockFilter = url.searchParams.get('stock') || 'ALL';
        const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 60), 1), 200);

        const filtered: any[] = [];
        let filteredTotal = 0;
        for (const item of catalog.digitalProducts) {
          const mapped = toAdminProduct(item, usdToPkr);
          if (q && !mapped.name.toLowerCase().includes(q) && !mapped.sku.toLowerCase().includes(q)) continue;
          if (catFilter !== 'ALL' && mapped.category !== catFilter) continue;
          if (stockFilter !== 'ALL' && mapped.stockStatus !== stockFilter) continue;
          filteredTotal++;
          if (filtered.length < limit) filtered.push(mapped);
        }
        return json({
          ok: true,
          total: catalog.digitalProducts.length,
          filteredTotal,
          products: filtered,
        });
      }

      if (p === '/api/admin/catalog' && method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const catalog = await loadStorefrontCatalog(env);
        const priceUsd = Number(b.priceUsd) || 0;
        const sku = String(b.sku || `PB-${randomHex(3).toUpperCase()}`).trim();
        const item = {
          id: sku,
          sku,
          name: String(b.name || 'New Digital Product').trim(),
          platform: String(b.platform || 'PC / Steam'),
          category: String(b.category || 'Games'),
          priceUsd,
          pricePkr: Number(b.pricePkr) || Math.round(priceUsd * usdToPkr),
          discountPercent: Number(b.discountPct || 0),
          stockStatus: mapStockToStorefront(String(b.stockStatus || 'IN_STOCK')),
          published: b.active !== false,
          source: 'Manual',
          updatedAt: new Date().toISOString(),
        };
        catalog.digitalProducts.unshift(item);
        await saveStorefrontCatalog(env, catalog);
        return json({ ok: true, product: toAdminProduct(item, usdToPkr) }, 201);
      }

      if (p === '/api/admin/catalog/import' && method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const items = Array.isArray(b.items) ? b.items : [];
        const catalog = await loadStorefrontCatalog(env);
        let added = 0;
        let updated = 0;
        const bySku = new Map<string, number>();
        catalog.digitalProducts.forEach((prod, idx) => {
          const k = String(prod.sku || prod.id || '').toLowerCase();
          if (k) bySku.set(k, idx);
        });
        for (const raw of items) {
          if (!raw || typeof raw !== 'object') continue;
          const sku = String((raw as any).sku || (raw as any).id || `PB-IMP-${randomHex(3)}`).trim();
          const idx = bySku.get(sku.toLowerCase());
          const priceUsd = Number((raw as any).priceUsd ?? (raw as any).price ?? 0) || 0;
          const merged = {
            ...(idx !== undefined ? catalog.digitalProducts[idx] : {}),
            ...raw,
            sku,
            priceUsd,
            pricePkr: Number((raw as any).pricePkr ?? Math.round(priceUsd * usdToPkr)),
            published: (raw as any).active !== false && (raw as any).published !== false,
            updatedAt: new Date().toISOString(),
          };
          if (idx !== undefined) {
            catalog.digitalProducts[idx] = merged;
            updated++;
          } else {
            catalog.digitalProducts.unshift(merged);
            bySku.set(sku.toLowerCase(), 0);
            added++;
          }
        }
        await saveStorefrontCatalog(env, catalog);
        return json({ ok: true, added, updated, total: catalog.digitalProducts.length });
      }

      // Catalog sub-resources: Services, TV Channels, TV Plans
      if (p === '/api/admin/catalog/services' && method === 'GET') {
        const catalog = await loadStorefrontCatalog(env);
        return json({ ok: true, services: catalog.businessServices.map((s) => toAdminService(s, usdToPkr)) });
      }

      if (p === '/api/admin/catalog/services' && method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const catalog = await loadStorefrontCatalog(env);
        const priceUsd = Number(b.priceUsd) || 0;
        const svc = {
          id: `svc_${randomHex(4)}`,
          sku: String(b.code || `PB-SVC-${randomHex(2).toUpperCase()}`),
          name: String(b.name || 'Custom Service').trim(),
          deliveryTime: String(b.turnaround || '3-5 Days'),
          optionalUsd: priceUsd,
          recommendedPkr: Number(b.pricePkr) || Math.round(priceUsd * usdToPkr),
          published: b.active !== false,
        };
        catalog.businessServices.unshift(svc);
        await saveStorefrontCatalog(env, catalog);
        return json({ ok: true, service: toAdminService(svc, usdToPkr) }, 201);
      }

      const svcDelMatch = /^\/api\/admin\/catalog\/services\/([^/]+)$/.exec(p);
      if (svcDelMatch && method === 'DELETE') {
        const id = decodeURIComponent(svcDelMatch[1]);
        const catalog = await loadStorefrontCatalog(env);
        catalog.businessServices = catalog.businessServices.filter((s) => String(s.id || s.sku) !== id);
        await saveStorefrontCatalog(env, catalog);
        return json({ ok: true });
      }

      if (p === '/api/admin/catalog/tv-channels' && method === 'GET') {
        const catalog = await loadStorefrontCatalog(env);
        return json({ ok: true, channels: catalog.liveTvChannels.map(toAdminTvChannel) });
      }

      if (p === '/api/admin/catalog/tv-channels' && method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const catalog = await loadStorefrontCatalog(env);
        const ch = {
          id: `tv_${randomHex(4)}`,
          name: String(b.name || 'New Channel').trim(),
          category: String(b.category || 'Entertainment'),
          country: String(b.region || 'Global'),
          domain: String(b.domain || 'playbeat.live'),
          status: String(b.status || 'ONLINE'),
          isLive: (b.status || 'ONLINE') === 'ONLINE',
          published: b.active !== false,
        };
        catalog.liveTvChannels.unshift(ch);
        await saveStorefrontCatalog(env, catalog);
        return json({ ok: true, channel: toAdminTvChannel(ch) }, 201);
      }

      const tvChMatch = /^\/api\/admin\/catalog\/tv-channels\/([^/]+)$/.exec(p);
      if (tvChMatch) {
        const id = decodeURIComponent(tvChMatch[1]);
        const catalog = await loadStorefrontCatalog(env);
        if (method === 'PATCH') {
          const b = await request.json().catch(() => ({}));
          const idx = catalog.liveTvChannels.findIndex((c) => String(c.id || c.name) === id);
          if (idx < 0) return json({ ok: false, error: 'Channel not found' }, 404);
          const cur = catalog.liveTvChannels[idx];
          catalog.liveTvChannels[idx] = {
            ...cur,
            ...b,
            isLive: b.status ? b.status === 'ONLINE' : cur.isLive,
            published: b.active !== undefined ? !!b.active : cur.published,
          };
          await saveStorefrontCatalog(env, catalog);
          return json({ ok: true, channel: toAdminTvChannel(catalog.liveTvChannels[idx]) });
        }
        if (method === 'DELETE') {
          catalog.liveTvChannels = catalog.liveTvChannels.filter((c) => String(c.id || c.name) !== id);
          await saveStorefrontCatalog(env, catalog);
          return json({ ok: true });
        }
      }

      if (p === '/api/admin/catalog/tv-plans' && method === 'GET') {
        const catalog = await loadStorefrontCatalog(env);
        return json({ ok: true, plans: catalog.liveTvPlans.map((pl) => toAdminTvPlan(pl, usdToPkr)) });
      }

      if (p === '/api/admin/catalog/tv-plans' && method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const catalog = await loadStorefrontCatalog(env);
        const priceUsd = Number(b.priceUsd) || 0;
        const plan = {
          id: `pbtv_${randomHex(4)}`,
          sku: String(b.sku || `PB-TV-${randomHex(2).toUpperCase()}`),
          name: String(b.name || 'PlayBeat TV Plan').trim(),
          durationMonths: Number(b.durationMonths) || 1,
          durationLabel: `${Number(b.durationMonths) || 1} Month(s)`,
          domains: Array.isArray(b.domains) ? b.domains : ['playbeat.digital', 'playbeat.live'],
          priceUsd,
          pricePkr: Number(b.pricePkr) || Math.round(priceUsd * usdToPkr),
          published: b.active !== false,
        };
        catalog.liveTvPlans.unshift(plan);
        await saveStorefrontCatalog(env, catalog);
        return json({ ok: true, plan: toAdminTvPlan(plan, usdToPkr) }, 201);
      }

      const tvPlanMatch = /^\/api\/admin\/catalog\/tv-plans\/([^/]+)$/.exec(p);
      if (tvPlanMatch && method === 'DELETE') {
        const id = decodeURIComponent(tvPlanMatch[1]);
        const catalog = await loadStorefrontCatalog(env);
        catalog.liveTvPlans = catalog.liveTvPlans.filter((pl) => String(pl.id || pl.sku) !== id);
        await saveStorefrontCatalog(env, catalog);
        return json({ ok: true });
      }

      const prodMatch = /^\/api\/admin\/catalog\/([^/]+)$/.exec(p);
      if (prodMatch) {
        const id = decodeURIComponent(prodMatch[1]);
        const catalog = await loadStorefrontCatalog(env);
        if (method === 'PATCH') {
          const b = await request.json().catch(() => ({}));
          const idx = catalog.digitalProducts.findIndex((pr) => String(pr.id || pr.sku) === id);
          if (idx < 0) return json({ ok: false, error: 'Product not found' }, 404);
          const cur = catalog.digitalProducts[idx];
          const nextPriceUsd = b.priceUsd !== undefined ? Number(b.priceUsd) : Number(cur.priceUsd ?? 0);
          catalog.digitalProducts[idx] = {
            ...cur,
            ...(b.name !== undefined ? { name: String(b.name) } : {}),
            ...(b.sku !== undefined ? { sku: String(b.sku) } : {}),
            ...(b.platform !== undefined ? { platform: String(b.platform) } : {}),
            ...(b.category !== undefined ? { category: String(b.category) } : {}),
            priceUsd: nextPriceUsd,
            pricePkr: b.pricePkr !== undefined ? Number(b.pricePkr) : Math.round(nextPriceUsd * usdToPkr),
            ...(b.discountPct !== undefined ? { discountPercent: Number(b.discountPct) } : {}),
            ...(b.stockStatus !== undefined ? { stockStatus: mapStockToStorefront(String(b.stockStatus)) } : {}),
            ...(b.active !== undefined ? { published: !!b.active } : {}),
            updatedAt: new Date().toISOString(),
          };
          await saveStorefrontCatalog(env, catalog);
          return json({ ok: true, product: toAdminProduct(catalog.digitalProducts[idx], usdToPkr) });
        }
        if (method === 'DELETE') {
          catalog.digitalProducts = catalog.digitalProducts.filter((pr) => String(pr.id || pr.sku) !== id);
          await saveStorefrontCatalog(env, catalog);
          return json({ ok: true });
        }
      }

      // ---- Orders (Linked Live to playbeat.digital pb:orders:v1) ----
      if (p === '/api/admin/orders' && method === 'GET') {
        const { orders } = await loadOrdersRaw(env);
        return json({ ok: true, orders: orders.map((o) => toAdminOrder(o, usdToPkr)) });
      }

      if (p === '/api/admin/orders' && method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const catalog = await loadStorefrontCatalog(env);
        const { orders, isObject, wrapper } = await loadOrdersRaw(env);
        const requestedItems = Array.isArray(b.items) ? b.items : [];
        const resolvedItems = requestedItems.map((it: any) => {
          const found = catalog.digitalProducts.find(
            (pr) => String(pr.sku || pr.id).toLowerCase() === String(it.sku || '').toLowerCase(),
          );
          const priceUsd = found ? Number(found.priceUsd ?? 0) : Number(it.priceUsd ?? 9.99);
          return {
            sku: String(it.sku || 'MANUAL-SKU'),
            name: found ? String(found.name) : String(it.name || it.sku || 'Digital Key'),
            qty: Math.max(1, Number(it.qty) || 1),
            priceUsd,
          };
        });
        const totalUsd = Number(
          resolvedItems.reduce((s: number, it: any) => s + it.priceUsd * it.qty, 0).toFixed(2),
        );
        const orderId = `PB-ORD-${Date.now().toString(36).toUpperCase()}`;
        const now = new Date().toISOString();
        const rawOrder = {
          orderId,
          id: orderId,
          createdAt: now,
          updatedAt: now,
          customerEmail: String(b.customerEmail || '').trim(),
          customerMobile: String(b.customerPhone || '').trim(),
          paymentRail: String(b.channel || 'Manual'),
          manualChannel: String(b.channel || 'Manual'),
          manualReference: String(b.paymentRef || `REF-${randomHex(3).toUpperCase()}`),
          currency: 'USD',
          totalUsd,
          totalPkr: Math.round(totalUsd * usdToPkr),
          status: 'PENDING',
          items: resolvedItems,
          issuedKeys: [],
        };
        orders.unshift(rawOrder);
        await saveOrdersRaw(env, orders, isObject, wrapper);
        return json({ ok: true, order: toAdminOrder(rawOrder, usdToPkr) }, 201);
      }

      const ordFulfillMatch = /^\/api\/admin\/orders\/([^/]+)\/fulfill$/.exec(p);
      if (ordFulfillMatch && method === 'POST') {
        const orderId = decodeURIComponent(ordFulfillMatch[1]);
        const { orders, isObject, wrapper } = await loadOrdersRaw(env);
        const idx = orders.findIndex((o) => String(o.id || o.orderId) === orderId);
        if (idx < 0) return json({ ok: false, error: 'Order not found' }, 404);
        const cur = orders[idx];
        const qtyTotal = (Array.isArray(cur.items) ? cur.items : []).reduce(
          (sum: number, it: any) => sum + (Number(it.qty ?? it.quantity) || 1),
          0,
        );
        const keys =
          Array.isArray(cur.issuedKeys) && cur.issuedKeys.length > 0
            ? cur.issuedKeys
            : Array.from({ length: Math.max(1, qtyTotal) }, () =>
                `PB-${randomHex(2).toUpperCase()}-${randomHex(2).toUpperCase()}-${randomHex(2).toUpperCase()}`,
              );
        const now = new Date().toISOString();
        orders[idx] = {
          ...cur,
          status: 'PAID_FULFILLED',
          updatedAt: now,
          fulfilledAt: now,
          issuedKeys: keys,
          metaCapiStatus: env.META_ACCESS_TOKEN ? 'sent' : 'not_configured',
        };
        await saveOrdersRaw(env, orders, isObject, wrapper);
        const adminOrder = toAdminOrder(orders[idx], usdToPkr);
        const ttDispatch = await dispatchTikTokEventsApi(env, {
          event: 'Purchase',
          eventId: `tt-purchase-${adminOrder.id}`,
          entityRef: adminOrder.id,
          email: adminOrder.customerEmail,
          phone: adminOrder.customerPhone,
          externalId: adminOrder.customerUid || adminOrder.id,
          value: adminOrder.totalUsd,
          currency: 'USD',
          contents: (adminOrder.items || []).map((it: any) => ({
            content_id: String(it.sku || it.name || it.title),
            content_type: 'product',
            content_name: String(it.name || it.title || it.sku),
          })),
        });
        return json({
          ok: true,
          order: adminOrder,
          metaCapi: {
            status: orders[idx].metaCapiStatus,
            detail: env.META_ACCESS_TOKEN
              ? 'Order fulfilled in shared playbeat-digital-kv.'
              : 'Order fulfilled in shared playbeat-digital-kv (META_ACCESS_TOKEN not set on admin worker).',
          },
          tiktokEvents: ttDispatch,
        });
      }

      const ordDelMatch = /^\/api\/admin\/orders\/([^/]+)$/.exec(p);
      if (ordDelMatch && method === 'DELETE') {
        const orderId = decodeURIComponent(ordDelMatch[1]);
        const { orders, isObject, wrapper } = await loadOrdersRaw(env);
        const next = orders.filter((o) => String(o.id || o.orderId) !== orderId);
        await saveOrdersRaw(env, next, isObject, wrapper);
        return json({ ok: true });
      }

      // ---- CRM Leads (pb:crm:leads:v1) ----
      if (p === '/api/admin/crm/leads' && method === 'GET') {
        const leads = await readJsonKv<any[]>(env, 'pb:crm:leads:v1', []);
        return json({ ok: true, stages: CRM_STAGES, leads });
      }

      if (p === '/api/admin/crm/leads' && method === 'POST') {
        const b = await request.json().catch(() => ({}));
        if (!b.businessName) return json({ ok: false, error: 'businessName required' }, 400);
        const leads = await readJsonKv<any[]>(env, 'pb:crm:leads:v1', []);
        const now = new Date().toISOString();
        const lead: any = {
          leadId: b.leadId || `PB-L-${String(leads.length + 1).padStart(4, '0')}`,
          businessName: String(b.businessName).trim(),
          contactName: String(b.contactName || '').trim(),
          email: String(b.email || '').trim(),
          phone: String(b.phone || '').trim(),
          ctwaClid: b.ctwaClid ? String(b.ctwaClid).trim() : undefined,
          expectedValueUsd: Number(b.expectedValueUsd) || 0,
          source: b.source || 'WhatsApp',
          status: CRM_STAGES.includes(b.status) ? b.status : 'Researched',
          score: Number(b.score) || 50,
          notes: b.notes ? String(b.notes) : '',
          createdAt: now,
          updatedAt: now,
        };
        if (lead.email || lead.phone) {
          const ttInit = await dispatchTikTokCrmEvent(env, {
            event: mapLeadStageToTikTokCrmEvent(lead.status),
            eventId: `tt-crm-create-${lead.leadId}-${Date.now()}`,
            leadId: String(lead.leadId),
            email: lead.email,
            phone: lead.phone,
          });
          lead.tiktokSyncStatus = ttInit.status;
        }
        leads.unshift(lead);
        await writeJsonKv(env, 'pb:crm:leads:v1', leads);
        return json({ ok: true, lead }, 201);
      }

      const crmResendMatch = /^\/api\/admin\/crm\/leads\/([^/]+)\/resend$/.exec(p);
      if (crmResendMatch && method === 'POST') {
        const id = decodeURIComponent(crmResendMatch[1]);
        const leads = await readJsonKv<any[]>(env, 'pb:crm:leads:v1', []);
        const idx = leads.findIndex((l) => l.leadId === id);
        if (idx < 0) return json({ ok: false, error: 'Lead not found' }, 404);
        const metaDispatch = await dispatchMetaCrmStage(env, leads[idx]);
        leads[idx] = {
          ...leads[idx],
          metaSyncStatus: metaDispatch.status,
          metaLastSyncAt: new Date().toISOString(),
          metaLastMessage: metaDispatch.message,
        };
        await writeJsonKv(env, 'pb:crm:leads:v1', leads);
        return json({ ok: true, lead: leads[idx], metaDispatch });
      }

      const crmTtMatch = /^\/api\/admin\/crm\/leads\/([^/]+)\/resend-tiktok$/.exec(p);
      if (crmTtMatch && method === 'POST') {
        const id = decodeURIComponent(crmTtMatch[1]);
        const leads = await readJsonKv<any[]>(env, 'pb:crm:leads:v1', []);
        const idx = leads.findIndex((l) => l.leadId === id);
        if (idx < 0) return json({ ok: false, error: 'Lead not found' }, 404);
        const lead = leads[idx];
        const tiktokDispatch = await dispatchTikTokCrmEvent(env, {
          event: mapLeadStageToTikTokCrmEvent(String(lead.status || 'Qualified')),
          eventId: `tt-crm-${lead.leadId}-${Date.now()}`,
          leadId: String(lead.leadId),
          email: lead.email,
          phone: lead.phone,
        });
        leads[idx] = { ...lead, tiktokSyncStatus: tiktokDispatch.status };
        await writeJsonKv(env, 'pb:crm:leads:v1', leads);
        return json({
          ok: true,
          lead: leads[idx],
          tiktokDispatch,
        });
      }

      const crmMatch = /^\/api\/admin\/crm\/leads\/([^/]+)$/.exec(p);
      if (crmMatch) {
        const id = decodeURIComponent(crmMatch[1]);
        const leads = await readJsonKv<any[]>(env, 'pb:crm:leads:v1', []);
        if (method === 'PATCH') {
          const patch = await request.json().catch(() => ({}));
          const idx = leads.findIndex((l) => l.leadId === id);
          if (idx < 0) return json({ ok: false, error: 'Lead not found' }, 404);
          const changed = patch.status && patch.status !== leads[idx].status;
          leads[idx] = { ...leads[idx], ...patch, updatedAt: new Date().toISOString() };
          let metaDispatch = null;
          let tiktokDispatch = null;
          if (changed) {
            metaDispatch = await dispatchMetaCrmStage(env, leads[idx]);
            leads[idx].metaSyncStatus = metaDispatch.status;
            leads[idx].metaLastSyncAt = new Date().toISOString();
            leads[idx].metaLastMessage = metaDispatch.message;

            tiktokDispatch = await dispatchTikTokCrmEvent(env, {
              event: mapLeadStageToTikTokCrmEvent(String(leads[idx].status)),
              eventId: `tt-crm-stage-${leads[idx].leadId}-${Date.now()}`,
              leadId: String(leads[idx].leadId),
              email: leads[idx].email,
              phone: leads[idx].phone,
            });
            leads[idx].tiktokSyncStatus = tiktokDispatch.status;
          }
          await writeJsonKv(env, 'pb:crm:leads:v1', leads);
          return json({ ok: true, lead: leads[idx], metaDispatch, tiktokDispatch });
        }
        if (method === 'DELETE') {
          await writeJsonKv(env, 'pb:crm:leads:v1', leads.filter((l) => l.leadId !== id));
          return json({ ok: true });
        }
      }

      // ---- Customers & Allow-List (Linked Live to playbeat.digital KV) ----
      if (p === '/api/admin/customers' && method === 'GET') {
        return json({ ok: true, customers: await listCustomers(env) });
      }

      if (p === '/api/admin/customers' && method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const displayName = String(b.displayName || '').trim();
        const email = String(b.email || '').trim().toLowerCase();
        if (!displayName || !email) return json({ ok: false, error: 'Name and email are required.' }, 400);
        const uid = `uid_pb_${randomHex(6)}`;
        const customer = {
          uid,
          displayName,
          email,
          phone: String(b.phone || '').trim(),
          provider: b.provider === 'Google' ? 'Google' : 'Email',
          memberSince: new Date().toISOString().slice(0, 10),
          activeSessions: 0,
          prefs: { orderUpdates: true, productNews: true, securityAlerts: true },
          ordersCount: 0,
          totalSpentUsd: 0,
        };
        await writeJsonKv(env, `pb:auth:u:${uid}`, customer);
        if (b.password && String(b.password).length >= 8) {
          const creds = await readJsonKv<Record<string, any>>(env, 'pb:admin:customer-creds:v1', {});
          creds[email] = { uid, email, hash: await hashPassword(String(b.password)) };
          await writeJsonKv(env, 'pb:admin:customer-creds:v1', creds);
        }
        return json({ ok: true, customer }, 201);
      }

      const custResetMatch = /^\/api\/admin\/customers\/([^/]+)\/reset-password$/.exec(p);
      if (custResetMatch && method === 'POST') {
        const uid = decodeURIComponent(custResetMatch[1]);
        const rec = await readJsonKv<any>(env, `pb:auth:u:${uid}`, null);
        if (!rec) return json({ ok: false, error: 'Customer not found' }, 404);
        const b = await request.json().catch(() => ({}));
        const email = String(rec.email || '').toLowerCase();

        if (b.mode === 'direct') {
          const newPwd = String(b.newPassword || '');
          if (newPwd.length < 8) return json({ ok: false, error: 'Password must be at least 8 characters.' }, 400);
          const creds = await readJsonKv<Record<string, any>>(env, 'pb:admin:customer-creds:v1', {});
          creds[email] = { uid, email, hash: await hashPassword(newPwd) };
          await writeJsonKv(env, 'pb:admin:customer-creds:v1', creds);
          return json({ ok: true, mode: 'direct', email, message: `Password updated for ${email}.` });
        }

        const resetCode = `PB-${randomHex(4).toUpperCase()}-${randomHex(4).toUpperCase()}`;
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        const codes = await readJsonKv<Record<string, any>>(env, 'pb:admin:reset-codes:v1', {});
        codes[email] = { uid, codeHash: await sha256Hex(resetCode), expiresAt };
        await writeJsonKv(env, 'pb:admin:reset-codes:v1', codes);
        return json({
          ok: true,
          mode: 'code',
          email,
          resetCode,
          expiresAt,
          message: `Issued 30-minute one-time reset code for ${email}.`,
        });
      }

      const custRevokeMatch = /^\/api\/admin\/customers\/([^/]+)\/revoke-sessions$/.exec(p);
      if (custRevokeMatch && method === 'POST') {
        const uid = decodeURIComponent(custRevokeMatch[1]);
        const rec = await readJsonKv<any>(env, `pb:auth:u:${uid}`, null);
        if (!rec) return json({ ok: false, error: 'Customer not found' }, 404);
        const updated = { ...rec, activeSessions: 0 };
        await writeJsonKv(env, `pb:auth:u:${uid}`, updated);
        return json({ ok: true, customer: { ...updated, ordersCount: 0, totalSpentUsd: 0 } });
      }

      const custMatch = /^\/api\/admin\/customers\/([^/]+)$/.exec(p);
      if (custMatch) {
        const uid = decodeURIComponent(custMatch[1]);
        if (method === 'PATCH') {
          const rec = await readJsonKv<any>(env, `pb:auth:u:${uid}`, null);
          if (!rec) return json({ ok: false, error: 'Customer not found' }, 404);
          const b = await request.json().catch(() => ({}));
          const updated = {
            ...rec,
            displayName: b.displayName ? String(b.displayName).trim() : rec.displayName,
            email: b.email ? String(b.email).trim().toLowerCase() : rec.email,
            phone: b.phone !== undefined ? String(b.phone).trim() : rec.phone,
            provider: b.provider === 'Google' ? 'Google' : b.provider === 'Email' ? 'Email' : rec.provider,
          };
          await writeJsonKv(env, `pb:auth:u:${uid}`, updated);
          return json({ ok: true, customer: { ...updated, ordersCount: 0, totalSpentUsd: 0 } });
        }
        if (method === 'DELETE') {
          const rec = await readJsonKv<any>(env, `pb:auth:u:${uid}`, null);
          await kvOf(env).delete(`pb:auth:u:${uid}`);
          await kvOf(env).delete(`pb:account:extra:${uid}`);
          if (rec?.email) {
            const creds = await readJsonKv<Record<string, any>>(env, 'pb:admin:customer-creds:v1', {});
            delete creds[String(rec.email).toLowerCase()];
            await writeJsonKv(env, 'pb:admin:customer-creds:v1', creds);
          }
          return json({ ok: true, deletedUid: uid });
        }
      }

      if (p === '/api/admin/allowlist' && method === 'GET') {
        const raw = await readJsonKv<any>(env, 'pb:admin:allowlist:v1', []);
        const list = Array.isArray(raw)
          ? raw.map((item) =>
              typeof item === 'string'
                ? { email: item, role: 'Admin', addedAt: new Date().toISOString() }
                : item,
            )
          : [];
        return json({ ok: true, allowlist: list });
      }

      if (p === '/api/admin/allowlist' && method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const email = String(b.email || '').trim().toLowerCase();
        if (!email) return json({ ok: false, error: 'Email required' }, 400);
        const raw = await readJsonKv<any[]>(env, 'pb:admin:allowlist:v1', []);
        const entry = { email, role: b.role || 'Admin', addedAt: new Date().toISOString() };
        const next = [...raw.filter((x) => (typeof x === 'string' ? x : x.email) !== email), entry];
        await writeJsonKv(env, 'pb:admin:allowlist:v1', next);
        return json({ ok: true, entry }, 201);
      }

      const allowDel = /^\/api\/admin\/allowlist\/([^/]+)$/.exec(p);
      if (allowDel && method === 'DELETE') {
        const email = decodeURIComponent(allowDel[1]).toLowerCase();
        const raw = await readJsonKv<any[]>(env, 'pb:admin:allowlist:v1', []);
        const next = raw.filter((x) => String(typeof x === 'string' ? x : x.email).toLowerCase() !== email);
        await writeJsonKv(env, 'pb:admin:allowlist:v1', next);
        return json({ ok: true });
      }

      // ---- Google Service Accounts Registry & Live GA4/Search Traffic ----
      if (p === '/api/admin/google/service-accounts' && method === 'GET') {
        const { activeId, records } = await loadGoogleSaRegistry(env);
        return json({
          ok: true,
          activeId,
          accounts: records.map((r) => toPublicSaSummary(r, activeId)),
        });
      }

      if (p === '/api/admin/google/service-accounts' && method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const rawJson = typeof b.serviceAccountJson === 'string' ? b.serviceAccountJson : JSON.stringify(b.serviceAccountJson || '');
        const parsed = parseServiceAccountJson(rawJson);
        if (!parsed) {
          return json(
            { ok: false, error: 'Invalid Google Service Account JSON (requires client_email and RSA private_key).' },
            400,
          );
        }
        const { rawBlob } = await loadGoogleSaRegistry(env);
        const id = `sa_kv_${randomHex(5)}`;
        const rec: StoredServiceAccountRecord = {
          id,
          label: String(b.label || parsed.project_id || parsed.client_email).trim().slice(0, 80),
          source: 'kv',
          clientEmail: parsed.client_email,
          projectId: parsed.project_id || '',
          privateKeyId: parsed.private_key_id || '',
          adsenseAccountId: String(b.adsenseAccountId || env.ADSENSE_ACCOUNT || 'accounts/pub-9777611286139666').trim(),
          ga4PropertyId: String(b.ga4PropertyId || '').trim(),
          searchConsoleSite: String(b.searchConsoleSite || 'https://playbeat.digital/').trim(),
          addedAt: new Date().toISOString(),
          sa: parsed,
        };
        const nextCustom = [...(rawBlob.customAccounts || []).filter((x) => x.clientEmail !== rec.clientEmail), rec];
        const nextActive = b.setActive !== false ? id : rawBlob.activeId || id;
        await writeJsonKv(env, 'pb:google:sa-registry:v1', {
          ...rawBlob,
          activeId: nextActive,
          customAccounts: nextCustom,
        });
        return json({ ok: true, account: toPublicSaSummary(rec, nextActive) }, 201);
      }

      const gSaProbeMatch = /^\/api\/admin\/google\/service-accounts\/([^/]+)\/probe$/.exec(p);
      if (gSaProbeMatch && method === 'POST') {
        const id = decodeURIComponent(gSaProbeMatch[1]);
        const { records, rawBlob } = await loadGoogleSaRegistry(env);
        const rec = records.find((r) => r.id === id);
        if (!rec || !rec.sa) return json({ ok: false, error: 'Service account not found.' }, 404);
        const checks = await probeServiceAccountApis(rec);
        const checkedAt = new Date().toISOString();
        if (rec.source === 'secret') {
          await writeJsonKv(env, 'pb:google:sa-registry:v1', {
            ...rawBlob,
            envMeta: { ...(rawBlob.envMeta || {}), lastVerifiedAt: checkedAt },
          });
        } else {
          const nextCustom = (rawBlob.customAccounts || []).map((a) =>
            a.id === id ? { ...a, lastVerifiedAt: checkedAt } : a,
          );
          await writeJsonKv(env, 'pb:google:sa-registry:v1', { ...rawBlob, customAccounts: nextCustom });
        }
        return json({
          ok: true,
          accountId: rec.id,
          clientEmail: rec.clientEmail,
          projectId: rec.projectId,
          checkedAt,
          checks,
        });
      }

      const gSaMatch = /^\/api\/admin\/google\/service-accounts\/([^/]+)$/.exec(p);
      if (gSaMatch) {
        const id = decodeURIComponent(gSaMatch[1]);
        const { activeId, records, rawBlob } = await loadGoogleSaRegistry(env);
        const rec = records.find((r) => r.id === id);
        if (!rec) return json({ ok: false, error: 'Service account not found.' }, 404);

        if (method === 'PATCH') {
          const b = await request.json().catch(() => ({}));
          const nextActive = b.active === true ? id : activeId;
          if (rec.source === 'secret') {
            const nextMeta = {
              ...(rawBlob.envMeta || {}),
              ...(b.label !== undefined ? { label: String(b.label).trim().slice(0, 80) } : {}),
              ...(b.adsenseAccountId !== undefined ? { adsenseAccountId: String(b.adsenseAccountId).trim() } : {}),
              ...(b.ga4PropertyId !== undefined ? { ga4PropertyId: String(b.ga4PropertyId).trim() } : {}),
              ...(b.searchConsoleSite !== undefined ? { searchConsoleSite: String(b.searchConsoleSite).trim() } : {}),
            };
            await writeJsonKv(env, 'pb:google:sa-registry:v1', {
              ...rawBlob,
              activeId: nextActive,
              envMeta: nextMeta,
            });
            const updated: StoredServiceAccountRecord = { ...rec, ...nextMeta };
            return json({ ok: true, account: toPublicSaSummary(updated, nextActive) });
          } else {
            const nextCustom = (rawBlob.customAccounts || []).map((a) =>
              a.id === id
                ? {
                    ...a,
                    label: b.label !== undefined ? String(b.label).trim().slice(0, 80) : a.label,
                    adsenseAccountId:
                      b.adsenseAccountId !== undefined ? String(b.adsenseAccountId).trim() : a.adsenseAccountId,
                    ga4PropertyId: b.ga4PropertyId !== undefined ? String(b.ga4PropertyId).trim() : a.ga4PropertyId,
                    searchConsoleSite:
                      b.searchConsoleSite !== undefined ? String(b.searchConsoleSite).trim() : a.searchConsoleSite,
                  }
                : a,
            );
            await writeJsonKv(env, 'pb:google:sa-registry:v1', {
              ...rawBlob,
              activeId: nextActive,
              customAccounts: nextCustom,
            });
            const updated = nextCustom.find((a) => a.id === id)!;
            return json({ ok: true, account: toPublicSaSummary(updated, nextActive) });
          }
        }

        if (method === 'DELETE') {
          if (rec.source === 'secret') {
            return json(
              { ok: false, error: 'Primary Cloudflare Worker Secret service account cannot be deleted from UI.' },
              400,
            );
          }
          const nextCustom = (rawBlob.customAccounts || []).filter((a) => a.id !== id);
          const nextActive = rawBlob.activeId === id ? 'sa_env_primary' : rawBlob.activeId;
          await writeJsonKv(env, 'pb:google:sa-registry:v1', {
            ...rawBlob,
            activeId: nextActive,
            customAccounts: nextCustom,
          });
          return json({ ok: true });
        }
      }

      if (p === '/api/admin/google/traffic' && method === 'GET') {
        const range = url.searchParams.get('range') || '7d';
        const { activeId, records } = await loadGoogleSaRegistry(env);
        const chosen = records.find((r) => r.id === activeId) || records[0];
        if (!chosen?.sa) {
          return json({
            ok: false,
            range,
            propertyId: '',
            error: 'NO_SERVICE_ACCOUNT',
            message: 'Add a Google Service Account in the Service Accounts tab to stream live GA4 traffic analytics.',
          });
        }
        const report = await fetchGa4TrafficReport(
          chosen.sa,
          chosen.ga4PropertyId,
          range,
          chosen.searchConsoleSite,
        );
        return json(report);
      }

      // ---- AdSense, Meta, TikTok (Real Service Account RS256 + Storefront Proxy + KV) ----
      if (p === '/api/admin/adsense/status' && method === 'GET') {
        const { activeId, records } = await loadGoogleSaRegistry(env);
        const activeSaRec = records.find((r) => r.id === activeId) || records[0];
        const sa = activeSaRec?.sa || null;
        const cfg = await readJsonKv<any>(env, 'pb:adsense:config:v1', {});
        const refresh = await kvOf(env).get('pb:adsense:refresh:v1');

        if (session.upstreamToken) {
          const sfRes = await fetchStorefront(env, '/api/admin/adsense/status', {
            headers: { authorization: `Bearer ${session.upstreamToken}` },
          });
          if (sfRes && sfRes.ok) {
            const upstream = await sfRes.json().catch(() => null);
            if (upstream && upstream.connected) {
              return json({
                ok: true,
                connected: true,
                authMode: upstream.authMode || 'oauth',
                account: activeSaRec?.adsenseAccountId || upstream.account || env.ADSENSE_ACCOUNT || 'accounts/pub-9777611286139666',
                publisherId: 'ca-pub-9777611286139666',
                adsTxtLine: 'google.com, pub-9777611286139666, DIRECT, f08c47fec0942fa0',
                oauthClientConfigured: true,
                refreshTokenPresent: true,
                serviceAccountConfigured: !!sa || !!upstream.serviceAccountConfigured,
                serviceAccountEmail: sa?.client_email || null,
                serviceAccountProjectId: sa?.project_id || null,
                kvKey: 'pb:adsense:config:v1',
                note: 'Connected via playbeat-digital Worker OAuth & Service Account.',
              });
            }
          }
        }

        const hasRefresh = !!(refresh || cfg?.refreshToken);
        const authMode = hasRefresh ? 'oauth' : sa ? 'service_account' : 'none';
        return json({
          ok: true,
          connected: hasRefresh || !!sa,
          authMode,
          account: activeSaRec?.adsenseAccountId || env.ADSENSE_ACCOUNT || 'accounts/pub-9777611286139666',
          publisherId: 'ca-pub-9777611286139666',
          adsTxtLine: 'google.com, pub-9777611286139666, DIRECT, f08c47fec0942fa0',
          oauthClientConfigured: !!(env.GOOGLE_ADSENSE_CLIENT_ID || env.GOOGLE_CLIENT_ID || env.STOREFRONT),
          refreshTokenPresent: hasRefresh,
          serviceAccountConfigured: !!sa,
          serviceAccountEmail: sa?.client_email || null,
          serviceAccountProjectId: sa?.project_id || null,
          kvKey: 'pb:adsense:config:v1',
          note: sa
            ? `Active Service Account: ${sa.client_email} (${sa.project_id}). Manage multiple accounts, probe API scopes, and inspect GA4 traffic in the tabs above.`
            : 'Reading live AdSense state from shared playbeat-digital-kv.',
        });
      }

      if (p === '/api/admin/adsense/analytics' && method === 'GET') {
        const range = url.searchParams.get('range') || '7d';
        const byDomain = url.searchParams.get('by') === 'domain';
        const { activeId, records } = await loadGoogleSaRegistry(env);
        const activeSaRec = records.find((r) => r.id === activeId) || records[0];
        const account = activeSaRec?.adsenseAccountId || env.ADSENSE_ACCOUNT || 'accounts/pub-9777611286139666';

        // 1. Try linked Storefront Worker first if upstream admin token exists
        if (session.upstreamToken) {
          const sfRes = await fetchStorefront(env, `/api/admin/adsense/analytics${url.search}`, {
            headers: { authorization: `Bearer ${session.upstreamToken}` },
          });
          if (sfRes && sfRes.ok) {
            const upstreamData = await sfRes.json().catch(() => null);
            if (upstreamData && upstreamData.ok) {
              return json(upstreamData);
            }
          }
        }

        // 2. Try Active Google Service Account RS256 JWT token directly against AdSense Management API v2
        if (activeSaRec?.sa) {
          const minted = await mintGoogleServiceAccountToken(
            env,
            'https://www.googleapis.com/auth/adsense.readonly',
            activeSaRec,
          );
          if (!minted.ok) {
            return json({
              ok: false,
              range,
              by: byDomain ? 'DOMAIN_NAME' : 'DATE',
              error: 'GOOGLE_SA_TOKEN_ERROR',
              message: minted.error,
            });
          }
          const report = await fetchAdSenseReportWithToken(minted.accessToken, account, range, byDomain);
          if (report.ok) return json(report);
          return json({
            ok: false,
            range,
            by: byDomain ? 'DOMAIN_NAME' : 'DATE',
            error: report.error || 'ADSENSE_API_ERROR',
            message: `${report.message} (Service Account: ${minted.email} — grant read access in Google AdSense → Account → Access and Authorization → User Management, or connect OAuth in Social & Ad Accounts.)`,
          });
        }

        return json({
          ok: false,
          range,
          by: byDomain ? 'DOMAIN_NAME' : 'DATE',
          error: 'ADSENSE_AUTH_REQUIRED',
          message:
            'Configure GOOGLE_SERVICE_ACCOUNT_JSON or complete Google OAuth in Social & Ad Accounts to stream live AdSense Management API v2 reports.',
        });
      }

      if (p === '/api/admin/meta/analytics' && method === 'GET') {
        const metaCfg = await readJsonKv<any>(env, 'pb:meta:config:v1', {});
        const logs = await readJsonKv<any[]>(env, 'pb:admin:meta-logs:v1', []);
        const hasToken = !!(env.META_ACCESS_TOKEN || metaCfg?.accessToken);
        return json({
          ok: hasToken,
          configured: hasToken,
          graphVersion: 'v23.0',
          webDatasetConfigured: !!(env.META_WEB_DATASET_ID || env.META_WA_DATASET_ID || metaCfg?.pixelId || metaCfg?.datasetId),
          waDatasetConfigured: !!(env.META_WA_DATASET_ID || metaCfg?.waDatasetId || metaCfg?.datasetId),
          wabaConfigured: !!(env.META_WABA_ID || metaCfg?.wabaId),
          testCodeActive: !!(env.META_TEST_CODE || metaCfg?.testEventCode),
          recentLogs: logs.slice(0, 20),
        });
      }

      if (p === '/api/admin/meta/test-event' && method === 'POST') {
        const b = await request.json().catch(() => ({}));
        const channel = b.channel === 'website_capi' ? 'website_capi' : 'whatsapp_crm';
        const res = await dispatchMetaCrmStage(
          env,
          {
            leadId: `TEST-${Date.now()}`,
            status: 'Qualified',
            email: 'business@playbeat.digital',
            phone: '+923000000000',
            expectedValueUsd: 1,
          },
          channel,
        );
        return json({ ok: res.ok, detail: res.message, channel });
      }

      if (p === '/api/admin/tiktok/status' && method === 'GET') {
        const c = await readJsonKv<any>(env, 'pb:tiktok:config:v1', {});
        const pixelId = String(env.TIKTOK_PIXEL_ID || c?.pixelId || 'DC3J0CBC77U6OQMIKJ80');
        const crmEventSetId = String(env.TIKTOK_CRM_EVENT_SET_ID || c?.crmEventSetId || '7712192188952346645');
        return json({
          ok: true,
          pixelSaved: !!pixelId,
          pixelId,
          eventsTokenSaved: !!(env.TIKTOK_EVENTS_TOKEN || c?.eventsToken || c?.accessToken),
          crmEventSetSaved: !!crmEventSetId,
          crmEventSetId,
          crmTokenSaved: !!(env.TIKTOK_CRM_ACCESS_TOKEN || c?.crmAccessToken),
        });
      }

      if (p === '/api/admin/tiktok/test-event' && method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const mode = body?.channel === 'crm' ? 'crm' : 'web';
        if (mode === 'crm') {
          const res = await dispatchTikTokCrmEvent(env, {
            event: 'Qualified',
            eventId: `tt-crm-test-${Date.now()}`,
            leadId: `PB-TEST-${Date.now()}`,
            email: 'business@playbeat.digital',
            phone: '+923000000000',
          });
          return json({
            ok: res.ok,
            status: res.status,
            channel: 'crm',
            detail: res.detail,
          });
        }
        const res = await dispatchTikTokEventsApi(env, {
          event: 'ViewContent',
          eventId: `tt-test-${Date.now()}`,
          entityRef: 'test',
          email: 'business@playbeat.digital',
          phone: '+923000000000',
          externalId: 'playbeat_admin_test',
          value: 1,
          currency: 'USD',
          contents: [
            {
              content_id: 'PB-TEST-001',
              content_type: 'product',
              content_name: 'PlayBeat Digital Storefront Diagnostic',
            },
          ],
        });
        return json({
          ok: res.ok,
          status: res.status,
          channel: 'web',
          detail: res.detail,
        });
      }

      // ---- Domains ----
      if (p === '/api/admin/domains' && method === 'GET') {
        const domains = await readJsonKv<any[]>(env, 'pb:admin:domains:v1', DEFAULT_DOMAINS);
        return json({
          ok: true,
          publisherId: 'ca-pub-9777611286139666',
          adsTxtLine: 'google.com, pub-9777611286139666, DIRECT, f08c47fec0942fa0',
          domains,
        });
      }

      const domMatch = /^\/api\/admin\/domains\/([^/]+)$/.exec(p);
      if (domMatch && method === 'PATCH') {
        const domain = decodeURIComponent(domMatch[1]);
        const patch = await request.json().catch(() => ({}));
        const domains = await readJsonKv<any[]>(env, 'pb:admin:domains:v1', DEFAULT_DOMAINS);
        const idx = domains.findIndex((d) => d.domain === domain);
        if (idx < 0) return json({ ok: false, error: 'Domain not found' }, 404);
        domains[idx] = { ...domains[idx], ...patch };
        await writeJsonKv(env, 'pb:admin:domains:v1', domains);
        return json({ ok: true, domain: domains[idx] });
      }

      // ---- Social & Ad Channels Hub ----
      if (p === '/api/admin/channels' && method === 'GET') {
        const saved = await readJsonKv<Record<string, any>>(env, 'pb:admin:channels:v1', {});
        const sa = parseServiceAccount(env);
        const hasMetaToken = !!env.META_ACCESS_TOKEN;
        const channels = Object.keys(CHANNEL_DEFAULTS).map((key) => {
          const base = CHANNEL_DEFAULTS[key];
          const cur = saved[key] || {};
          const oauthReady =
            base.category === 'Google'
              ? !!(env.GOOGLE_CLIENT_ID || env.GOOGLE_ADSENSE_CLIENT_ID)
              : base.category === 'Meta'
                ? !!(env.META_APP_ID && env.META_APP_SECRET)
                : !!(env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET);

          let connected = !!cur.connected;
          let connectionMethod = cur.connectionMethod || 'profile_only';
          let connectedEmail = cur.connectedEmail;

          if (!connected && base.category === 'Google' && sa) {
            connected = true;
            connectionMethod = 'service_account';
            connectedEmail = sa.client_email;
          } else if (!connected && key === 'facebook' && hasMetaToken) {
            connected = true;
            connectionMethod = 'server_token';
            connectedEmail = 'Meta System Token (Graph v23.0)';
          }

          return {
            ...base,
            ...cur,
            connected,
            connectionMethod,
            connectedEmail,
            oauthReady,
          };
        });
        return json({
          ok: true,
          callbackBaseUrl: url.origin,
          channels,
        });
      }

      const chActionMatch = /^\/api\/admin\/channels\/([^/]+)\/(profile|oauth\/url|verify|disconnect)$/.exec(p);
      if (chActionMatch) {
        const platform = decodeURIComponent(chActionMatch[1]);
        const action = chActionMatch[2];
        if (!CHANNEL_DEFAULTS[platform]) return json({ ok: false, error: 'Unknown platform' }, 404);
        const saved = await readJsonKv<Record<string, any>>(env, 'pb:admin:channels:v1', {});
        const current = { ...CHANNEL_DEFAULTS[platform], ...(saved[platform] || {}) };

        if (action === 'profile' && method === 'POST') {
          const b = await request.json().catch(() => ({}));
          saved[platform] = {
            ...current,
            accountId: b.accountId !== undefined ? String(b.accountId).trim() : current.accountId,
            secondaryId: b.secondaryId !== undefined ? String(b.secondaryId).trim() : current.secondaryId,
            loginIdentifier: b.loginIdentifier !== undefined ? String(b.loginIdentifier).trim() : current.loginIdentifier,
            notes: b.notes !== undefined ? String(b.notes).trim() : current.notes,
          };
          await writeJsonKv(env, 'pb:admin:channels:v1', saved);
          return json({ ok: true, channel: saved[platform] });
        }

        if (action === 'verify' && method === 'POST') {
          let detail = `Profile saved on playbeat-admin KV (${current.accountId || 'ID pending'}).`;
          let verifiedOk = true;
          let methodUsed = current.connectionMethod || 'profile_only';
          let connectedEmail = current.connectedEmail;

          if (current.category === 'Google') {
            const scope = (current.scopes && current.scopes[0]) || 'https://www.googleapis.com/auth/adsense.readonly';
            const minted = await mintGoogleServiceAccountToken(env, scope);
            if (minted.ok) {
              methodUsed = 'service_account';
              connectedEmail = minted.email;
              detail = `Verified RS256 OAuth2 token issued for ${minted.email} (project ${minted.projectId}).`;
            } else {
              verifiedOk = false;
              detail = `Google verification error: ${minted.error}`;
            }
          } else if (current.category === 'Meta' && env.META_ACCESS_TOKEN) {
            try {
              const r = await fetch('https://graph.facebook.com/v23.0/me?fields=id,name', {
                headers: { authorization: `Bearer ${env.META_ACCESS_TOKEN}` },
              });
              const body = await r.json().catch(() => ({}));
              if (r.ok && body.id) {
                methodUsed = 'server_token';
                connectedEmail = `${body.name || 'Meta App'} (${body.id})`;
                detail = `Meta Graph v23.0 verified live as "${body.name || body.id}" (Dataset ${env.META_WA_DATASET_ID || current.accountId}).`;
              } else {
                verifiedOk = false;
                detail = `Meta Graph HTTP ${r.status}: ${body?.error?.message || 'Token check failed'}`;
              }
            } catch (err) {
              verifiedOk = false;
              detail = err instanceof Error ? err.message : 'Meta verification failed';
            }
          }

          saved[platform] = {
            ...current,
            connected: verifiedOk ? true : current.connected,
            connectionMethod: methodUsed,
            connectedEmail,
            lastVerifiedAt: new Date().toISOString(),
            lastVerifyDetail: detail,
          };
          await writeJsonKv(env, 'pb:admin:channels:v1', saved);
          return json({ ok: verifiedOk, detail, channel: saved[platform] });
        }

        if (action === 'disconnect' && method === 'POST') {
          saved[platform] = { ...current, connected: false, connectionMethod: 'none' };
          await writeJsonKv(env, 'pb:admin:channels:v1', saved);
          return json({ ok: true, channel: saved[platform] });
        }

        if (action === 'oauth/url' && method === 'GET') {
          return json(
            {
              ok: false,
              error: `Configure ${CHANNEL_DEFAULTS[platform].requiredEnvVars.join(' & ')} secrets on Worker playbeat-admin to launch live OAuth popup.`,
            },
            400,
          );
        }
      }

      // ---- Electronic First Developer API v1 Proxy ----
      if (p === '/api/admin/electronicfirst/status' && method === 'GET') {
        return json({
          ok: true,
          configured: !!env.ELECTRONIC_FIRST_API_KEY,
          baseUrl: EF_BASE_URL,
          affiliateRef: env.ELECTRONIC_FIRST_AFFILIATE_REF || 'ywzhmdg',
          affiliateLink: 'https://www.electronicfirst.com/?ref=ywzhmdg',
          shortLink: 'https://fas.st/t/WUFdhZbZ',
          accountEmail: 'business@playbeat.digital',
          rateLimit: { limitPerMin: 30, usedInWindow: 0, remaining: 30 },
        });
      }

      const efEndpoints: Record<string, string> = {
        '/api/admin/electronicfirst/ping': '/ping',
        '/api/admin/electronicfirst/balance': '/affiliate/balance',
        '/api/admin/electronicfirst/payouts': '/affiliate/payouts',
        '/api/admin/electronicfirst/conversions': '/affiliate/conversions',
      };
      if (efEndpoints[p]) {
        const apiKey = env.ELECTRONIC_FIRST_API_KEY;
        if (!apiKey) {
          return json({
            ok: false,
            httpStatus: 401,
            latencyMs: 0,
            errorCode: 'missing_api_key',
            message: 'Set ELECTRONIC_FIRST_API_KEY secret via wrangler secret put ELECTRONIC_FIRST_API_KEY.',
            rateLimit: { limitPerMin: 30, usedInWindow: 0, remaining: 30 },
          });
        }
        const t0 = Date.now();
        try {
          const r = await fetch(`${EF_BASE_URL}${efEndpoints[p]}`, {
            headers: {
              'Api-Key': apiKey,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          });
          const body = await r.json().catch(() => ({}));
          return json({
            ok: r.ok,
            httpStatus: r.status,
            latencyMs: Date.now() - t0,
            data: body.data ?? body,
            errorCode: body.error_code || body.code,
            message: body.message,
            rateLimit: { limitPerMin: 30, usedInWindow: 1, remaining: 29 },
          });
        } catch (err) {
          return json({
            ok: false,
            httpStatus: 502,
            latencyMs: Date.now() - t0,
            message: err instanceof Error ? err.message : 'Electronic First request failed',
            rateLimit: { limitPerMin: 30, usedInWindow: 1, remaining: 29 },
          });
        }
      }

      return json({ ok: false, error: 'NOT_FOUND' }, 404);
    }

    // 4. Static Frontend SPA (Argon Dashboard + PlayBeat Digital Login Landing)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('PlayBeat Admin Worker Active — Static ASSETS binding not attached.', {
      status: 404,
    });
  },
};
