export type CrmStage =
  | 'Researched'
  | 'Contacted'
  | 'Replied'
  | 'Qualified'
  | 'Won'
  | 'Lost';

export const CRM_STAGES: CrmStage[] = [
  'Researched',
  'Contacted',
  'Replied',
  'Qualified',
  'Won',
  'Lost',
];

export interface CrmLead {
  leadId: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  ctwaClid?: string;
  expectedValueUsd: number;
  source: 'WhatsApp' | 'Storefront' | 'Facebook' | 'Referral' | 'Direct';
  status: CrmStage;
  score: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  metaLastEvent?: 'Lead' | 'Purchase' | null;
  metaSyncStatus?: 'sent' | 'skipped' | 'not_configured' | 'failed';
  metaLastSyncAt?: string;
  metaLastMessage?: string;
  tiktokSyncStatus?: 'sent' | 'not_configured' | 'failed';
}

export interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  platform: 'PC / Steam' | 'PlayStation' | 'Xbox' | 'Nintendo' | 'Software' | 'TV Plan' | 'Service';
  category: 'Games' | 'Gift Cards' | 'Subscriptions' | 'Services' | 'TV Plans';
  priceUsd: number;
  pricePkr: number;
  discountPct: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  active: boolean;
  source?: 'Manual' | 'ElectronicFirst' | 'InventoryImport';
  updatedAt: string;
}

export interface ServiceItem {
  id: string;
  code: string;
  name: string;
  turnaround: string;
  priceUsd: number;
  pricePkr: number;
  active: boolean;
}

export interface TvChannel {
  id: string;
  name: string;
  category: 'Sports' | 'News' | 'Entertainment' | 'Regional';
  region: 'USA / NA' | 'South Asia' | 'Middle East' | 'Global';
  domain: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  active: boolean;
}

export interface TvPlan {
  id: string;
  sku: string;
  name: string;
  durationMonths: number;
  domains: string[];
  priceUsd: number;
  pricePkr: number;
  active: boolean;
}

export interface CustomerAccount {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  provider: 'Google' | 'Email';
  memberSince: string;
  activeSessions: number;
  prefs: {
    orderUpdates: boolean;
    productNews: boolean;
    securityAlerts: boolean;
  };
  ordersCount: number;
  totalSpentUsd: number;
}

export interface AllowlistEntry {
  email: string;
  role: 'Owner' | 'Admin' | 'Operator';
  addedAt: string;
}

export type AccountRole = 'admin' | 'customer';

export type ProfileCoverTheme =
  | 'argon-blue'
  | 'argon-ocean'
  | 'argon-emerald'
  | 'argon-sunset'
  | 'argon-slate';

export interface ProfileCustomField {
  id: string;
  label: string;
  value: string;
  category: 'Operations' | 'Billing' | 'Contact' | 'Other';
}

export interface ProfileSocialLink {
  id: string;
  platform: string;
  handle: string;
  url: string;
}

export interface UserProfile {
  uid: string;
  role: AccountRole;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  title?: string;
  department?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  website?: string;
  bio?: string;
  avatarUrl?: string;
  coverTheme: ProfileCoverTheme;
  brandTitle?: string;
  customFields: ProfileCustomField[];
  socialLinks: ProfileSocialLink[];
  skills: string[];
  provider: 'Password' | 'Google' | 'Email';
  memberSince: string;
  prefs: {
    orderUpdates: boolean;
    productNews: boolean;
    securityAlerts: boolean;
  };
}

