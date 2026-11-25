import type {
  AllowlistEntry,
  CatalogProduct,
  ChannelPlatform,
  CrmLead,
  CustomerAccount,
  DomainRecord,
  MetaEventDispatchLog,
  OrderRecord,
  ProfileCoverTheme,
  ProfileCustomField,
  ProfileSocialLink,
  ServiceItem,
  TvChannel,
  TvPlan,
  UserProfile,
} from '../src/types/admin.ts';

export const USD_TO_PKR = 278.5;

export const catalogStore: CatalogProduct[] = [
  {
    id: 'prod-101',
    sku: 'PB-STM-ELDEN',
    name: 'Elden Ring Shadow of the Erdtree Edition (Global Key)',
    platform: 'PC / Steam',
    category: 'Games',
    priceUsd: 49.99,
    pricePkr: Math.round(49.99 * USD_TO_PKR),
    discountPct: 18,
    stockStatus: 'IN_STOCK',
    active: true,
    source: 'ElectronicFirst',
    updatedAt: '2026-11-24T14:20:00.000Z',
  },
  {
    id: 'prod-102',
    sku: 'PB-PSN-USD25',
    name: 'PlayStation Store Gift Card $25 (USA)',
    platform: 'PlayStation',
    category: 'Gift Cards',
    priceUsd: 24.49,
    pricePkr: Math.round(24.49 * USD_TO_PKR),
    discountPct: 2,
    stockStatus: 'IN_STOCK',
    active: true,
    source: 'ElectronicFirst',
    updatedAt: '2026-11-24T13:10:00.000Z',
  },
  {
    id: 'prod-103',
    sku: 'PB-XBX-GPU3M',
    name: 'Xbox Game Pass Ultimate 3 Months (Global)',
    platform: 'Xbox',
    category: 'Subscriptions',
    priceUsd: 28.9,
    pricePkr: Math.round(28.9 * USD_TO_PKR),
    discountPct: 24,
    stockStatus: 'IN_STOCK',
    active: true,
    source: 'ElectronicFirst',
    updatedAt: '2026-11-24T11:45:00.000Z',
  },
  {
    id: 'prod-104',
    sku: 'PB-STM-FC26',
    name: 'EA Sports FC 26 Standard Edition (PC Key)',
    platform: 'PC / Steam',
    category: 'Games',
    priceUsd: 42.5,
    pricePkr: Math.round(42.5 * USD_TO_PKR),
    discountPct: 30,
    stockStatus: 'IN_STOCK',
    active: true,
    source: 'ElectronicFirst',
    updatedAt: '2026-11-24T10:15:00.000Z',
  },
  {
    id: 'prod-105',
    sku: 'PB-TV-USA12M',
    name: 'PlayBeat Live HD Pass — USA & North America (12 Months)',
    platform: 'TV Plan',
    category: 'TV Plans',
    priceUsd: 19.99,
    pricePkr: Math.round(19.99 * USD_TO_PKR),
    discountPct: 15,
    stockStatus: 'IN_STOCK',
    active: true,
    source: 'Manual',
    updatedAt: '2026-11-23T19:00:00.000Z',
  },
  {
    id: 'prod-106',
    sku: 'PB-TV-CRICKET',
    name: 'PlayBeat Arena Cricket & Asian Channels Pass (6 Months)',
    platform: 'TV Plan',
    category: 'TV Plans',
    priceUsd: 11.99,
    pricePkr: Math.round(11.99 * USD_TO_PKR),
    discountPct: 10,
    stockStatus: 'IN_STOCK',
    active: true,
    source: 'Manual',
    updatedAt: '2026-11-23T16:40:00.000Z',
  },
  {
    id: 'prod-107',
    sku: 'PB-TV-MENA3M',
    name: 'PlayBeat Digital World — Arabic & MENA Sports (3 Months)',
    platform: 'TV Plan',
    category: 'TV Plans',
    priceUsd: 7.49,
    pricePkr: Math.round(7.49 * USD_TO_PKR),
    discountPct: 0,
    stockStatus: 'LOW_STOCK',
    active: true,
    source: 'Manual',
    updatedAt: '2026-11-23T12:12:00.000Z',
  },
  {
    id: 'prod-108',
    sku: 'PB-SW-WIN11P',
    name: 'Windows 11 Pro Retail Activation License',
    platform: 'Software',
    category: 'Subscriptions',
    priceUsd: 8.99,
    pricePkr: Math.round(8.99 * USD_TO_PKR),
    discountPct: 45,
    stockStatus: 'IN_STOCK',
    active: true,
    source: 'ElectronicFirst',
    updatedAt: '2026-11-22T20:05:00.000Z',
  },
  {
    id: 'prod-109',
    sku: 'PB-STM-W50',
    name: 'Steam Wallet Code $50 (Global USD)',
    platform: 'PC / Steam',
    category: 'Gift Cards',
    priceUsd: 49.5,
    pricePkr: Math.round(49.5 * USD_TO_PKR),
    discountPct: 1,
    stockStatus: 'LOW_STOCK',
    active: true,
    source: 'ElectronicFirst',
    updatedAt: '2026-11-22T15:30:00.000Z',
  },
  {
    id: 'prod-110',
    sku: 'PB-SRV-SETUP',
    name: 'Concierge Console Account & Region Setup Service',
    platform: 'Service',
    category: 'Services',
    priceUsd: 5.06,
    pricePkr: Math.round(5.06 * USD_TO_PKR),
    discountPct: 0,
    stockStatus: 'IN_STOCK',
    active: true,
    source: 'Manual',
    updatedAt: '2026-11-22T09:10:00.000Z',
  },
  {
    id: 'prod-111',
    sku: 'PB-NTD-ESHOP20',
    name: 'Nintendo eShop $20 Digital Code (US)',
    platform: 'Nintendo',
    category: 'Gift Cards',
    priceUsd: 19.75,
    pricePkr: Math.round(19.75 * USD_TO_PKR),
    discountPct: 0,
    stockStatus: 'OUT_OF_STOCK',
    active: false,
    source: 'ElectronicFirst',
    updatedAt: '2026-11-21T18:00:00.000Z',
  },
  {
    id: 'prod-112',
    sku: 'PB-STM-HD2',
    name: 'Helldivers 2 Super Citizen Edition (Steam)',
    platform: 'PC / Steam',
    category: 'Games',
    priceUsd: 38.49,
    pricePkr: Math.round(38.49 * USD_TO_PKR),
    discountPct: 20,
    stockStatus: 'IN_STOCK',
    active: true,
    source: 'ElectronicFirst',
    updatedAt: '2026-11-24T08:45:00.000Z',
  },
];

