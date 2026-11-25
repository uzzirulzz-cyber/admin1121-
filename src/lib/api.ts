import type {
  AccountRole,
  AdSenseAnalyticsResponse,
  AdSenseRange,
  AdSenseStatus,
  AdminSummary,
  AllowlistEntry,
  AuthStatusResponse,
  CatalogProduct,
  ChannelConnection,
  ChannelPlatform,
  CrmLead,
  CrmStage,
  CustomerAccount,
  DomainRecord,
  ElectronicFirstApiResult,
  ElectronicFirstStatus,
  GoogleServiceAccountSummary,
  GoogleServiceProbeResponse,
  GoogleTrafficReportResponse,
  MetaAnalyticsStatus,
  OrderRecord,
  ProfileCoverTheme,
  ProfileCustomField,
  ProfileSocialLink,
  ServiceItem,
  SessionInfo,
  TikTokStatus,
  TvChannel,
  TvPlan,
  UserProfile,
} from '../types/admin';

let memoryToken: string | null = null;
let onUnauthorizedHandler: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  memoryToken = token;
}

export function getAuthToken(): string | null {
  return memoryToken;
}

export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorizedHandler = fn;
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  requireAuth = true,
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (requireAuth && memoryToken) {
    headers.set('authorization', `Bearer ${memoryToken}`);
  }

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && requireAuth) {
    memoryToken = null;
    onUnauthorizedHandler?.();
    throw new Error(data.error || 'Session expired. Please sign in again.');
  }

  if (!res.ok) {
    throw new Error(data.message || data.error || `Request failed (${res.status})`);
  }

  return data as T;
}