export interface SessionInfo {
  id: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export type ChannelPlatform =
  | 'google_adsense'
  | 'google_ads'
  | 'google_analytics'
  | 'facebook'
  | 'instagram'
  | 'threads'
  | 'tiktok';

export interface ChannelConnection {
  platform: ChannelPlatform;
  name: string;
  category: 'Google' | 'Meta' | 'TikTok';
  accountId: string;
  accountIdLabel: string;
  accountIdPlaceholder: string;
  secondaryId: string;
  secondaryIdLabel: string;
  secondaryIdPlaceholder: string;
  loginIdentifier: string;
  notes: string;
  connected: boolean;
  connectionMethod: 'oauth' | 'service_account' | 'server_token' | 'profile_only' | 'none';
  oauthReady: boolean;
  requiredEnvVars: string[];
  callbackPath: string;
  portalUrl: string;
  scopes: string[];
  connectedEmail?: string;
  connectedAt?: string;
  lastVerifiedAt?: string;
  lastVerifyDetail?: string;
}

export interface ElectronicFirstStatus {
  ok: boolean;
  configured: boolean;
  baseUrl: string;
  affiliateRef: string;
  affiliateLink: string;
  shortLink: string;
  accountEmail: string;
  rateLimit: {
    limitPerMin: number;
    usedInWindow: number;
    remaining: number;
  };
}

export interface ElectronicFirstApiResult<T = unknown> {
  ok: boolean;
  httpStatus: number;
  latencyMs: number;
  errorCode?: string;
  message?: string;
  data?: T;
  rateLimit: {
    limitPerMin: number;
    usedInWindow: number;
    remaining: number;
  };
}

export interface OrderItem {
  sku: string;
  name: string;
  qty: number;
  priceUsd: number;
}

export type OrderStatus = 'PENDING' | 'PAID_FULFILLED' | 'CANCELLED';

export interface OrderRecord {
  id: string;
  customerEmail: string;
  customerPhone?: string;
  customerUid?: string;
  channel: 'WhatsApp' | 'PayPal' | 'JazzCash / EasyPaisa' | 'Stripe' | 'Manual';
  paymentRef: string;
  status: OrderStatus;
  totalUsd: number;
  totalPkr: number;
  items: OrderItem[];
  issuedKeys: string[];
  metaCapiStatus?: 'sent' | 'not_configured' | 'failed';
  createdAt: string;
  fulfilledAt?: string;
}

export type AdSenseRange = 'today' | 'yesterday' | '7d' | '28d' | 'mtd';

export interface AdSenseDailyRow {
  date: string;
  earnings: number;
  pageViews: number;
  impressions: number;
  clicks: number;
}

export interface AdSenseDomainRow {
  domain: string;
  earnings: number;
  pageViews: number;
  impressions: number;
  clicks: number;
}

export interface AdSenseAnalyticsResponse {
  ok: boolean;
  range: string;
  by: 'DATE' | 'DOMAIN_NAME';
  daily?: AdSenseDailyRow[];
  domains?: AdSenseDomainRow[];
  totals?: {
    earnings: number;
    pageViews: number;
    impressions: number;
    clicks: number;
    rpm: number;
    ctr: number;
  };
  error?: string;
  code?: string;
  message?: string;
}

export interface AdSenseStatus {
  ok: boolean;
  connected: boolean;
  authMode: 'oauth' | 'service_account' | 'none';
  account: string;
  publisherId: string;
  adsTxtLine: string;
  oauthClientConfigured: boolean;
  refreshTokenPresent: boolean;
  serviceAccountConfigured: boolean;
  serviceAccountEmail?: string | null;
  serviceAccountProjectId?: string | null;
  kvKey: string;
  note: string;
}

export interface GoogleServiceAccountSummary {
  id: string;
  label: string;
  clientEmail: string;
  projectId: string;
  privateKeyId: string;
  source: 'secret' | 'kv';
  active: boolean;
  adsenseAccountId: string;
  ga4PropertyId: string;
  searchConsoleSite: string;
  addedAt: string;
  lastVerifiedAt?: string;
}

export interface GoogleServiceProbeItem {
  service: 'adsense' | 'ga4' | 'search_console';
  name: string;
  apiEnabled: boolean;
  accessGranted: boolean;
  httpStatus: number;
  discoveredItems: Array<{ id: string; name: string }>;
  detail: string;
  actionUrl?: string;
}

export interface GoogleServiceProbeResponse {
  ok: boolean;
  accountId: string;
  clientEmail: string;
  projectId: string;
  checkedAt: string;
  checks: GoogleServiceProbeItem[];
}

export interface GoogleTrafficDailyRow {
  date: string;
  activeUsers: number;
  sessions: number;
  pageViews: number;
  bounceRate: number;
}

export interface GoogleTrafficReportResponse {
  ok: boolean;
  range: string;
  propertyId: string;
  serviceAccountEmail?: string;
  daily?: GoogleTrafficDailyRow[];
  topPages?: Array<{ path: string; views: number; users: number }>;
  channels?: Array<{ channel: string; sessions: number; users: number }>;
  totals?: {
    activeUsers: number;
    sessions: number;
    pageViews: number;
    avgBounceRate: number;
    avgSessionDurationSec: number;
  };
  searchConsole?: {
    ok: boolean;
    siteUrl?: string;
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
    message?: string;
  };
  discoveredProperties?: Array<{ id: string; name: string }>;
  error?: string;
  message?: string;
}

export interface MetaEventDispatchLog {
  id: string;
  timestamp: string;
  channel: 'whatsapp_crm' | 'website_capi' | 'tiktok_events';
  eventName: string;
  eventId: string;
  entityRef: string;
  status: 'sent' | 'not_configured' | 'failed';
  httpStatus?: number;
  detail: string;
}

export interface MetaAnalyticsStatus {
  ok: boolean;
  configured: boolean;
  graphVersion: string;
  webDatasetConfigured: boolean;
  waDatasetConfigured: boolean;
  wabaConfigured: boolean;
  testCodeActive: boolean;
  error?: string;
  recentLogs: MetaEventDispatchLog[];
}

export interface TikTokStatus {
  ok: boolean;
  pixelSaved: boolean;
  pixelId?: string;
  eventsTokenSaved: boolean;
  crmEventSetSaved?: boolean;
  crmEventSetId?: string;
  crmTokenSaved?: boolean;
}

export interface DomainRecord {
  domain: string;
  siteRole: string;
  hosting: string;
  inCloudflareAccount: boolean;
  adsTxtOk: boolean;
  adsByGoogleOk: boolean;
  privacyOk: boolean;
  termsOk: boolean;
  autoAdsNote: string;
  actionRequired?: string;
  contactEmail: string;
}

export interface AdminSummary {
  usdToPkr: number;
  orders: {
    total: number;
    fulfilled: number;
    pending: number;
    revenue30dUsd: number;
    revenue30dPkr: number;
    dailyRevenue: Array<{ date: string; revenueUsd: number; orders: number }>;
  };
  catalog: {
    total: number;
    inStock: number;
    active: number;
    deals: number;
    servicesCount: number;
    tvChannelsCount: number;
    tvPlansCount: number;
    byCategory: Array<{ category: string; count: number; inStock: number; avgPriceUsd: number }>;
  };
  crm: {
    total: number;
    pipelineUsd: number;
    wonUsd: number;
    byStage: Array<{ stage: CrmStage; count: number; valueUsd: number }>;
  };
  domains: {
    total: number;
    adsTxtReady: number;
    legalReady: number;
  };
  customers: {
    total: number;
    activeSessions: number;
    allowlistCount: number;
  };
  integrations: {
    adsenseConnected: boolean;
    metaConfigured: boolean;
    tiktokConfigured: boolean;
    electronicFirstConfigured: boolean;
    upstreamWorkerConfigured: boolean;
  };
  recentOrders: OrderRecord[];
}

export interface AuthStatusResponse {
  ok: boolean;
  mode: 'env' | 'claimed' | 'setup_required';
  upstreamConfigured: boolean;
}