export const servicesStore: ServiceItem[] = [
  {
    id: 'srv-1',
    code: 'SRV-PSN-REG',
    name: 'PlayStation USA / Turkey Region Account Setup',
    turnaround: '15–30 mins',
    priceUsd: 5.06,
    pricePkr: Math.round(5.06 * USD_TO_PKR),
    active: true,
  },
  {
    id: 'srv-2',
    code: 'SRV-XBX-GPU',
    name: 'Xbox Game Pass Ultimate Conversion & Activation',
    turnaround: '20 mins',
    priceUsd: 6.5,
    pricePkr: Math.round(6.5 * USD_TO_PKR),
    active: true,
  },
  {
    id: 'srv-3',
    code: 'SRV-WIN-ACT',
    name: 'Windows 11 Pro / Office 365 Remote Activation Support',
    turnaround: '15 mins',
    priceUsd: 4.99,
    pricePkr: Math.round(4.99 * USD_TO_PKR),
    active: true,
  },
  {
    id: 'srv-4',
    code: 'SRV-CAFE-BULK',
    name: 'Gaming Cafe Steam / Valve Bulk Key Procurement',
    turnaround: 'Same day',
    priceUsd: 19.0,
    pricePkr: Math.round(19.0 * USD_TO_PKR),
    active: true,
  },
];