export const api = {
  health: () =>
    requestJson<{ ok: boolean; time: string; service: string; endpoints: string[] }>(
      '/api/health',
      {},
      false,
    ),

  authStatus: () => requestJson<AuthStatusResponse>('/api/admin/auth-status', {}, false),

  setupAdmin: (password: string) =>
    requestJson<{ ok: boolean; token: string; role: AccountRole; expiresAt: string }>(
      '/api/admin/setup',
      { method: 'POST', body: JSON.stringify({ password }) },
      false,
    ),

  login: (password: string) =>
    requestJson<{ ok: boolean; token: string; role: AccountRole; expiresAt: string }>(
      '/api/admin/login',
      { method: 'POST', body: JSON.stringify({ password }) },
      false,
    ),

  registerAccount: (payload: {
    displayName: string;
    email: string;
    phone?: string;
    password: string;
  }) =>
    requestJson<{ ok: boolean; token: string; role: AccountRole; expiresAt: string }>(
      '/api/auth/register',
      { method: 'POST', body: JSON.stringify(payload) },
      false,
    ),

  customerLogin: (emailOrAccountId: string, password: string) =>
    requestJson<{ ok: boolean; token: string; role: AccountRole; expiresAt: string }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ email: emailOrAccountId, password }) },
      false,
    ),

  forgotPassword: (email: string) =>
    requestJson<{ ok: boolean; message: string }>(
      '/api/auth/forgot-password',
      { method: 'POST', body: JSON.stringify({ email }) },
      false,
    ),

  resetPasswordWithCode: (payload: {
    email: string;
    resetCode: string;
    newPassword: string;
  }) =>
    requestJson<{ ok: boolean; message: string }>(
      '/api/auth/reset-password',
      { method: 'POST', body: JSON.stringify(payload) },
      false,
    ),

  logout: () => requestJson<{ ok: boolean }>('/api/admin/logout', { method: 'POST' }),

  // Account Profile, Notifications, Sessions & Password Change
  accountProfile: () =>
    requestJson<{ ok: boolean; profile: UserProfile }>('/api/account/profile'),

  saveAccountProfile: (payload: {
    displayName: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    title?: string;
    department?: string;
    address?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    website?: string;
    bio?: string;
    avatarUrl?: string;
    coverTheme?: ProfileCoverTheme;
    brandTitle?: string;
    email?: string;
  }) =>
    requestJson<{ ok: boolean; profile: UserProfile }>('/api/account/profile', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  resetAccountProfile: () =>
    requestJson<{ ok: boolean; profile: UserProfile }>('/api/account/profile/reset', {
      method: 'POST',
    }),

  addCustomField: (payload: {
    label: string;
    value: string;
    category: ProfileCustomField['category'];
  }) =>
    requestJson<{ ok: boolean; field: ProfileCustomField; profile: UserProfile }>(
      '/api/account/custom-fields',
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  updateCustomField: (
    id: string,
    payload: Partial<Pick<ProfileCustomField, 'label' | 'value' | 'category'>>,
  ) =>
    requestJson<{ ok: boolean; field: ProfileCustomField; profile: UserProfile }>(
      `/api/account/custom-fields/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(payload) },
    ),

  deleteCustomField: (id: string) =>
    requestJson<{ ok: boolean; profile: UserProfile }>(
      `/api/account/custom-fields/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    ),

  addSocialLink: (payload: { platform: string; handle: string; url: string }) =>
    requestJson<{ ok: boolean; link: ProfileSocialLink; profile: UserProfile }>(
      '/api/account/social-links',
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  updateSocialLink: (
    id: string,
    payload: Partial<Pick<ProfileSocialLink, 'platform' | 'handle' | 'url'>>,
  ) =>
    requestJson<{ ok: boolean; link: ProfileSocialLink; profile: UserProfile }>(
      `/api/account/social-links/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(payload) },
    ),

  deleteSocialLink: (id: string) =>
    requestJson<{ ok: boolean; profile: UserProfile }>(
      `/api/account/social-links/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    ),

  addSkill: (skill: string) =>
    requestJson<{ ok: boolean; profile: UserProfile }>('/api/account/skills', {
      method: 'POST',
      body: JSON.stringify({ skill }),
    }),

  deleteSkill: (index: number) =>
    requestJson<{ ok: boolean; profile: UserProfile }>(`/api/account/skills/${index}`, {
      method: 'DELETE',
    }),

  saveAccountNotifications: (prefs: Partial<UserProfile['prefs']>) =>
    requestJson<{ ok: boolean; profile: UserProfile }>('/api/account/notifications', {
      method: 'POST',
      body: JSON.stringify(prefs),
    }),

  accountSessions: () =>
    requestJson<{ ok: boolean; sessions: SessionInfo[] }>('/api/account/sessions'),

  revokeOtherSessions: () =>
    requestJson<{ ok: boolean; revoked: number }>('/api/account/sessions/revoke-others', {
      method: 'POST',
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    requestJson<{ ok: boolean; message: string }>('/api/account/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  accountOrders: () =>
    requestJson<{ ok: boolean; orders: OrderRecord[] }>('/api/account/orders'),

  summary: () => requestJson<{ ok: boolean; summary: AdminSummary }>('/api/admin/summary'),

  // Electronic First Developer API v1
  efStatus: () => requestJson<ElectronicFirstStatus>('/api/admin/electronicfirst/status'),

  efPing: () =>
    requestJson<ElectronicFirstApiResult>('/api/admin/electronicfirst/ping', {
      method: 'POST',
    }),

  efBalance: () =>
    requestJson<ElectronicFirstApiResult>('/api/admin/electronicfirst/balance'),

  efPayouts: () =>
    requestJson<ElectronicFirstApiResult>('/api/admin/electronicfirst/payouts'),

  efConversions: () =>
    requestJson<ElectronicFirstApiResult>('/api/admin/electronicfirst/conversions'),

  adsenseStatus: () => requestJson<AdSenseStatus>('/api/admin/adsense/status'),

  adsenseAnalytics: (range: AdSenseRange, by: 'date' | 'domain' = 'date') =>
    requestJson<AdSenseAnalyticsResponse>(
      `/api/admin/adsense/analytics?range=${encodeURIComponent(range)}${
        by === 'domain' ? '&by=domain' : ''
      }`,
    ),

  // Google Service Accounts, GA4 Traffic & Search Console Management
  googleServiceAccounts: () =>
    requestJson<{ ok: boolean; accounts: GoogleServiceAccountSummary[]; activeId: string | null }>(
      '/api/admin/google/service-accounts',
    ),

  addGoogleServiceAccount: (payload: {
    label: string;
    serviceAccountJson: string;
    adsenseAccountId?: string;
    ga4PropertyId?: string;
    searchConsoleSite?: string;
    setActive?: boolean;
  }) =>
    requestJson<{ ok: boolean; account: GoogleServiceAccountSummary }>(
      '/api/admin/google/service-accounts',
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  updateGoogleServiceAccount: (
    id: string,
    payload: {
      label?: string;
      adsenseAccountId?: string;
      ga4PropertyId?: string;
      searchConsoleSite?: string;
      active?: boolean;
    },
  ) =>
    requestJson<{ ok: boolean; account: GoogleServiceAccountSummary }>(
      `/api/admin/google/service-accounts/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(payload) },
    ),

  deleteGoogleServiceAccount: (id: string) =>
    requestJson<{ ok: boolean }>(
      `/api/admin/google/service-accounts/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    ),

  probeGoogleServiceAccount: (id: string) =>
    requestJson<GoogleServiceProbeResponse>(
      `/api/admin/google/service-accounts/${encodeURIComponent(id)}/probe`,
      { method: 'POST' },
    ),

  googleTrafficAnalytics: (range: AdSenseRange = '7d') =>
    requestJson<GoogleTrafficReportResponse>(
      `/api/admin/google/traffic?range=${encodeURIComponent(range)}`,
    ),

  crmLeads: () =>
    requestJson<{ ok: boolean; stages: CrmStage[]; leads: CrmLead[] }>('/api/admin/crm/leads'),

  createLead: (payload: Partial<CrmLead>) =>
    requestJson<{ ok: boolean; lead: CrmLead }>('/api/admin/crm/leads', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateLead: (leadId: string, patch: Partial<CrmLead>) =>
    requestJson<{
      ok: boolean;
      lead: CrmLead;
      metaDispatch?: { ok: boolean; skipped?: boolean; status: string; message: string } | null;
    }>(`/api/admin/crm/leads/${encodeURIComponent(leadId)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  resendLeadMeta: (leadId: string) =>
    requestJson<{
      ok: boolean;
      lead: CrmLead;
      metaDispatch: { ok: boolean; skipped?: boolean; status: string; message: string };
    }>(`/api/admin/crm/leads/${encodeURIComponent(leadId)}/resend`, {
      method: 'POST',
    }),

  resendLeadTikTok: (leadId: string) =>
    requestJson<{
      ok: boolean;
      lead: CrmLead;
      tiktokDispatch: { ok: boolean; status: string; detail: string };
    }>(`/api/admin/crm/leads/${encodeURIComponent(leadId)}/resend-tiktok`, {
      method: 'POST',
    }),

  deleteLead: (leadId: string) =>
    requestJson<{ ok: boolean }>(`/api/admin/crm/leads/${encodeURIComponent(leadId)}`, {
      method: 'DELETE',
    }),

  orders: () => requestJson<{ ok: boolean; orders: OrderRecord[] }>('/api/admin/orders'),

  createOrder: (payload: {
    customerEmail: string;
    customerPhone?: string;
    channel: OrderRecord['channel'];
    paymentRef?: string;
    items: Array<{ sku: string; qty: number }>;
  }) =>
    requestJson<{ ok: boolean; order: OrderRecord }>('/api/admin/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  fulfillOrder: (orderId: string) =>
    requestJson<{
      ok: boolean;
      order: OrderRecord;
      metaCapi?: { status: string; detail: string };
    }>(`/api/admin/orders/${encodeURIComponent(orderId)}/fulfill`, { method: 'POST' }),

  deleteOrder: (orderId: string) =>
    requestJson<{ ok: boolean }>(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
      method: 'DELETE',
    }),

  catalog: (params: { q?: string; category?: string; stock?: string; limit?: number } = {}) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.category && params.category !== 'ALL') sp.set('category', params.category);
    if (params.stock && params.stock !== 'ALL') sp.set('stock', params.stock);
    if (params.limit) sp.set('limit', String(params.limit));
    const qs = sp.toString();
    return requestJson<{
      ok: boolean;
      total: number;
      filteredTotal: number;
      products: CatalogProduct[];
    }>(`/api/admin/catalog${qs ? `?${qs}` : ''}`);
  },

  createProduct: (payload: Partial<CatalogProduct>) =>
    requestJson<{ ok: boolean; product: CatalogProduct }>('/api/admin/catalog', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  importCatalogJson: (items: unknown[]) =>
    requestJson<{ ok: boolean; added: number; updated: number; total: number }>(
      '/api/admin/catalog/import',
      {
        method: 'POST',
        body: JSON.stringify({ items }),
      },
    ),

  updateProduct: (id: string, patch: Partial<CatalogProduct>) =>
    requestJson<{ ok: boolean; product: CatalogProduct }>(
      `/api/admin/catalog/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(patch),
      },
    ),

  deleteProduct: (id: string) =>
    requestJson<{ ok: boolean }>(`/api/admin/catalog/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Catalog sub-resources
  services: () => requestJson<{ ok: boolean; services: ServiceItem[] }>('/api/admin/catalog/services'),

  createService: (payload: Partial<ServiceItem>) =>
    requestJson<{ ok: boolean; service: ServiceItem }>('/api/admin/catalog/services', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteService: (id: string) =>
    requestJson<{ ok: boolean }>(`/api/admin/catalog/services/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  tvChannels: () =>
    requestJson<{ ok: boolean; channels: TvChannel[] }>('/api/admin/catalog/tv-channels'),

  createTvChannel: (payload: Partial<TvChannel>) =>
    requestJson<{ ok: boolean; channel: TvChannel }>('/api/admin/catalog/tv-channels', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateTvChannel: (id: string, patch: Partial<TvChannel>) =>
    requestJson<{ ok: boolean; channel: TvChannel }>(
      `/api/admin/catalog/tv-channels/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(patch),
      },
    ),

  deleteTvChannel: (id: string) =>
    requestJson<{ ok: boolean }>(`/api/admin/catalog/tv-channels/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  tvPlans: () => requestJson<{ ok: boolean; plans: TvPlan[] }>('/api/admin/catalog/tv-plans'),

  createTvPlan: (payload: Partial<TvPlan>) =>
    requestJson<{ ok: boolean; plan: TvPlan }>('/api/admin/catalog/tv-plans', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteTvPlan: (id: string) =>
    requestJson<{ ok: boolean }>(`/api/admin/catalog/tv-plans/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Customers & Allow-list
  customers: () =>
    requestJson<{ ok: boolean; customers: CustomerAccount[] }>('/api/admin/customers'),

  adminCreateCustomer: (payload: {
    displayName: string;
    email: string;
    phone?: string;
    provider?: 'Email' | 'Google';
    password?: string;
  }) =>
    requestJson<{ ok: boolean; customer: CustomerAccount }>('/api/admin/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminUpdateCustomer: (
    uid: string,
    payload: {
      displayName?: string;
      email?: string;
      phone?: string;
      provider?: 'Email' | 'Google';
    },
  ) =>
    requestJson<{ ok: boolean; customer: CustomerAccount }>(
      `/api/admin/customers/${encodeURIComponent(uid)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    ),

  adminDeleteCustomer: (uid: string) =>
    requestJson<{ ok: boolean; deletedUid: string }>(
      `/api/admin/customers/${encodeURIComponent(uid)}`,
      { method: 'DELETE' },
    ),

  adminResetCustomerPassword: (
    uid: string,
    payload: { mode: 'code' | 'direct'; newPassword?: string },
  ) =>
    requestJson<{
      ok: boolean;
      mode: 'code' | 'direct';
      email?: string;
      resetCode?: string;
      expiresAt?: string;
      message: string;
    }>(`/api/admin/customers/${encodeURIComponent(uid)}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  revokeCustomerSessions: (uid: string) =>
    requestJson<{ ok: boolean; customer: CustomerAccount }>(
      `/api/admin/customers/${encodeURIComponent(uid)}/revoke-sessions`,
      { method: 'POST' },
    ),

  allowlist: () =>
    requestJson<{ ok: boolean; allowlist: AllowlistEntry[] }>('/api/admin/allowlist'),

  addAllowlist: (email: string, role: AllowlistEntry['role']) =>
    requestJson<{ ok: boolean; entry: AllowlistEntry }>('/api/admin/allowlist', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  removeAllowlist: (email: string) =>
    requestJson<{ ok: boolean }>(`/api/admin/allowlist/${encodeURIComponent(email)}`, {
      method: 'DELETE',
    }),

  metaAnalytics: () => requestJson<MetaAnalyticsStatus>('/api/admin/meta/analytics'),

  metaTestEvent: (channel: 'whatsapp_crm' | 'website_capi') =>
    requestJson<{ ok: boolean; detail: string; error?: string }>('/api/admin/meta/test-event', {
      method: 'POST',
      body: JSON.stringify({ channel }),
    }),

  tiktokStatus: () => requestJson<TikTokStatus>('/api/admin/tiktok/status'),

  tiktokTestEvent: (channel: 'web' | 'crm' = 'web') =>
    requestJson<{ ok: boolean; status: string; channel?: string; detail: string }>('/api/admin/tiktok/test-event', {
      method: 'POST',
      body: JSON.stringify({ channel }),
    }),

  domains: () =>
    requestJson<{
      ok: boolean;
      publisherId: string;
      adsTxtLine: string;
      domains: DomainRecord[];
    }>('/api/admin/domains'),

  updateDomain: (domain: string, patch: Partial<DomainRecord>) =>
    requestJson<{ ok: boolean; domain: DomainRecord }>(
      `/api/admin/domains/${encodeURIComponent(domain)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(patch),
      },
    ),

  // Social & Ad Platform Connections (AdSense, Google Ads, GA4, Facebook, Instagram, Threads, TikTok)
  channels: () =>
    requestJson<{
      ok: boolean;
      callbackBaseUrl: string;
      channels: ChannelConnection[];
    }>('/api/admin/channels'),

  saveChannelProfile: (
    platform: ChannelPlatform,
    payload: {
      accountId?: string;
      secondaryId?: string;
      loginIdentifier?: string;
      notes?: string;
    },
  ) =>
    requestJson<{ ok: boolean; channel: ChannelConnection }>(
      `/api/admin/channels/${encodeURIComponent(platform)}/profile`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),

  getChannelOAuthUrl: (platform: ChannelPlatform, origin: string) =>
    requestJson<{ ok: boolean; url: string; redirectUri: string }>(
      `/api/admin/channels/${encodeURIComponent(platform)}/oauth/url?origin=${encodeURIComponent(origin)}`,
    ),

  verifyChannel: (platform: ChannelPlatform) =>
    requestJson<{ ok: boolean; detail: string; channel: ChannelConnection }>(
      `/api/admin/channels/${encodeURIComponent(platform)}/verify`,
      { method: 'POST' },
    ),

  disconnectChannel: (platform: ChannelPlatform) =>
    requestJson<{ ok: boolean; channel: ChannelConnection }>(
      `/api/admin/channels/${encodeURIComponent(platform)}/disconnect`,
      { method: 'POST' },
    ),
};