export const tvChannelsStore: TvChannel[] = [
  { id: 'ch-01', name: 'ESPN HD USA', category: 'Sports', region: 'USA / NA', domain: 'playbeat.live', status: 'ONLINE', active: true },
  { id: 'ch-02', name: 'Fox Sports 1', category: 'Sports', region: 'USA / NA', domain: 'playbeat.live', status: 'ONLINE', active: true },
  { id: 'ch-03', name: 'CNN International', category: 'News', region: 'USA / NA', domain: 'playbeat.live', status: 'ONLINE', active: true },
  { id: 'ch-04', name: 'NBC Sports', category: 'Sports', region: 'USA / NA', domain: 'playbeat.live', status: 'ONLINE', active: true },
  { id: 'ch-05', name: 'PTV Sports HD', category: 'Sports', region: 'South Asia', domain: 'playbeatarena.asia', status: 'ONLINE', active: true },
  { id: 'ch-06', name: 'A Sports Live Cricket', category: 'Sports', region: 'South Asia', domain: 'playbeatarena.asia', status: 'ONLINE', active: true },
  { id: 'ch-07', name: 'Geo Entertainment', category: 'Entertainment', region: 'South Asia', domain: 'playbeatarena.asia', status: 'ONLINE', active: true },
  { id: 'ch-08', name: 'ARY Digital HD', category: 'Entertainment', region: 'South Asia', domain: 'playbeatarena.asia', status: 'ONLINE', active: true },
  { id: 'ch-09', name: 'HUM TV Drama', category: 'Entertainment', region: 'South Asia', domain: 'playbeatarena.asia', status: 'ONLINE', active: true },
  { id: 'ch-10', name: 'Star Sports 1 Cricket', category: 'Sports', region: 'South Asia', domain: 'playbeatarena.online', status: 'ONLINE', active: true },
  { id: 'ch-11', name: 'beIN Sports 1 Arabic', category: 'Sports', region: 'Middle East', domain: 'playbeatdigital.world', status: 'ONLINE', active: true },
  { id: 'ch-12', name: 'MBC 1 HD', category: 'Entertainment', region: 'Middle East', domain: 'playbeatdigital.world', status: 'ONLINE', active: true },
  { id: 'ch-13', name: 'Al Jazeera Arabic', category: 'News', region: 'Middle East', domain: 'playbeatdigital.world', status: 'ONLINE', active: true },
  { id: 'ch-14', name: 'SSC Sports 1 KSA', category: 'Sports', region: 'Middle East', domain: 'playbeatdigital.world', status: 'DEGRADED', active: true },
  { id: 'ch-15', name: 'Sky Sports Main Event', category: 'Sports', region: 'Global', domain: 'playbeatarena.online', status: 'ONLINE', active: true },
  { id: 'ch-16', name: 'Bloomberg TV Live', category: 'News', region: 'Global', domain: 'playbeat.live', status: 'ONLINE', active: true },
];

export const tvPlansStore: TvPlan[] = [
  {
    id: 'plan-1',
    sku: 'PB-TV-USA12M',
    name: 'PlayBeat Live HD — USA & North America',
    durationMonths: 12,
    domains: ['playbeat.live'],
    priceUsd: 19.99,
    pricePkr: Math.round(19.99 * USD_TO_PKR),
    active: true,
  },
  {
    id: 'plan-2',
    sku: 'PB-TV-CRICKET',
    name: 'PlayBeat Arena Cricket & Asian Pass',
    durationMonths: 6,
    domains: ['playbeatarena.asia', 'playbeatarena.online'],
    priceUsd: 11.99,
    pricePkr: Math.round(11.99 * USD_TO_PKR),
    active: true,
  },
  {
    id: 'plan-3',
    sku: 'PB-TV-MENA3M',
    name: 'PlayBeat Digital World — Arabic & MENA Sports',
    durationMonths: 3,
    domains: ['playbeatdigital.world'],
    priceUsd: 7.49,
    pricePkr: Math.round(7.49 * USD_TO_PKR),
    active: true,
  },
];

export interface CustomerCredentialRecord {
  uid: string;
  salt: string;
  hash: string;
}

export interface PasswordResetRecord {
  uid: string;
  email: string;
  tokenHash: string;
  expiresAt: number;
  used: boolean;
}

export interface ProfileExtraData {
  username: string;
  firstName: string;
  lastName: string;
  title: string;
  department: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  website: string;
  bio: string;
  avatarUrl: string;
  coverTheme: ProfileCoverTheme;
  brandTitle: string;
  customFields: ProfileCustomField[];
  socialLinks: ProfileSocialLink[];
  skills: string[];
}

export function createDefaultOperatorProfile(): UserProfile {
  return {
    uid: 'admin_operator_01',
    role: 'admin',
    username: 'playbeat.admin',
    firstName: 'PlayBeat',
    lastName: 'Operator',
    displayName: 'PlayBeat Operator',
    email: 'playbeat575@gmail.com',
    phone: '+923001122334',
    title: 'Operations Director',
    department: 'Storefront, AdSense & CRM Operations',
    address: 'Blue Area, F-6 Commercial',
    city: 'Islamabad',
    country: 'Pakistan',
    postalCode: '44000',
    website: 'https://playbeat.digital',
    bio: 'Managing digital license fulfillment, five AdSense-monetized live TV & gaming properties, Electronic First affiliate feeds, and Meta WhatsApp CRM pipelines.',
    avatarUrl: '/src/assets/images/admin_avatar_1795614396198.jpg',
    coverTheme: 'argon-blue',
    brandTitle: 'PlayBeat Admin',
    customFields: [
      {
        id: 'cf-pub-id',
        label: 'AdSense Publisher ID',
        value: 'ca-pub-9777611286139666',
        category: 'Operations',
      },
      {
        id: 'cf-ef-ref',
        label: 'Electronic First Affiliate Ref',
        value: 'ywzhmdg',
        category: 'Billing',
      },
      {
        id: 'cf-support',
        label: 'Fulfillment Desk Hours',
        value: '09:00 – 23:00 PKT (Daily)',
        category: 'Contact',
      },
    ],
    socialLinks: [
      {
        id: 'sl-storefront',
        platform: 'Storefront',
        handle: 'playbeat.digital',
        url: 'https://playbeat.digital',
      },
      {
        id: 'sl-live',
        platform: 'Live TV Portal',
        handle: 'playbeat.live',
        url: 'https://playbeat.live',
      },
    ],
    skills: [
      'AdSense Management',
      'Meta Conversions API',
      'Key Fulfillment',
      'Cloudflare Workers',
    ],
    provider: 'Password',
    memberSince: '2026-11-01',
    prefs: {
      orderUpdates: true,
      productNews: false,
      securityAlerts: true,
    },
  };
}

export const operatorProfile: UserProfile = createDefaultOperatorProfile();

export const customerProfileExtras = new Map<string, ProfileExtraData>();
export const customerCredentials = new Map<string, CustomerCredentialRecord>();
export const passwordResetStore = new Map<string, PasswordResetRecord>();

export const customerStore: CustomerAccount[] = [
  {
    uid: 'uid_pb_8821',
    displayName: 'Hamza Raza',
    email: 'hamza.raza@example.com',
    phone: '+923001122334',
    provider: 'Google',
    memberSince: '2026-10-18',
    activeSessions: 2,
    prefs: { orderUpdates: true, productNews: false, securityAlerts: true },
    ordersCount: 1,
    totalSpentUsd: 8.99,
  },
  {
    uid: 'uid_pb_8740',
    displayName: 'Zainab Khan',
    email: 'zainab.khan@example.com',
    phone: '+923215566778',
    provider: 'Email',
    memberSince: '2026-11-04',
    activeSessions: 1,
    prefs: { orderUpdates: true, productNews: true, securityAlerts: true },
    ordersCount: 1,
    totalSpentUsd: 7.49,
  },
  {
    uid: 'uid_pb_8619',
    displayName: 'Bilal Ahmed',
    email: 'bilal.ahmed@example.com',
    phone: '+923339988776',
    provider: 'Google',
    memberSince: '2026-11-12',
    activeSessions: 1,
    prefs: { orderUpdates: true, productNews: false, securityAlerts: true },
    ordersCount: 1,
    totalSpentUsd: 5.06,
  },
];

export const allowlistStore: AllowlistEntry[] = [
  { email: 'playbeat575@gmail.com', role: 'Owner', addedAt: '2026-11-01T00:00:00.000Z' },
  { email: 'business@playbeat.digital', role: 'Admin', addedAt: '2026-11-10T00:00:00.000Z' },
];

export const orderStore: OrderRecord[] = [
  {
    id: 'PB-ORD-241103',
    customerEmail: 'hamza.raza@example.com',
    customerPhone: '923001122334',
    customerUid: 'uid_pb_8821',
    channel: 'JazzCash / EasyPaisa',
    paymentRef: 'JC-9048217',
    status: 'PAID_FULFILLED',
    totalUsd: 8.99,
    totalPkr: Math.round(8.99 * USD_TO_PKR),
    items: [
      {
        sku: 'PB-SW-WIN11P',
        name: 'Windows 11 Pro Retail Activation License',
        qty: 1,
        priceUsd: 8.99,
      },
    ],
    issuedKeys: ['WIN11P-89XK-4M2Q-9R7T-PLBT'],
    metaCapiStatus: 'not_configured',
    createdAt: '2026-11-24T09:14:00.000Z',
    fulfilledAt: '2026-11-24T09:18:00.000Z',
  },
  {
    id: 'PB-ORD-241102',
    customerEmail: 'zainab.khan@example.com',
    customerPhone: '923215566778',
    customerUid: 'uid_pb_8740',
    channel: 'WhatsApp',
    paymentRef: 'WA-772190',
    status: 'PAID_FULFILLED',
    totalUsd: 7.49,
    totalPkr: Math.round(7.49 * USD_TO_PKR),
    items: [
      {
        sku: 'PB-TV-MENA3M',
        name: 'PlayBeat Digital World — Arabic & MENA Sports (3 Months)',
        qty: 1,
        priceUsd: 7.49,
      },
    ],
    issuedKeys: ['PBMENA-3M-5521-Q8LZ'],
    metaCapiStatus: 'not_configured',
    createdAt: '2026-11-23T17:42:00.000Z',
    fulfilledAt: '2026-11-23T17:50:00.000Z',
  },
  {
    id: 'PB-ORD-241101',
    customerEmail: 'bilal.ahmed@example.com',
    customerPhone: '923339988776',
    customerUid: 'uid_pb_8619',
    channel: 'PayPal',
    paymentRef: 'PP-34918276AB',
    status: 'PAID_FULFILLED',
    totalUsd: 5.06,
    totalPkr: Math.round(5.06 * USD_TO_PKR),
    items: [
      {
        sku: 'PB-SRV-SETUP',
        name: 'Concierge Console Account & Region Setup Service',
        qty: 1,
        priceUsd: 5.06,
      },
    ],
    issuedKeys: ['PBSRV-CONCIERGE-241101'],
    metaCapiStatus: 'not_configured',
    createdAt: '2026-11-22T21:05:00.000Z',
    fulfilledAt: '2026-11-22T21:19:00.000Z',
  },
];

export const leadStore: CrmLead[] = [
  {
    leadId: 'PB-L-0001',
    businessName: 'Karachi Esports Lounge',
    contactName: 'Tariq Mahmood',
    email: 'tariq@karachiesports.pk',
    phone: '+923004455667',
    ctwaClid: 'ctwa_demo_991042',
    expectedValueUsd: 420,
    source: 'WhatsApp',
    status: 'Qualified',
    score: 82,
    notes: 'Interested in monthly bulk Steam Wallet + Xbox Game Pass codes for 24 stations.',
    createdAt: '2026-11-22T10:00:00.000Z',
    updatedAt: '2026-11-24T08:30:00.000Z',
    metaLastEvent: 'Lead',
    metaSyncStatus: 'not_configured',
    metaLastMessage: 'Configure META_WA_DATASET_ID and META_ACCESS_TOKEN in server environment to dispatch.',
  },
  {
    leadId: 'PB-L-0002',
    businessName: 'Gulf Stream Media Resellers',
    contactName: 'Omar Al-Farsi',
    email: 'omar@gulfstreammedia.ae',
    phone: '+971502233445',
    expectedValueUsd: 650,
    source: 'WhatsApp',
    status: 'Replied',
    score: 68,
    notes: 'Requested wholesale pricing for PlayBeat Digital World MENA passes.',
    createdAt: '2026-11-23T11:20:00.000Z',
    updatedAt: '2026-11-24T07:15:00.000Z',
    metaLastEvent: null,
    metaSyncStatus: 'skipped',
  },
  {
    leadId: 'PB-L-0003',
    businessName: 'Lahore PC Builders Collective',
    contactName: 'Usman Siddiqui',
    email: 'usman@lhrpc.pk',
    phone: '+923217788990',
    expectedValueUsd: 290,
    source: 'Facebook',
    status: 'Contacted',
    score: 54,
    notes: 'Bundle inquiry for Windows 11 Pro keys with custom gaming rigs.',
    createdAt: '2026-11-23T15:05:00.000Z',
    updatedAt: '2026-11-23T18:00:00.000Z',
    metaLastEvent: null,
    metaSyncStatus: 'skipped',
  },
  {
    leadId: 'PB-L-0004',
    businessName: 'Arena Cafe Islamabad',
    contactName: 'Saad Qureshi',
    email: 'saad@arenacafe.pk',
    phone: '+923331144552',
    expectedValueUsd: 185,
    source: 'Storefront',
    status: 'Won',
    score: 95,
    notes: 'Closed initial 15-license pack; recurring monthly renewal expected.',
    createdAt: '2026-11-20T09:00:00.000Z',
    updatedAt: '2026-11-24T06:40:00.000Z',
    metaLastEvent: 'Purchase',
    metaSyncStatus: 'not_configured',
    metaLastMessage: 'Set META_WA_DATASET_ID & META_ACCESS_TOKEN to send Purchase conversion.',
  },
];

export const domainStore: DomainRecord[] = [
  {
    domain: 'playbeat.digital',
    siteRole: 'Primary Digital Storefront & Checkout (worker: playbeat-digital)',
    hosting: 'Cloudflare Worker (this account)',
    inCloudflareAccount: true,
    adsTxtOk: true,
    adsByGoogleOk: true,
    privacyOk: true,
    termsOk: true,
    autoAdsNote: 'Auto ads script loaded; confirm Auto ads is enabled in AdSense Console.',
    contactEmail: 'playbeattv_admin@proton.me',
  },
  {
    domain: 'playbeat.live',
    siteRole: 'Free USA / North America Live TV (worker: playbeat-live-edge)',
    hosting: 'Cloudflare Worker (this account)',
    inCloudflareAccount: true,
    adsTxtOk: true,
    adsByGoogleOk: true,
    privacyOk: true,
    termsOk: true,
    autoAdsNote: '/privacy and /terms deployed 2026-11-24; confirm Ready state in AdSense Sites.',
    contactEmail: 'playbeattv_admin@proton.me',
  },
  {
    domain: 'playbeatarena.asia',
    siteRole: 'Live Cricket, Pakistani & Indian Dramas / Asian TV',
    hosting: 'External Cloudflare zone (serves via www.)',
    inCloudflareAccount: false,
    adsTxtOk: true,
    adsByGoogleOk: true,
    privacyOk: false,
    termsOk: false,
    autoAdsNote: 'Relies on Auto ads only; no manual ad slots.',
    actionRequired:
      'Deploy prepared privacy-playbeatarena-asia.html & terms-playbeatarena-asia.html or migrate zone to this Cloudflare account.',
    contactEmail: 'playbeattv_admin@proton.me',
  },
  {
    domain: 'playbeatdigital.world',
    siteRole: 'Free Arabic & Middle East Live TV',
    hosting: 'External Cloudflare zone (serves via www.)',
    inCloudflareAccount: false,
    adsTxtOk: true,
    adsByGoogleOk: true,
    privacyOk: false,
    termsOk: false,
    autoAdsNote: 'Relies on Auto ads only; no manual ad slots.',
    actionRequired:
      'Deploy prepared privacy-playbeatdigital-world.html & terms-playbeatdigital-world.html or migrate zone to this Cloudflare account.',
    contactEmail: 'playbeattv_admin@proton.me',
  },
  {
    domain: 'playbeatarena.online',
    siteRole: 'Live Sports & Arena Mirror Portal',
    hosting: 'External edge host',
    inCloudflareAccount: false,
    adsTxtOk: true,
    adsByGoogleOk: true,
    privacyOk: true,
    termsOk: true,
    autoAdsNote: 'ads.txt and adsbygoogle.js verified; confirm site Ready status in AdSense.',
    contactEmail: 'playbeattv_admin@proton.me',
  },
];

export const metaDispatchLogs: MetaEventDispatchLog[] = [];

export function pushMetaLog(entry: MetaEventDispatchLog) {
  metaDispatchLogs.unshift(entry);
  if (metaDispatchLogs.length > 50) {
    metaDispatchLogs.length = 50;
  }
}

export interface StoredChannelProfile {
  platform: ChannelPlatform;
  accountId: string;
  secondaryId: string;
  loginIdentifier: string;
  notes: string;
  connectedEmail?: string;
  connectedAt?: string;
  lastVerifiedAt?: string;
  lastVerifyDetail?: string;
}

export interface StoredChannelOAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  connectedAt: string;
}

export const channelProfilesStore: Record<ChannelPlatform, StoredChannelProfile> = {
  google_adsense: {
    platform: 'google_adsense',
    accountId: process.env.ADSENSE_ACCOUNT?.trim() || 'accounts/pub-9777611286139666',
    secondaryId: 'ca-pub-9777611286139666',
    loginIdentifier: 'playbeat575@gmail.com',
    notes: 'Primary AdSense publisher covering all 5 PlayBeat domains.',
  },
  google_ads: {
    platform: 'google_ads',
    accountId: '',
    secondaryId: '',
    loginIdentifier: 'playbeat575@gmail.com',
    notes: 'Search & Shopping acquisition campaigns for playbeat.digital.',
  },
  google_analytics: {
    platform: 'google_analytics',
    accountId: '',
    secondaryId: '',
    loginIdentifier: 'playbeat575@gmail.com',
    notes: 'GA4 property tracking storefront conversions & live TV traffic.',
  },
  facebook: {
    platform: 'facebook',
    accountId: process.env.META_DATASET_ID?.trim() || '',
    secondaryId: process.env.META_WA_DATASET_ID?.trim() || '',
    loginIdentifier: 'business@playbeat.digital',
    notes: 'Meta Business Manager, Conversions API & WhatsApp Lead/Purchase sharing.',
  },
  instagram: {
    platform: 'instagram',
    accountId: '',
    secondaryId: '',
    loginIdentifier: '@playbeat.digital',
    notes: 'Instagram Business profile linked via Meta Graph OAuth.',
  },
  threads: {
    platform: 'threads',
    accountId: '',
    secondaryId: '',
    loginIdentifier: '@playbeat.digital',
    notes: 'Threads creator/brand profile via Meta Threads API.',
  },
  tiktok: {
    platform: 'tiktok',
    accountId: process.env.TIKTOK_PIXEL_ID?.trim() || '',
    secondaryId: '',
    loginIdentifier: '@playbeat.digital',
    notes: 'TikTok for Business Ads & Events API pixel reporting.',
  },
};

// Kept strictly in server memory; never serialized in API responses
export const channelOAuthTokens = new Map<ChannelPlatform, StoredChannelOAuthToken>();

