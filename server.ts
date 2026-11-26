import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import {
  CRM_STAGES,
  type AccountRole,
  type AdminSummary,
  type AllowlistEntry,
  type CatalogProduct,
  type CrmLead,
  type CrmStage,
  type CustomerAccount,
  type OrderItem,
  type OrderRecord,
  type ProfileCoverTheme,
  type ProfileCustomField,
  type ProfileSocialLink,
  type ServiceItem,
  type SessionInfo,
  type TvChannel,
  type TvPlan,
  type UserProfile,
} from './src/types/admin.ts';
import {
  USD_TO_PKR,
  allowlistStore,
  catalogStore,
  channelOAuthTokens,
  channelProfilesStore,
  createDefaultOperatorProfile,
  customerCredentials,
  customerProfileExtras,
  customerStore,
  domainStore,
  leadStore,
  metaDispatchLogs,
  operatorProfile,
  orderStore,
  passwordResetStore,
  servicesStore,
  tvChannelsStore,
  tvPlansStore,
  type ProfileExtraData,
} from './server/store.ts';
import {
  buildChannelOAuthUrl,
  callElectronicFirstApi,
  dispatchMetaTestEvent,
  dispatchTikTokEvent,
  exchangeChannelOAuthCode,
  fetchAdSenseAnalytics,
  getAdSenseConfigStatus,
  getAllChannelConnections,
  getChannelCallbackBaseUrl,
  getChannelConnectionPayload,
  getElectronicFirstStatus,
  getMetaStatusPayload,
  isValidChannelPlatform,
  isValidUpstreamWorkerUrl,
  reportCrmStageToMeta,
  sendMetaOrderPurchase,
  verifyChannelConnection,
} from './server/integrations.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

interface SessionRecord {
  id: string;
  token: string;
  uid: string;
  role: AccountRole;
  userAgent: string;
  createdAt: number;
  expiresAt: number;
}

interface AuthenticatedRequest extends Request {
  session?: SessionRecord;
}

const sessions = new Map<string, SessionRecord>();

// Claimed first-run password hash when process.env.ADMIN_PASSWORD is not configured
let claimedAdminCredential: { salt: string; hash: string } | null = null;

// Sliding window IP rate limiter for login, register, reset & setup
const authAttempts = new Map<string, number[]>();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_AUTH_ATTEMPTS = 20;

function checkRateLimit(req: Request): boolean {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const list = (authAttempts.get(key) || []).filter((ts) => now - ts < RATE_WINDOW_MS);
  if (list.length >= MAX_AUTH_ATTEMPTS) {
    authAttempts.set(key, list);
    return false;
  }
  list.push(now);
  authAttempts.set(key, list);
  return true;
}

function hashWithSalt(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeEqualStrings(a: string, b: string): boolean {
  const digestA = crypto.createHash('sha256').update(a).digest();
  const digestB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

function createSession(uid: string, role: AccountRole, req: Request): SessionRecord {
  const token = crypto.randomBytes(24).toString('hex');
  const id = `sess_${crypto.randomBytes(6).toString('hex')}`;
  const now = Date.now();
  const userAgent = String(req.headers['user-agent'] || 'Web Browser').slice(0, 120);
  const record: SessionRecord = {
    id,
    token,
    uid,
    role,
    userAgent,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
  sessions.set(token, record);
  if (role === 'customer') {
    const cust = customerStore.find((c) => c.uid === uid);
    if (cust) cust.activeSessions = countActiveSessionsForUid(uid);
  }
  return record;
}

function countActiveSessionsForUid(uid: string): number {
  const now = Date.now();
  let count = 0;
  for (const [tok, sess] of sessions.entries()) {
    if (sess.expiresAt < now) {
      sessions.delete(tok);
      continue;
    }
    if (sess.uid === uid) count += 1;
  }
  return count;
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
    return;
  }
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) sessions.delete(token);
    res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
    return;
  }
  req.session = session;
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.session?.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'FORBIDDEN' });
      return;
    }
    next();
  });
}

const ALLOWED_COVER_THEMES: ProfileCoverTheme[] = [
  'argon-blue',
  'argon-ocean',
  'argon-emerald',
  'argon-sunset',
  'argon-slate',
];

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

function getOrCreateCustomerExtras(customer: CustomerAccount): ProfileExtraData {
  let extras = customerProfileExtras.get(customer.uid);
  if (!extras) {
    const parts = customer.displayName.trim().split(/\s+/);
    extras = {
      username: customer.email.split('@')[0] || customer.uid,
      firstName: parts[0] || customer.displayName,
      lastName: parts.slice(1).join(' '),
      title: 'Storefront Member',
      department: 'PlayBeat Customer',
      address: '',
      city: '',
      country: '',
      postalCode: '',
      website: '',
      bio: '',
      avatarUrl: '',
      coverTheme: 'argon-blue',
      brandTitle: 'PlayBeat Account',
      customFields: [],
      socialLinks: [],
      skills: [],
    };
    customerProfileExtras.set(customer.uid, extras);
  }
  return extras;
}

function getProfileForSession(session: SessionRecord): UserProfile | null {
  if (session.role === 'admin') {
    return {
      ...operatorProfile,
      customFields: operatorProfile.customFields.map((f) => ({ ...f })),
      socialLinks: operatorProfile.socialLinks.map((l) => ({ ...l })),
      skills: [...operatorProfile.skills],
      prefs: { ...operatorProfile.prefs },
    };
  }
  const customer = customerStore.find((c) => c.uid === session.uid);
  if (!customer) return null;
  const extras = getOrCreateCustomerExtras(customer);
  return {
    uid: customer.uid,
    role: 'customer',
    username: extras.username,
    firstName: extras.firstName,
    lastName: extras.lastName,
    displayName: customer.displayName,
    email: customer.email,
    phone: customer.phone || '',
    title: extras.title,
    department: extras.department,
    address: extras.address,
    city: extras.city,
    country: extras.country,
    postalCode: extras.postalCode,
    website: extras.website,
    bio: extras.bio,
    avatarUrl: extras.avatarUrl,
    coverTheme: extras.coverTheme,
    brandTitle: extras.brandTitle,
    customFields: extras.customFields.map((f) => ({ ...f })),
    socialLinks: extras.socialLinks.map((l) => ({ ...l })),
    skills: [...extras.skills],
    provider: customer.provider,
    memberSince: customer.memberSince,
    prefs: { ...customer.prefs },
  };
}

function generateLicenseKey(sku: string): string {
  const prefix = sku.replace(/[^A-Z0-9]/gi, '').slice(0, 6).toUpperCase() || 'PBKEY';
  const block = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${block()}-${block()}-${block()}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Public health endpoint (matches worker.js GET /api/health)
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      time: new Date().toISOString(),
      service: 'playbeat-admin-console',
      endpoints: [
        'GET /api/health',
        'POST /api/admin/login',
        'GET /api/admin/catalog',
        'POST /api/admin/catalog/import',
        'GET /api/admin/adsense/analytics',
        'GET /api/admin/adsense/status',
        'GET /api/admin/tiktok/status',
        'GET /api/admin/meta/analytics',
        'GET|POST /api/admin/crm/leads',
        'PATCH|DELETE /api/admin/crm/leads/:id',
        'GET|POST /api/admin/orders',
        'POST /api/admin/orders/:id/fulfill',
        'POST /api/admin/electronicfirst/ping',
        'GET /api/admin/electronicfirst/{balance,payouts,conversions}',
        'GET /api/admin/customers',
        'GET|POST|DELETE /api/admin/allowlist',
      ],
    });
  });

  // Auth status endpoint so client knows whether first-run password claim is needed
  app.get('/api/admin/auth-status', (_req, res) => {
    const envPassword = process.env.ADMIN_PASSWORD?.trim();
    const mode = envPassword
      ? 'env'
      : claimedAdminCredential
        ? 'claimed'
        : 'setup_required';
    res.json({
      ok: true,
      mode,
      upstreamConfigured: isValidUpstreamWorkerUrl(process.env.PLAYBEAT_WORKER_URL?.trim()),
    });
  });

  // One-time bootstrap route when ADMIN_PASSWORD env var is unset
  app.post('/api/admin/setup', (req, res) => {
    if (!checkRateLimit(req)) {
      res.status(429).json({ ok: false, error: 'RATE_LIMITED' });
      return;
    }
    if (process.env.ADMIN_PASSWORD?.trim() || claimedAdminCredential) {
      res.status(409).json({ ok: false, error: 'ALREADY_CONFIGURED' });
      return;
    }
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({
        ok: false,
        error: 'PASSWORD_POLICY',
        message: 'Password must be between 8 and 128 characters.',
      });
      return;
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashWithSalt(password, salt);
    claimedAdminCredential = { salt, hash };

    const session = createSession(operatorProfile.uid, 'admin', req);
    res.status(201).json({
      ok: true,
      token: session.token,
      role: 'admin' as AccountRole,
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
  });

  // Matches worker.js POST /api/admin/login
  app.post('/api/admin/login', (req, res) => {
    if (!checkRateLimit(req)) {
      res.status(429).json({ ok: false, error: 'RATE_LIMITED' });
      return;
    }
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const envPassword = process.env.ADMIN_PASSWORD?.trim();

    let valid = false;
    if (envPassword) {
      valid = safeEqualStrings(password, envPassword);
    } else if (claimedAdminCredential) {
      const candidateHash = hashWithSalt(password, claimedAdminCredential.salt);
      valid = safeEqualStrings(candidateHash, claimedAdminCredential.hash);
    } else {
      res.status(409).json({
        ok: false,
        error: 'SETUP_REQUIRED',
        message: 'Claim your admin password first or configure ADMIN_PASSWORD in Secrets.',
      });
      return;
    }

    if (!valid) {
      res.status(401).json({ ok: false, error: 'ADMIN_BAD_PASSWORD' });
      return;
    }

    const session = createSession(operatorProfile.uid, 'admin', req);
    res.json({
      ok: true,
      token: session.token,
      role: 'admin' as AccountRole,
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
  });

  // Public Customer Account Opening (strictly locked to role: 'customer')
  app.post('/api/auth/register', (req, res) => {
    if (!checkRateLimit(req)) {
      res.status(429).json({ ok: false, error: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' });
      return;
    }
    const b = req.body || {};
    const displayName = String(b.displayName || '').trim().slice(0, 80);
    const email = String(b.email || '').trim().toLowerCase();
    const phone = String(b.phone || '').trim().slice(0, 32);
    const password = typeof b.password === 'string' ? b.password : '';

    if (!displayName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ ok: false, message: 'Valid display name and email address are required.' });
      return;
    }
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ ok: false, message: 'Password must be between 8 and 128 characters.' });
      return;
    }
    if (
      customerStore.some((c) => c.email.toLowerCase() === email) ||
      operatorProfile.email.toLowerCase() === email
    ) {
      res.status(409).json({ ok: false, message: 'An account with this email already exists.' });
      return;
    }

    const uid = `uid_pb_${crypto.randomBytes(4).toString('hex')}`;
    const account: CustomerAccount = {
      uid,
      displayName,
      email,
      phone: phone || undefined,
      provider: 'Email',
      memberSince: new Date().toISOString().slice(0, 10),
      activeSessions: 1,
      prefs: { orderUpdates: true, productNews: false, securityAlerts: true },
      ordersCount: 0,
      totalSpentUsd: 0,
    };
    customerStore.unshift(account);

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashWithSalt(password, salt);
    customerCredentials.set(uid, { uid, salt, hash });

    const session = createSession(uid, 'customer', req);
    res.status(201).json({
      ok: true,
      token: session.token,
      role: 'customer' as AccountRole,
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
  });

  // Public Customer Account ID / Email + Password Sign-In
  app.post('/api/auth/login', (req, res) => {
    if (!checkRateLimit(req)) {
      res.status(429).json({ ok: false, error: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' });
      return;
    }
    const identifier = String(req.body?.email || req.body?.accountId || '').trim().toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!identifier || !password) {
      res.status(400).json({ ok: false, message: 'Account ID or email and password are required.' });
      return;
    }

    const customer = customerStore.find(
      (c) => c.email.toLowerCase() === identifier || c.uid.toLowerCase() === identifier,
    );
    const cred = customer ? customerCredentials.get(customer.uid) : undefined;
    if (!customer || !cred) {
      res.status(401).json({ ok: false, message: 'Invalid account credentials.' });
      return;
    }

    const candidateHash = hashWithSalt(password, cred.salt);
    if (!safeEqualStrings(candidateHash, cred.hash)) {
      res.status(401).json({ ok: false, message: 'Invalid account credentials.' });
      return;
    }

    const session = createSession(customer.uid, 'customer', req);
    res.json({
      ok: true,
      token: session.token,
      role: 'customer' as AccountRole,
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
  });

  // Public Password Reset Request (never leaks token in response)
  app.post('/api/auth/forgot-password', (req, res) => {
    if (!checkRateLimit(req)) {
      res.status(429).json({ ok: false, message: 'Too many reset requests. Try again later.' });
      return;
    }
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ ok: false, message: 'Enter a valid account email address.' });
      return;
    }
    const customer = customerStore.find((c) => c.email.toLowerCase() === email);
    if (customer) {
      const code = `PB-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      passwordResetStore.set(email, {
        uid: customer.uid,
        email,
        tokenHash: sha256Hex(code),
        expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
        used: false,
      });
    }
    res.json({
      ok: true,
      message:
        'If an account exists for that email, a reset request has been logged. Obtain your one-time 30-minute reset code from an administrator and enter it below.',
    });
  });

  // Public Password Reset Redemption
  app.post('/api/auth/reset-password', (req, res) => {
    if (!checkRateLimit(req)) {
      res.status(429).json({ ok: false, message: 'Too many attempts. Try again later.' });
      return;
    }
    const email = String(req.body?.email || '').trim().toLowerCase();
    const resetCode = String(req.body?.resetCode || '').trim();
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!email || !resetCode) {
      res.status(400).json({ ok: false, message: 'Email and one-time reset code are required.' });
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      res.status(400).json({ ok: false, message: 'New password must be between 8 and 128 characters.' });
      return;
    }

    const record = passwordResetStore.get(email);
    if (!record || record.used || record.expiresAt < Date.now()) {
      res.status(400).json({ ok: false, message: 'Reset code is invalid or expired.' });
      return;
    }
    if (!safeEqualStrings(sha256Hex(resetCode), record.tokenHash)) {
      res.status(400).json({ ok: false, message: 'Reset code is invalid or expired.' });
      return;
    }

    record.used = true;
    passwordResetStore.delete(email);

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashWithSalt(newPassword, salt);
    customerCredentials.set(record.uid, { uid: record.uid, salt, hash });

    // Revoke all existing sessions for that customer
    for (const [tok, sess] of sessions.entries()) {
      if (sess.uid === record.uid) sessions.delete(tok);
    }
    const cust = customerStore.find((c) => c.uid === record.uid);
    if (cust) cust.activeSessions = 0;

    res.json({
      ok: true,
      message: 'Password updated and previous sessions signed out. You can now sign in.',
    });
  });

  app.post('/api/admin/logout', requireAuth, (req: AuthenticatedRequest, res) => {
    const token = getBearerToken(req);
    const uid = req.session?.uid;
    const role = req.session?.role;
    if (token) sessions.delete(token);
    if (uid && role === 'customer') {
      const cust = customerStore.find((c) => c.uid === uid);
      if (cust) cust.activeSessions = countActiveSessionsForUid(uid);
    }
    res.json({ ok: true });
  });

  // Authenticated Account Profile, Notifications, Sessions & Password Change Routes
  app.get('/api/account/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const profile = req.session ? getProfileForSession(req.session) : null;
    if (!profile) {
      res.status(404).json({ ok: false, error: 'PROFILE_NOT_FOUND' });
      return;
    }
    res.json({ ok: true, profile });
  });

  app.post('/api/account/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const b = req.body || {};
    const displayName = String(b.displayName || '').trim().slice(0, 80);
    const username = typeof b.username === 'string' ? b.username.trim().slice(0, 48) : undefined;
    const firstName = typeof b.firstName === 'string' ? b.firstName.trim().slice(0, 48) : undefined;
    const lastName = typeof b.lastName === 'string' ? b.lastName.trim().slice(0, 48) : undefined;
    const phone = typeof b.phone === 'string' ? b.phone.trim().slice(0, 32) : undefined;
    const title = typeof b.title === 'string' ? b.title.trim().slice(0, 64) : undefined;
    const department = typeof b.department === 'string' ? b.department.trim().slice(0, 80) : undefined;
    const address = typeof b.address === 'string' ? b.address.trim().slice(0, 120) : undefined;
    const city = typeof b.city === 'string' ? b.city.trim().slice(0, 60) : undefined;
    const country = typeof b.country === 'string' ? b.country.trim().slice(0, 60) : undefined;
    const postalCode = typeof b.postalCode === 'string' ? b.postalCode.trim().slice(0, 20) : undefined;
    const website = typeof b.website === 'string' ? b.website.trim().slice(0, 160) : undefined;
    const bio = typeof b.bio === 'string' ? b.bio.trim().slice(0, 500) : undefined;
    const avatarUrl = typeof b.avatarUrl === 'string' ? b.avatarUrl.trim() : undefined;
    const brandTitle = typeof b.brandTitle === 'string' ? b.brandTitle.trim().slice(0, 40) : undefined;
    const coverTheme = ALLOWED_COVER_THEMES.includes(b.coverTheme)
      ? (b.coverTheme as ProfileCoverTheme)
      : undefined;
    const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';

    if (!displayName) {
      res.status(400).json({ ok: false, message: 'Display name is required.' });
      return;
    }
    if (website !== undefined && website !== '' && !isSafeHttpUrl(website)) {
      res.status(400).json({ ok: false, message: 'Website must start with https:// or http://.' });
      return;
    }
    if (avatarUrl !== undefined && !isSafeAvatarUrl(avatarUrl)) {
      res.status(400).json({ ok: false, message: 'Avatar must be a valid image upload or https:// URL.' });
      return;
    }

    if (session.role === 'admin') {
      operatorProfile.displayName = displayName;
      if (username !== undefined) operatorProfile.username = username || 'playbeat.admin';
      if (firstName !== undefined) operatorProfile.firstName = firstName;
      if (lastName !== undefined) operatorProfile.lastName = lastName;
      if (phone !== undefined) operatorProfile.phone = phone;
      if (title !== undefined) operatorProfile.title = title;
      if (department !== undefined) operatorProfile.department = department;
      if (address !== undefined) operatorProfile.address = address;
      if (city !== undefined) operatorProfile.city = city;
      if (country !== undefined) operatorProfile.country = country;
      if (postalCode !== undefined) operatorProfile.postalCode = postalCode;
      if (website !== undefined) operatorProfile.website = website;
      if (bio !== undefined) operatorProfile.bio = bio;
      if (avatarUrl !== undefined) operatorProfile.avatarUrl = avatarUrl;
      if (coverTheme) operatorProfile.coverTheme = coverTheme;
      if (brandTitle !== undefined) operatorProfile.brandTitle = brandTitle || 'PlayBeat Admin';
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        operatorProfile.email = email;
      }
      res.json({ ok: true, profile: getProfileForSession(session) });
      return;
    }

    const cust = customerStore.find((c) => c.uid === session.uid);
    if (!cust) {
      res.status(404).json({ ok: false, message: 'Account not found.' });
      return;
    }
    cust.displayName = displayName;
    if (phone !== undefined) cust.phone = phone || undefined;
    const extras = getOrCreateCustomerExtras(cust);
    if (username !== undefined) extras.username = username || extras.username;
    if (firstName !== undefined) extras.firstName = firstName;
    if (lastName !== undefined) extras.lastName = lastName;
    if (title !== undefined) extras.title = title;
    if (department !== undefined) extras.department = department;
    if (address !== undefined) extras.address = address;
    if (city !== undefined) extras.city = city;
    if (country !== undefined) extras.country = country;
    if (postalCode !== undefined) extras.postalCode = postalCode;
    if (website !== undefined) extras.website = website;
    if (bio !== undefined) extras.bio = bio;
    if (avatarUrl !== undefined) extras.avatarUrl = avatarUrl;
    if (coverTheme) extras.coverTheme = coverTheme;
    res.json({ ok: true, profile: getProfileForSession(session) });
  });

  app.post('/api/account/profile/reset', requireAuth, (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    if (session.role === 'admin') {
      const defaults = createDefaultOperatorProfile();
      Object.assign(operatorProfile, defaults);
      res.json({ ok: true, profile: getProfileForSession(session) });
      return;
    }
    customerProfileExtras.delete(session.uid);
    res.json({ ok: true, profile: getProfileForSession(session) });
  });

  // Custom Profile Fields CRUD (Add, Edit, Delete)
  app.post('/api/account/custom-fields', requireAuth, (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const b = req.body || {};
    const label = String(b.label || '').trim().slice(0, 60);
    const value = String(b.value || '').trim().slice(0, 160);
    const allowedCats: ProfileCustomField['category'][] = ['Operations', 'Billing', 'Contact', 'Other'];
    const category = allowedCats.includes(b.category) ? (b.category as ProfileCustomField['category']) : 'Other';
    if (!label || !value) {
      res.status(400).json({ ok: false, message: 'Field label and value are required.' });
      return;
    }
    const field: ProfileCustomField = {
      id: `cf-${crypto.randomBytes(4).toString('hex')}`,
      label,
      value,
      category,
    };
    if (session.role === 'admin') {
      operatorProfile.customFields.push(field);
    } else {
      const cust = customerStore.find((c) => c.uid === session.uid);
      if (!cust) {
        res.status(404).json({ ok: false, message: 'Account not found.' });
        return;
      }
      getOrCreateCustomerExtras(cust).customFields.push(field);
    }
    res.status(201).json({ ok: true, field, profile: getProfileForSession(session) });
  });

  app.patch('/api/account/custom-fields/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const list =
      session.role === 'admin'
        ? operatorProfile.customFields
        : (() => {
            const cust = customerStore.find((c) => c.uid === session.uid);
            return cust ? getOrCreateCustomerExtras(cust).customFields : null;
          })();
    if (!list) {
      res.status(404).json({ ok: false, message: 'Account not found.' });
      return;
    }
    const idx = list.findIndex((f) => f.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ ok: false, message: 'Custom field not found.' });
      return;
    }
    const b = req.body || {};
    const allowedCats: ProfileCustomField['category'][] = ['Operations', 'Billing', 'Contact', 'Other'];
    if (typeof b.label === 'string' && b.label.trim()) list[idx].label = b.label.trim().slice(0, 60);
    if (typeof b.value === 'string' && b.value.trim()) list[idx].value = b.value.trim().slice(0, 160);
    if (allowedCats.includes(b.category)) list[idx].category = b.category;
    res.json({ ok: true, field: list[idx], profile: getProfileForSession(session) });
  });

  app.delete('/api/account/custom-fields/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const list =
      session.role === 'admin'
        ? operatorProfile.customFields
        : (() => {
            const cust = customerStore.find((c) => c.uid === session.uid);
            return cust ? getOrCreateCustomerExtras(cust).customFields : null;
          })();
    if (!list) {
      res.status(404).json({ ok: false, message: 'Account not found.' });
      return;
    }
    const idx = list.findIndex((f) => f.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ ok: false, message: 'Custom field not found.' });
      return;
    }
    list.splice(idx, 1);
    res.json({ ok: true, profile: getProfileForSession(session) });
  });

  // Profile Social / Contact Links CRUD (Add, Edit, Delete)
  app.post('/api/account/social-links', requireAuth, (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const b = req.body || {};
    const platform = String(b.platform || '').trim().slice(0, 40);
    const handle = String(b.handle || '').trim().slice(0, 80);
    const url = String(b.url || '').trim().slice(0, 200);
    if (!platform || !url || !isSafeHttpUrl(url)) {
      res.status(400).json({ ok: false, message: 'Platform name and a valid https:// URL are required.' });
      return;
    }
    const link: ProfileSocialLink = {
      id: `sl-${crypto.randomBytes(4).toString('hex')}`,
      platform,
      handle: handle || platform,
      url,
    };
    if (session.role === 'admin') {
      operatorProfile.socialLinks.push(link);
    } else {
      const cust = customerStore.find((c) => c.uid === session.uid);
      if (!cust) {
        res.status(404).json({ ok: false, message: 'Account not found.' });
        return;
      }
      getOrCreateCustomerExtras(cust).socialLinks.push(link);
    }
    res.status(201).json({ ok: true, link, profile: getProfileForSession(session) });
  });

  app.patch('/api/account/social-links/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const list =
      session.role === 'admin'
        ? operatorProfile.socialLinks
        : (() => {
            const cust = customerStore.find((c) => c.uid === session.uid);
            return cust ? getOrCreateCustomerExtras(cust).socialLinks : null;
          })();
    if (!list) {
      res.status(404).json({ ok: false, message: 'Account not found.' });
      return;
    }
    const idx = list.findIndex((l) => l.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ ok: false, message: 'Link not found.' });
      return;
    }
    const b = req.body || {};
    if (typeof b.url === 'string' && (!b.url.trim() || !isSafeHttpUrl(b.url.trim()))) {
      res.status(400).json({ ok: false, message: 'URL must start with https:// or http://.' });
      return;
    }
    if (typeof b.platform === 'string' && b.platform.trim()) list[idx].platform = b.platform.trim().slice(0, 40);
    if (typeof b.handle === 'string') list[idx].handle = b.handle.trim().slice(0, 80);
    if (typeof b.url === 'string' && b.url.trim()) list[idx].url = b.url.trim().slice(0, 200);
    res.json({ ok: true, link: list[idx], profile: getProfileForSession(session) });
  });

  app.delete('/api/account/social-links/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const list =
      session.role === 'admin'
        ? operatorProfile.socialLinks
        : (() => {
            const cust = customerStore.find((c) => c.uid === session.uid);
            return cust ? getOrCreateCustomerExtras(cust).socialLinks : null;
          })();
    if (!list) {
      res.status(404).json({ ok: false, message: 'Account not found.' });
      return;
    }
    const idx = list.findIndex((l) => l.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ ok: false, message: 'Link not found.' });
      return;
    }
    list.splice(idx, 1);
    res.json({ ok: true, profile: getProfileForSession(session) });
  });

  // Profile Skills / Responsibilities CRUD (Add, Delete)
  app.post('/api/account/skills', requireAuth, (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const skill = String(req.body?.skill || '').trim().slice(0, 48);
    if (!skill) {
      res.status(400).json({ ok: false, message: 'Skill or role label is required.' });
      return;
    }
    const list =
      session.role === 'admin'
        ? operatorProfile.skills
        : (() => {
            const cust = customerStore.find((c) => c.uid === session.uid);
            return cust ? getOrCreateCustomerExtras(cust).skills : null;
          })();
    if (!list) {
      res.status(404).json({ ok: false, message: 'Account not found.' });
      return;
    }
    if (!list.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      list.push(skill);
    }
    res.status(201).json({ ok: true, profile: getProfileForSession(session) });
  });

  app.delete('/api/account/skills/:index', requireAuth, (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const idx = Number(req.params.index);
    const list =
      session.role === 'admin'
        ? operatorProfile.skills
        : (() => {
            const cust = customerStore.find((c) => c.uid === session.uid);
            return cust ? getOrCreateCustomerExtras(cust).skills : null;
          })();
    if (!list || Number.isNaN(idx) || idx < 0 || idx >= list.length) {
      res.status(404).json({ ok: false, message: 'Item not found.' });
      return;
    }
    list.splice(idx, 1);
    res.json({ ok: true, profile: getProfileForSession(session) });
  });

  app.post('/api/account/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const b = req.body || {};
    if (session.role === 'admin') {
      if (typeof b.orderUpdates === 'boolean') operatorProfile.prefs.orderUpdates = b.orderUpdates;
      if (typeof b.productNews === 'boolean') operatorProfile.prefs.productNews = b.productNews;
      if (typeof b.securityAlerts === 'boolean') operatorProfile.prefs.securityAlerts = b.securityAlerts;
      res.json({ ok: true, profile: { ...operatorProfile } });
      return;
    }
    const cust = customerStore.find((c) => c.uid === session.uid);
    if (!cust) {
      res.status(404).json({ ok: false, message: 'Account not found.' });
      return;
    }
    if (typeof b.orderUpdates === 'boolean') cust.prefs.orderUpdates = b.orderUpdates;
    if (typeof b.productNews === 'boolean') cust.prefs.productNews = b.productNews;
    if (typeof b.securityAlerts === 'boolean') cust.prefs.securityAlerts = b.securityAlerts;
    res.json({ ok: true, profile: getProfileForSession(session) });
  });

  app.get('/api/account/sessions', requireAuth, (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const now = Date.now();
    const list: SessionInfo[] = [];
    for (const [tok, sess] of sessions.entries()) {
      if (sess.expiresAt < now) {
        sessions.delete(tok);
        continue;
      }
      if (sess.uid === session.uid) {
        list.push({
          id: sess.id,
          userAgent: sess.userAgent,
          createdAt: new Date(sess.createdAt).toISOString(),
          expiresAt: new Date(sess.expiresAt).toISOString(),
          isCurrent: sess.token === session.token,
        });
      }
    }
    res.json({ ok: true, sessions: list });
  });

  app.post('/api/account/sessions/revoke-others', requireAuth, (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    let revoked = 0;
    for (const [tok, sess] of sessions.entries()) {
      if (sess.uid === session.uid && sess.token !== session.token) {
        sessions.delete(tok);
        revoked += 1;
      }
    }
    if (session.role === 'customer') {
      const cust = customerStore.find((c) => c.uid === session.uid);
      if (cust) cust.activeSessions = countActiveSessionsForUid(session.uid);
    }
    res.json({ ok: true, revoked });
  });

  app.post('/api/account/change-password', requireAuth, (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!currentPassword || newPassword.length < 8 || newPassword.length > 128) {
      res.status(400).json({
        ok: false,
        message: 'Current password and a new password (8–128 characters) are required.',
      });
      return;
    }

    if (session.role === 'admin') {
      const envPassword = process.env.ADMIN_PASSWORD?.trim();
      if (envPassword) {
        res.status(409).json({
          ok: false,
          message:
            'ADMIN_PASSWORD is managed via server Secrets. Update ADMIN_PASSWORD in Settings → Secrets to rotate it.',
        });
        return;
      }
      if (!claimedAdminCredential) {
        res.status(400).json({ ok: false, message: 'No claimed password to update.' });
        return;
      }
      const valid = safeEqualStrings(
        hashWithSalt(currentPassword, claimedAdminCredential.salt),
        claimedAdminCredential.hash,
      );
      if (!valid) {
        res.status(401).json({ ok: false, message: 'Current password is incorrect.' });
        return;
      }
      const salt = crypto.randomBytes(16).toString('hex');
      claimedAdminCredential = { salt, hash: hashWithSalt(newPassword, salt) };
      res.json({ ok: true, message: 'Operator password updated successfully.' });
      return;
    }

    const cred = customerCredentials.get(session.uid);
    if (!cred || !safeEqualStrings(hashWithSalt(currentPassword, cred.salt), cred.hash)) {
      res.status(401).json({ ok: false, message: 'Current password is incorrect.' });
      return;
    }
    const salt = crypto.randomBytes(16).toString('hex');
    customerCredentials.set(session.uid, {
      uid: session.uid,
      salt,
      hash: hashWithSalt(newPassword, salt),
    });
    res.json({ ok: true, message: 'Account password updated successfully.' });
  });

  app.get('/api/account/orders', requireAuth, (req: AuthenticatedRequest, res) => {
    const session = req.session!;
    const profile = getProfileForSession(session);
    if (!profile) {
      res.json({ ok: true, orders: [] });
      return;
    }
    const orders =
      session.role === 'admin'
        ? orderStore.slice(0, 20)
        : orderStore.filter(
            (o) =>
              o.customerUid === session.uid ||
              o.customerEmail.toLowerCase() === profile.email.toLowerCase(),
          );
    res.json({ ok: true, orders });
  });

  // Executive Dashboard Summary
  app.get('/api/admin/summary', requireAdmin, (_req, res) => {
    const fulfilledOrders = orderStore.filter((o) => o.status === 'PAID_FULFILLED');
    const pendingOrders = orderStore.filter((o) => o.status === 'PENDING');
    const revenue30dUsd = Number(
      fulfilledOrders.reduce((sum, o) => sum + o.totalUsd, 0).toFixed(2),
    );
    const revenue30dPkr = Math.round(revenue30dUsd * USD_TO_PKR);

    // Group orders by date for the revenue chart
    const revByDate = new Map<string, { revenueUsd: number; orders: number }>();
    for (const o of orderStore) {
      const date = o.createdAt.slice(0, 10);
      const curr = revByDate.get(date) || { revenueUsd: 0, orders: 0 };
      curr.orders += 1;
      if (o.status === 'PAID_FULFILLED') {
        curr.revenueUsd = Number((curr.revenueUsd + o.totalUsd).toFixed(2));
      }
      revByDate.set(date, curr);
    }
    const dailyRevenue = [...revByDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({ date, ...stats }));

    const categoryMap = new Map<string, { count: number; inStock: number; totalUsd: number }>();
    for (const p of catalogStore) {
      const current = categoryMap.get(p.category) || { count: 0, inStock: 0, totalUsd: 0 };
      current.count += 1;
      if (p.stockStatus === 'IN_STOCK') current.inStock += 1;
      current.totalUsd += p.priceUsd;
      categoryMap.set(p.category, current);
    }

    const byStage = CRM_STAGES.map((stage) => {
      const stageLeads = leadStore.filter((l) => l.status === stage);
      return {
        stage,
        count: stageLeads.length,
        valueUsd: stageLeads.reduce((s, l) => s + l.expectedValueUsd, 0),
      };
    });

    const adsense = getAdSenseConfigStatus();
    const meta = getMetaStatusPayload();
    const ef = getElectronicFirstStatus();
    const tiktokConfigured = Boolean(
      process.env.TIKTOK_PIXEL_ID?.trim() && process.env.TIKTOK_EVENTS_TOKEN?.trim(),
    );

    const summary: AdminSummary = {
      usdToPkr: USD_TO_PKR,
      orders: {
        total: orderStore.length,
        fulfilled: fulfilledOrders.length,
        pending: pendingOrders.length,
        revenue30dUsd,
        revenue30dPkr,
        dailyRevenue,
      },
      catalog: {
        total: catalogStore.length,
        inStock: catalogStore.filter((p) => p.stockStatus === 'IN_STOCK').length,
        active: catalogStore.filter((p) => p.active).length,
        deals: catalogStore.filter((p) => p.discountPct > 0).length,
        servicesCount: servicesStore.length,
        tvChannelsCount: tvChannelsStore.length,
        tvPlansCount: tvPlansStore.length,
        byCategory: [...categoryMap.entries()].map(([category, v]) => ({
          category,
          count: v.count,
          inStock: v.inStock,
          avgPriceUsd: Number((v.totalUsd / v.count).toFixed(2)),
        })),
      },
      crm: {
        total: leadStore.length,
        pipelineUsd: leadStore
          .filter((l) => l.status !== 'Lost' && l.status !== 'Won')
          .reduce((s, l) => s + l.expectedValueUsd, 0),
        wonUsd: leadStore
          .filter((l) => l.status === 'Won')
          .reduce((s, l) => s + l.expectedValueUsd, 0),
        byStage,
      },
      domains: {
        total: domainStore.length,
        adsTxtReady: domainStore.filter((d) => d.adsTxtOk).length,
        legalReady: domainStore.filter((d) => d.privacyOk && d.termsOk).length,
      },
      customers: {
        total: customerStore.length,
        activeSessions: customerStore.reduce((s, c) => s + c.activeSessions, 0),
        allowlistCount: allowlistStore.length,
      },
      integrations: {
        adsenseConnected: adsense.connected,
        metaConfigured: meta.configured,
        tiktokConfigured,
        electronicFirstConfigured: ef.configured,
        upstreamWorkerConfigured: isValidUpstreamWorkerUrl(
          process.env.PLAYBEAT_WORKER_URL?.trim(),
        ),
      },
      recentOrders: orderStore.slice(0, 6),
    };

    res.json({ ok: true, summary });
  });

  // Electronic First Developer API v1 (dev/v1) Routes
  app.get('/api/admin/electronicfirst/status', requireAdmin, (_req, res) => {
    res.json(getElectronicFirstStatus());
  });

  app.post('/api/admin/electronicfirst/ping', requireAdmin, async (_req, res) => {
    const result = await callElectronicFirstApi('/ping');
    res.json(result);
  });

  app.get('/api/admin/electronicfirst/balance', requireAdmin, async (_req, res) => {
    const result = await callElectronicFirstApi('/affiliates/stats/balance');
    res.json(result);
  });

  app.get('/api/admin/electronicfirst/payouts', requireAdmin, async (_req, res) => {
    const result = await callElectronicFirstApi('/affiliates/stats/payments');
    res.json(result);
  });

  app.get('/api/admin/electronicfirst/conversions', requireAdmin, async (_req, res) => {
    const result = await callElectronicFirstApi('/affiliates/stats/conversions');
    res.json(result);
  });

  // Catalog Routes (matches worker.js GET /api/admin/catalog?q=&limit=)
  app.get('/api/admin/catalog', requireAdmin, (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const category = String(req.query.category || '').trim();
    const stock = String(req.query.stock || '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);

    const filtered = catalogStore.filter((item) => {
      if (q) {
        const hay = `${item.name} ${item.sku} ${item.platform} ${item.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (category && category !== 'ALL' && item.category !== category) return false;
      if (stock && stock !== 'ALL' && item.stockStatus !== stock) return false;
      return true;
    });

    res.json({
      ok: true,
      total: catalogStore.length,
      filteredTotal: filtered.length,
      products: filtered.slice(0, limit),
    });
  });

  app.post('/api/admin/catalog', requireAdmin, (req, res) => {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const sku = String(body.sku || '').trim().toUpperCase();
    const priceUsd = Number(body.priceUsd);

    if (!name || !sku || Number.isNaN(priceUsd) || priceUsd < 0) {
      res.status(400).json({ ok: false, error: 'INVALID_PRODUCT' });
      return;
    }

    const allowedPlatforms = [
      'PC / Steam',
      'PlayStation',
      'Xbox',
      'Nintendo',
      'Software',
      'TV Plan',
      'Service',
    ] as const;
    const allowedCategories = [
      'Games',
      'Gift Cards',
      'Subscriptions',
      'Services',
      'TV Plans',
    ] as const;
    const allowedStocks = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const;

    const platform = allowedPlatforms.includes(body.platform) ? body.platform : 'PC / Steam';
    const category = allowedCategories.includes(body.category) ? body.category : 'Games';
    const stockStatus = allowedStocks.includes(body.stockStatus) ? body.stockStatus : 'IN_STOCK';
    const discountPct = Math.min(Math.max(Number(body.discountPct) || 0, 0), 95);

    const product: CatalogProduct = {
      id: `prod-${Date.now()}`,
      sku,
      name,
      platform,
      category,
      priceUsd: Number(priceUsd.toFixed(2)),
      pricePkr: Math.round(priceUsd * USD_TO_PKR),
      discountPct,
      stockStatus,
      active: body.active !== false,
      source: 'Manual',
      updatedAt: new Date().toISOString(),
    };

    catalogStore.unshift(product);
    res.status(201).json({ ok: true, product });
  });

  // Bulk JSON Inventory Import (for playbeat-inventory / Electronic First snapshot JSON)
  app.post('/api/admin/catalog/import', requireAdmin, (req, res) => {
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : null;
    if (!rawItems || rawItems.length === 0) {
      res.status(400).json({ ok: false, error: 'Provide a non-empty items array.' });
      return;
    }
    if (rawItems.length > 500) {
      res.status(400).json({ ok: false, error: 'Maximum 500 items per import batch.' });
      return;
    }

    const allowedPlatforms = [
      'PC / Steam',
      'PlayStation',
      'Xbox',
      'Nintendo',
      'Software',
      'TV Plan',
      'Service',
    ] as const;
    const allowedCategories = [
      'Games',
      'Gift Cards',
      'Subscriptions',
      'Services',
      'TV Plans',
    ] as const;

    let added = 0;
    let updated = 0;
    const now = new Date().toISOString();

    for (const raw of rawItems) {
      if (!raw || typeof raw !== 'object') continue;
      const name = String(raw.name || raw.title || '').trim().slice(0, 180);
      if (!name) continue;
      const sku = String(raw.sku || raw.id || `PB-IMP-${Date.now().toString().slice(-4)}-${added}`)
        .trim()
        .toUpperCase()
        .slice(0, 48);
      const priceUsd = Math.max(0, Number(raw.priceUsd ?? raw.price ?? 0) || 0);
      const discountPct = Math.min(Math.max(Number(raw.discountPct ?? raw.discount ?? 0) || 0, 0), 95);
      const platform = allowedPlatforms.includes(raw.platform) ? raw.platform : 'PC / Steam';
      const category = allowedCategories.includes(raw.category) ? raw.category : 'Games';
      const stockStatus: CatalogProduct['stockStatus'] =
        raw.stockStatus === 'OUT_OF_STOCK' || raw.stockStatus === 'LOW_STOCK'
          ? raw.stockStatus
          : 'IN_STOCK';

      const existingIdx = catalogStore.findIndex((p) => p.sku === sku);
      if (existingIdx >= 0) {
        catalogStore[existingIdx] = {
          ...catalogStore[existingIdx],
          name,
          priceUsd: Number(priceUsd.toFixed(2)),
          pricePkr: Math.round(priceUsd * USD_TO_PKR),
          discountPct,
          stockStatus,
          source: 'InventoryImport',
          updatedAt: now,
        };
        updated += 1;
      } else {
        catalogStore.unshift({
          id: `prod-${Date.now()}-${added}`,
          sku,
          name,
          platform,
          category,
          priceUsd: Number(priceUsd.toFixed(2)),
          pricePkr: Math.round(priceUsd * USD_TO_PKR),
          discountPct,
          stockStatus,
          active: raw.active !== false,
          source: 'InventoryImport',
          updatedAt: now,
        });
        added += 1;
      }
    }

    res.json({ ok: true, added, updated, total: catalogStore.length });
  });

  app.patch('/api/admin/catalog/:id', requireAdmin, (req, res) => {
    const idx = catalogStore.findIndex((p) => p.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      return;
    }
    const patch = req.body || {};
    const existing = catalogStore[idx];
    const nextPriceUsd =
      patch.priceUsd !== undefined && !Number.isNaN(Number(patch.priceUsd))
        ? Number(Number(patch.priceUsd).toFixed(2))
        : existing.priceUsd;

    catalogStore[idx] = {
      ...existing,
      name: typeof patch.name === 'string' && patch.name.trim() ? patch.name.trim() : existing.name,
      priceUsd: nextPriceUsd,
      pricePkr: Math.round(nextPriceUsd * USD_TO_PKR),
      discountPct:
        patch.discountPct !== undefined
          ? Math.min(Math.max(Number(patch.discountPct) || 0, 0), 95)
          : existing.discountPct,
      stockStatus: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'].includes(patch.stockStatus)
        ? patch.stockStatus
        : existing.stockStatus,
      active: typeof patch.active === 'boolean' ? patch.active : existing.active,
      updatedAt: new Date().toISOString(),
    };
    res.json({ ok: true, product: catalogStore[idx] });
  });

  app.delete('/api/admin/catalog/:id', requireAdmin, (req, res) => {
    const idx = catalogStore.findIndex((p) => p.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      return;
    }
    catalogStore.splice(idx, 1);
    res.json({ ok: true });
  });

  // Catalog Sub-tabs: Services, TV Channels, TV Plans
  app.get('/api/admin/catalog/services', requireAdmin, (_req, res) => {
    res.json({ ok: true, services: servicesStore });
  });

  app.post('/api/admin/catalog/services', requireAdmin, (req, res) => {
    const b = req.body || {};
    const name = String(b.name || '').trim();
    const code = String(b.code || '').trim().toUpperCase();
    const priceUsd = Math.max(0, Number(b.priceUsd) || 0);
    if (!name || !code) {
      res.status(400).json({ ok: false, error: 'code and name required' });
      return;
    }
    const item: ServiceItem = {
      id: `srv-${Date.now()}`,
      code,
      name,
      turnaround: String(b.turnaround || '30 mins').trim(),
      priceUsd: Number(priceUsd.toFixed(2)),
      pricePkr: Math.round(priceUsd * USD_TO_PKR),
      active: b.active !== false,
    };
    servicesStore.unshift(item);
    res.status(201).json({ ok: true, service: item });
  });

  app.delete('/api/admin/catalog/services/:id', requireAdmin, (req, res) => {
    const idx = servicesStore.findIndex((s) => s.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      return;
    }
    servicesStore.splice(idx, 1);
    res.json({ ok: true });
  });

  app.get('/api/admin/catalog/tv-channels', requireAdmin, (_req, res) => {
    res.json({ ok: true, channels: tvChannelsStore });
  });

  app.post('/api/admin/catalog/tv-channels', requireAdmin, (req, res) => {
    const b = req.body || {};
    const name = String(b.name || '').trim();
    if (!name) {
      res.status(400).json({ ok: false, error: 'name required' });
      return;
    }
    const channel: TvChannel = {
      id: `ch-${Date.now()}`,
      name,
      category: ['Sports', 'News', 'Entertainment', 'Regional'].includes(b.category)
        ? b.category
        : 'Sports',
      region: ['USA / NA', 'South Asia', 'Middle East', 'Global'].includes(b.region)
        ? b.region
        : 'Global',
      domain: String(b.domain || 'playbeat.live').trim(),
      status: ['ONLINE', 'DEGRADED', 'OFFLINE'].includes(b.status) ? b.status : 'ONLINE',
      active: b.active !== false,
    };
    tvChannelsStore.unshift(channel);
    res.status(201).json({ ok: true, channel });
  });

  app.patch('/api/admin/catalog/tv-channels/:id', requireAdmin, (req, res) => {
    const idx = tvChannelsStore.findIndex((c) => c.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      return;
    }
    const patch = req.body || {};
    tvChannelsStore[idx] = {
      ...tvChannelsStore[idx],
      status: ['ONLINE', 'DEGRADED', 'OFFLINE'].includes(patch.status)
        ? patch.status
        : tvChannelsStore[idx].status,
      active: typeof patch.active === 'boolean' ? patch.active : tvChannelsStore[idx].active,
    };
    res.json({ ok: true, channel: tvChannelsStore[idx] });
  });

  app.delete('/api/admin/catalog/tv-channels/:id', requireAdmin, (req, res) => {
    const idx = tvChannelsStore.findIndex((c) => c.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      return;
    }
    tvChannelsStore.splice(idx, 1);
    res.json({ ok: true });
  });

  app.get('/api/admin/catalog/tv-plans', requireAdmin, (_req, res) => {
    res.json({ ok: true, plans: tvPlansStore });
  });

  app.post('/api/admin/catalog/tv-plans', requireAdmin, (req, res) => {
    const b = req.body || {};
    const name = String(b.name || '').trim();
    const sku = String(b.sku || '').trim().toUpperCase();
    const priceUsd = Math.max(0, Number(b.priceUsd) || 0);
    if (!name || !sku) {
      res.status(400).json({ ok: false, error: 'sku and name required' });
      return;
    }
    const plan: TvPlan = {
      id: `plan-${Date.now()}`,
      sku,
      name,
      durationMonths: Math.max(1, Math.min(24, Math.floor(Number(b.durationMonths) || 3))),
      domains: Array.isArray(b.domains)
        ? b.domains.map((d: unknown) => String(d).trim()).filter(Boolean)
        : ['playbeat.live'],
      priceUsd: Number(priceUsd.toFixed(2)),
      pricePkr: Math.round(priceUsd * USD_TO_PKR),
      active: b.active !== false,
    };
    tvPlansStore.unshift(plan);
    res.status(201).json({ ok: true, plan });
  });

  app.delete('/api/admin/catalog/tv-plans/:id', requireAdmin, (req, res) => {
    const idx = tvPlansStore.findIndex((p) => p.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      return;
    }
    tvPlansStore.splice(idx, 1);
    res.json({ ok: true });
  });

  // Customer Accounts & Firebase Admin Allow-list
  app.get('/api/admin/customers', requireAdmin, (_req, res) => {
    res.json({ ok: true, customers: customerStore });
  });

  app.post('/api/admin/customers', requireAdmin, (req, res) => {
    const b = req.body || {};
    const displayName = String(b.displayName || '').trim().slice(0, 80);
    const email = String(b.email || '').trim().toLowerCase();
    const phone = String(b.phone || '').trim().slice(0, 32);
    const initialPassword = typeof b.password === 'string' ? b.password : '';
    const provider: CustomerAccount['provider'] = b.provider === 'Google' ? 'Google' : 'Email';

    if (!displayName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ ok: false, message: 'Valid display name and email are required.' });
      return;
    }
    if (customerStore.some((c) => c.email.toLowerCase() === email)) {
      res.status(409).json({ ok: false, message: 'Customer email already exists.' });
      return;
    }
    if (initialPassword && (initialPassword.length < 8 || initialPassword.length > 128)) {
      res.status(400).json({ ok: false, message: 'Initial password must be at least 8 characters.' });
      return;
    }

    const uid = `uid_pb_${crypto.randomBytes(4).toString('hex')}`;
    const account: CustomerAccount = {
      uid,
      displayName,
      email,
      phone: phone || undefined,
      provider,
      memberSince: new Date().toISOString().slice(0, 10),
      activeSessions: 0,
      prefs: {
        orderUpdates: b.orderUpdates !== false,
        productNews: Boolean(b.productNews),
        securityAlerts: b.securityAlerts !== false,
      },
      ordersCount: 0,
      totalSpentUsd: 0,
    };
    customerStore.unshift(account);

    if (initialPassword) {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashWithSalt(initialPassword, salt);
      customerCredentials.set(uid, { uid, salt, hash });
    }

    res.status(201).json({ ok: true, customer: account });
  });

  app.patch('/api/admin/customers/:uid', requireAdmin, (req, res) => {
    const idx = customerStore.findIndex((c) => c.uid === req.params.uid);
    if (idx < 0) {
      res.status(404).json({ ok: false, message: 'Account not found.' });
      return;
    }
    const b = req.body || {};
    const existing = customerStore[idx];
    const nextEmail =
      typeof b.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email.trim().toLowerCase())
        ? b.email.trim().toLowerCase()
        : existing.email;

    if (
      nextEmail !== existing.email.toLowerCase() &&
      customerStore.some((c, i) => i !== idx && c.email.toLowerCase() === nextEmail)
    ) {
      res.status(409).json({ ok: false, message: 'Another account already uses that email.' });
      return;
    }

    customerStore[idx] = {
      ...existing,
      displayName:
        typeof b.displayName === 'string' && b.displayName.trim()
          ? b.displayName.trim().slice(0, 80)
          : existing.displayName,
      email: nextEmail,
      phone: typeof b.phone === 'string' ? b.phone.trim().slice(0, 32) || undefined : existing.phone,
      provider: b.provider === 'Google' || b.provider === 'Email' ? b.provider : existing.provider,
    };
    res.json({ ok: true, customer: customerStore[idx] });
  });

  app.delete('/api/admin/customers/:uid', requireAdmin, (req, res) => {
    const idx = customerStore.findIndex((c) => c.uid === req.params.uid);
    if (idx < 0) {
      res.status(404).json({ ok: false, message: 'Account not found.' });
      return;
    }
    const [removed] = customerStore.splice(idx, 1);
    customerCredentials.delete(removed.uid);
    customerProfileExtras.delete(removed.uid);
    passwordResetStore.delete(removed.email.toLowerCase());
    for (const [tok, sess] of sessions.entries()) {
      if (sess.uid === removed.uid) sessions.delete(tok);
    }
    res.json({ ok: true, deletedUid: removed.uid });
  });

  app.post('/api/admin/customers/:uid/reset-password', requireAdmin, (req, res) => {
    const customer = customerStore.find((c) => c.uid === req.params.uid);
    if (!customer) {
      res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      return;
    }
    const mode = req.body?.mode === 'direct' ? 'direct' : 'code';
    if (mode === 'direct') {
      const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
      if (newPassword.length < 8 || newPassword.length > 128) {
        res.status(400).json({ ok: false, message: 'New password must be at least 8 characters.' });
        return;
      }
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashWithSalt(newPassword, salt);
      customerCredentials.set(customer.uid, { uid: customer.uid, salt, hash });
      for (const [tok, sess] of sessions.entries()) {
        if (sess.uid === customer.uid) sessions.delete(tok);
      }
      customer.activeSessions = 0;
      res.json({
        ok: true,
        mode: 'direct',
        message: `Password reset for ${customer.email} and active sessions revoked.`,
      });
      return;
    }

    const resetCode = `PB-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const expiresAt = Date.now() + RESET_TOKEN_TTL_MS;
    passwordResetStore.set(customer.email.toLowerCase(), {
      uid: customer.uid,
      email: customer.email.toLowerCase(),
      tokenHash: sha256Hex(resetCode),
      expiresAt,
      used: false,
    });

    res.json({
      ok: true,
      mode: 'code',
      email: customer.email,
      resetCode,
      expiresAt: new Date(expiresAt).toISOString(),
      message: `Issued 30-minute one-time reset code for ${customer.email}.`,
    });
  });

  app.post('/api/admin/customers/:uid/revoke-sessions', requireAdmin, (req, res) => {
    const idx = customerStore.findIndex((c) => c.uid === req.params.uid);
    if (idx < 0) {
      res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      return;
    }
    for (const [tok, sess] of sessions.entries()) {
      if (sess.uid === customerStore[idx].uid) sessions.delete(tok);
    }
    customerStore[idx] = { ...customerStore[idx], activeSessions: 0 };
    res.json({ ok: true, customer: customerStore[idx] });
  });

  app.get('/api/admin/allowlist', requireAdmin, (_req, res) => {
    res.json({ ok: true, allowlist: allowlistStore });
  });

  app.post('/api/admin/allowlist', requireAdmin, (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const role = ['Owner', 'Admin', 'Operator'].includes(req.body?.role)
      ? (req.body.role as AllowlistEntry['role'])
      : 'Operator';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ ok: false, error: 'Valid email address required.' });
      return;
    }
    if (allowlistStore.some((a) => a.email === email)) {
      res.status(409).json({ ok: false, error: 'Email already in allow-list.' });
      return;
    }
    const entry: AllowlistEntry = { email, role, addedAt: new Date().toISOString() };
    allowlistStore.push(entry);
    res.status(201).json({ ok: true, entry });
  });

  app.delete('/api/admin/allowlist/:email', requireAdmin, (req, res) => {
    const email = decodeURIComponent(req.params.email).toLowerCase();
    const idx = allowlistStore.findIndex((a) => a.email === email);
    if (idx < 0) {
      res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      return;
    }
    if (allowlistStore.length <= 1) {
      res.status(400).json({ ok: false, error: 'Cannot remove the last admin allow-list email.' });
      return;
    }
    allowlistStore.splice(idx, 1);
    res.json({ ok: true });
  });

  // Google Service Accounts Registry & Live GA4/Search Traffic (Local Express Parity)
  interface LocalSaRec {
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
    sa: { client_email: string; private_key: string; private_key_id?: string; project_id?: string; token_uri?: string };
  }

  const localSaStore: LocalSaRec[] = [];
  let localActiveSaId: string | null = null;

  const parseLocalSa = (raw: string | undefined) => {
    try {
      const p = JSON.parse(String(raw || '').trim());
      if (p?.client_email && p?.private_key && String(p.private_key).includes('PRIVATE KEY')) return p;
    } catch {
      // ignore
    }
    return null;
  };

  const getLocalSaList = (): LocalSaRec[] => {
    const out: LocalSaRec[] = [];
    const envParsed = parseLocalSa(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    if (envParsed) {
      const existingMeta = localSaStore.find((x) => x.id === 'sa_env_primary');
      out.push({
        id: 'sa_env_primary',
        label: existingMeta?.label || 'PlayBeat Primary GCP Service Account',
        source: 'secret',
        clientEmail: envParsed.client_email,
        projectId: envParsed.project_id || '',
        privateKeyId: envParsed.private_key_id || '',
        adsenseAccountId: existingMeta?.adsenseAccountId || process.env.ADSENSE_ACCOUNT || 'accounts/pub-9777611286139666',
        ga4PropertyId: existingMeta?.ga4PropertyId || '',
        searchConsoleSite: existingMeta?.searchConsoleSite || 'https://playbeat.digital/',
        addedAt: '2026-11-25T00:00:00.000Z',
        lastVerifiedAt: existingMeta?.lastVerifiedAt,
        sa: envParsed,
      });
    }
    for (const r of localSaStore) {
      if (r.id !== 'sa_env_primary') out.push(r);
    }
    if (!localActiveSaId || !out.some((x) => x.id === localActiveSaId)) {
      localActiveSaId = out[0]?.id || null;
    }
    return out;
  };

  const toPublicLocalSa = (r: LocalSaRec) => ({
    id: r.id,
    label: r.label,
    clientEmail: r.clientEmail,
    projectId: r.projectId,
    privateKeyId: r.privateKeyId,
    source: r.source,
    active: r.id === localActiveSaId,
    adsenseAccountId: r.adsenseAccountId,
    ga4PropertyId: r.ga4PropertyId,
    searchConsoleSite: r.searchConsoleSite,
    addedAt: r.addedAt,
    lastVerifiedAt: r.lastVerifiedAt,
  });

  const mintLocalSaToken = async (sa: LocalSaRec['sa'], scope: string) => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
      const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
      const signingInput = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
        iss: sa.client_email,
        scope,
        aud: tokenUri,
        iat: now,
        exp: now + 3600,
      })}`;
      const sig = crypto.createSign('RSA-SHA256').update(signingInput).sign(sa.private_key, 'base64url');
      const res = await fetch(tokenUri, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: `${signingInput}.${sig}`,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as Record<string, string>;
      if (!res.ok || !body.access_token) {
        return { ok: false as const, error: body.error_description || body.error || `HTTP ${res.status}` };
      }
      return { ok: true as const, accessToken: body.access_token };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : 'JWT signing failed' };
    }
  };

  app.get('/api/admin/google/service-accounts', requireAdmin, (_req, res) => {
    const list = getLocalSaList();
    res.json({ ok: true, activeId: localActiveSaId, accounts: list.map(toPublicLocalSa) });
  });

  app.post('/api/admin/google/service-accounts', requireAdmin, (req, res) => {
    const raw =
      typeof req.body?.serviceAccountJson === 'string'
        ? req.body.serviceAccountJson
        : JSON.stringify(req.body?.serviceAccountJson || '');
    const parsed = parseLocalSa(raw);
    if (!parsed) {
      res.status(400).json({ ok: false, error: 'Invalid Google Service Account JSON (requires client_email and private_key).' });
      return;
    }
    const id = `sa_kv_${crypto.randomBytes(5).toString('hex')}`;
    const rec: LocalSaRec = {
      id,
      label: String(req.body?.label || parsed.project_id || parsed.client_email).trim().slice(0, 80),
      source: 'kv',
      clientEmail: parsed.client_email,
      projectId: parsed.project_id || '',
      privateKeyId: parsed.private_key_id || '',
      adsenseAccountId: String(req.body?.adsenseAccountId || process.env.ADSENSE_ACCOUNT || 'accounts/pub-9777611286139666').trim(),
      ga4PropertyId: String(req.body?.ga4PropertyId || '').trim(),
      searchConsoleSite: String(req.body?.searchConsoleSite || 'https://playbeat.digital/').trim(),
      addedAt: new Date().toISOString(),
      sa: parsed,
    };
    localSaStore.push(rec);
    if (req.body?.setActive !== false) localActiveSaId = id;
    res.status(201).json({ ok: true, account: toPublicLocalSa(rec) });
  });

  app.patch('/api/admin/google/service-accounts/:id', requireAdmin, (req, res) => {
    const list = getLocalSaList();
    const rec = list.find((x) => x.id === req.params.id);
    if (!rec) {
      res.status(404).json({ ok: false, error: 'Service account not found.' });
      return;
    }
    if (req.body?.active === true) localActiveSaId = rec.id;
    let target = localSaStore.find((x) => x.id === rec.id);
    if (!target) {
      target = { ...rec };
      localSaStore.push(target);
    }
    if (req.body?.label !== undefined) target.label = String(req.body.label).trim().slice(0, 80);
    if (req.body?.adsenseAccountId !== undefined) target.adsenseAccountId = String(req.body.adsenseAccountId).trim();
    if (req.body?.ga4PropertyId !== undefined) target.ga4PropertyId = String(req.body.ga4PropertyId).trim();
    if (req.body?.searchConsoleSite !== undefined) target.searchConsoleSite = String(req.body.searchConsoleSite).trim();
    res.json({ ok: true, account: toPublicLocalSa(target) });
  });

  app.delete('/api/admin/google/service-accounts/:id', requireAdmin, (req, res) => {
    if (req.params.id === 'sa_env_primary') {
      res.status(400).json({ ok: false, error: 'Primary Secret service account cannot be deleted from UI.' });
      return;
    }
    const idx = localSaStore.findIndex((x) => x.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ ok: false, error: 'Service account not found.' });
      return;
    }
    localSaStore.splice(idx, 1);
    if (localActiveSaId === req.params.id) localActiveSaId = null;
    res.json({ ok: true });
  });

  app.post('/api/admin/google/service-accounts/:id/probe', requireAdmin, async (req, res) => {
    const list = getLocalSaList();
    const rec = list.find((x) => x.id === req.params.id);
    if (!rec) {
      res.status(404).json({ ok: false, error: 'Service account not found.' });
      return;
    }
    const checks = [];
    const probeTargets: Array<{
      service: 'adsense' | 'ga4' | 'search_console';
      name: string;
      scope: string;
      url: string;
      actionUrl: string;
    }> = [
      {
        service: 'adsense',
        name: 'Google AdSense Management API v2',
        scope: 'https://www.googleapis.com/auth/adsense.readonly',
        url: 'https://adsense.googleapis.com/v2/accounts',
        actionUrl: 'https://www.google.com/adsense',
      },
      {
        service: 'ga4',
        name: 'Google Analytics 4 (Traffic & Data API)',
        scope: 'https://www.googleapis.com/auth/analytics.readonly',
        url: 'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
        actionUrl: 'https://analytics.google.com',
      },
      {
        service: 'search_console',
        name: 'Google Search Console (Organic Traffic)',
        scope: 'https://www.googleapis.com/auth/webmasters.readonly',
        url: 'https://www.googleapis.com/webmasters/v3/sites',
        actionUrl: 'https://search.google.com/search-console',
      },
    ];
    for (const t of probeTargets) {
      const tok = await mintLocalSaToken(rec.sa, t.scope);
      if (!tok.ok) {
        checks.push({
          service: t.service,
          name: t.name,
          apiEnabled: false,
          accessGranted: false,
          httpStatus: 401,
          discoveredItems: [],
          detail: tok.error,
          actionUrl: t.actionUrl,
        });
        continue;
      }
      const r = await fetch(t.url, { headers: { authorization: `Bearer ${tok.accessToken}` } });
      const body = (await r.json().catch(() => ({}))) as Record<string, any>;
      const discovered: Array<{ id: string; name: string }> = [];
      if (t.service === 'adsense') {
        for (const a of Array.isArray(body.accounts) ? body.accounts : []) {
          discovered.push({ id: String(a.name || ''), name: String(a.displayName || a.name || '') });
        }
      } else if (t.service === 'ga4') {
        for (const s of Array.isArray(body.accountSummaries) ? body.accountSummaries : []) {
          for (const p of Array.isArray(s.propertySummaries) ? s.propertySummaries : []) {
            discovered.push({ id: String(p.property || ''), name: String(p.displayName || p.property || '') });
          }
        }
      } else {
        for (const s of Array.isArray(body.siteEntry) ? body.siteEntry : []) {
          discovered.push({ id: String(s.siteUrl || ''), name: `${s.siteUrl} (${s.permissionLevel})` });
        }
      }
      const errMsg = String(body?.error?.message || '');
      const disabled = r.status === 403 && errMsg.includes('has not been used');
      checks.push({
        service: t.service,
        name: t.name,
        apiEnabled: !disabled && (r.ok || r.status !== 403),
        accessGranted: r.ok && discovered.length > 0,
        httpStatus: r.status,
        discoveredItems: discovered,
        detail:
          r.ok && discovered.length > 0
            ? `Connected (${discovered.length} discovered).`
            : r.ok
              ? `API enabled on ${rec.projectId}; grant ${rec.clientEmail} read/viewer access in Google console.`
              : errMsg || `HTTP ${r.status}`,
        actionUrl: t.actionUrl,
      });
    }
    res.json({
      ok: true,
      accountId: rec.id,
      clientEmail: rec.clientEmail,
      projectId: rec.projectId,
      checkedAt: new Date().toISOString(),
      checks,
    });
  });

  app.get('/api/admin/google/traffic', requireAdmin, async (req, res) => {
    const range = String(req.query.range || '7d');
    const list = getLocalSaList();
    const rec = list.find((x) => x.id === localActiveSaId) || list[0];
    if (!rec) {
      res.json({
        ok: false,
        range,
        propertyId: '',
        error: 'NO_SERVICE_ACCOUNT',
        message: 'Import a Google Service Account JSON in the Google Service Accounts tab to inspect GA4 traffic.',
      });
      return;
    }
    res.json({
      ok: false,
      range,
      propertyId: rec.ga4PropertyId || '',
      serviceAccountEmail: rec.clientEmail,
      error: 'GA4_PROPERTY_REQUIRED',
      message: `Grant Viewer access to ${rec.clientEmail} in Google Analytics (Admin → Property Access Management) and set your GA4 Property ID.`,
    });
  });

  // AdSense Routes (matches worker.js)
  app.get('/api/admin/adsense/status', requireAdmin, (_req, res) => {
    res.json(getAdSenseConfigStatus());
  });

  app.get('/api/admin/adsense/analytics', requireAdmin, async (req, res) => {
    const range = String(req.query.range || '7d');
    const by = String(req.query.by || 'date');
    try {
      const report = await fetchAdSenseAnalytics(range, by);
      res.json(report);
    } catch (err) {
      res.status(502).json({
        ok: false,
        error: err instanceof Error ? err.message : 'ADSENSE_ERROR',
      });
    }
  });

  // TikTok Status & Test Event
  app.get('/api/admin/tiktok/status', requireAdmin, (_req, res) => {
    const pixelId = process.env.TIKTOK_PIXEL_ID?.trim() || 'DC3J0CBC77U6OQMIKJ80';
    const crmEventSetId = process.env.TIKTOK_CRM_EVENT_SET_ID?.trim() || '7712192188952346645';
    res.json({
      ok: true,
      pixelSaved: Boolean(pixelId),
      pixelId,
      eventsTokenSaved: Boolean(process.env.TIKTOK_EVENTS_TOKEN?.trim()),
      crmEventSetSaved: Boolean(crmEventSetId),
      crmEventSetId,
      crmTokenSaved: Boolean(process.env.TIKTOK_CRM_ACCESS_TOKEN?.trim()),
    });
  });

  app.post('/api/admin/tiktok/test-event', requireAdmin, async (_req, res) => {
    const result = await dispatchTikTokEvent('ViewContent', 'TEST', {
      email: 'test@playbeat.digital',
    });
    res.json(result);
  });

  // Meta Analytics & Test Event (matches worker.js + meta-capi-patch.js)
  app.get('/api/admin/meta/analytics', requireAdmin, (_req, res) => {
    res.json({
      ...getMetaStatusPayload(),
      recentLogs: metaDispatchLogs,
    });
  });

  app.post('/api/admin/meta/test-event', requireAdmin, async (req, res) => {
    const channel =
      req.body?.channel === 'website_capi' ? 'website_capi' : 'whatsapp_crm';
    const result = await dispatchMetaTestEvent(channel);
    res.json(result);
  });

  // CRM Routes (matches crm-meta-patch.js)
  app.get('/api/admin/crm/leads', requireAdmin, (_req, res) => {
    res.json({ ok: true, stages: CRM_STAGES, leads: leadStore });
  });

  app.post('/api/admin/crm/leads', requireAdmin, async (req, res) => {
    const b = req.body || {};
    const businessName = String(b.businessName || '').trim();
    if (!businessName) {
      res.status(400).json({ ok: false, error: 'businessName required' });
      return;
    }

    const stage: CrmStage = CRM_STAGES.includes(b.status) ? b.status : 'Researched';
    const nextNum =
      leadStore.reduce((max, l) => {
        const m = /^PB-L-(\d+)$/.exec(l.leadId);
        return m ? Math.max(max, Number(m[1])) : max;
      }, 0) + 1;

    const now = new Date().toISOString();
    const lead: CrmLead = {
      leadId: `PB-L-${String(nextNum).padStart(4, '0')}`,
      businessName,
      contactName: String(b.contactName || '').trim() || 'Primary Contact',
      email: String(b.email || '').trim(),
      phone: String(b.phone || '').trim(),
      ctwaClid: b.ctwaClid ? String(b.ctwaClid).trim() : undefined,
      expectedValueUsd: Math.max(Number(b.expectedValueUsd) || 0, 0),
      source: ['WhatsApp', 'Storefront', 'Facebook', 'Referral', 'Direct'].includes(b.source)
        ? b.source
        : 'WhatsApp',
      status: stage,
      score: Math.min(Math.max(Number(b.score) || 50, 0), 100),
      notes: b.notes ? String(b.notes).trim() : '',
      createdAt: now,
      updatedAt: now,
      metaLastEvent: null,
      metaSyncStatus: 'skipped',
    };

    if (stage === 'Qualified' || stage === 'Won') {
      const dispatch = await reportCrmStageToMeta(lead);
      lead.metaLastEvent = dispatch.eventName;
      lead.metaSyncStatus = dispatch.status;
      lead.metaLastSyncAt = new Date().toISOString();
      lead.metaLastMessage = dispatch.message;
    }

    leadStore.unshift(lead);
    res.status(201).json({ ok: true, lead });
  });

  app.patch('/api/admin/crm/leads/:id', requireAdmin, async (req, res) => {
    const idx = leadStore.findIndex((l) => l.leadId === req.params.id);
    if (idx < 0) {
      res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      return;
    }
    const patch = req.body || {};
    if (patch.status && !CRM_STAGES.includes(patch.status)) {
      res.status(400).json({ ok: false, error: 'BAD_STATUS' });
      return;
    }

    const existing = leadStore[idx];
    const stageChanged = Boolean(patch.status && patch.status !== existing.status);

    const updated: CrmLead = {
      ...existing,
      businessName:
        typeof patch.businessName === 'string' && patch.businessName.trim()
          ? patch.businessName.trim()
          : existing.businessName,
      contactName:
        typeof patch.contactName === 'string' ? patch.contactName.trim() : existing.contactName,
      email: typeof patch.email === 'string' ? patch.email.trim() : existing.email,
      phone: typeof patch.phone === 'string' ? patch.phone.trim() : existing.phone,
      ctwaClid:
        typeof patch.ctwaClid === 'string' ? patch.ctwaClid.trim() || undefined : existing.ctwaClid,
      expectedValueUsd:
        patch.expectedValueUsd !== undefined
          ? Math.max(Number(patch.expectedValueUsd) || 0, 0)
          : existing.expectedValueUsd,
      status: patch.status || existing.status,
      score:
        patch.score !== undefined
          ? Math.min(Math.max(Number(patch.score) || 0, 0), 100)
          : existing.score,
      notes: typeof patch.notes === 'string' ? patch.notes : existing.notes,
      updatedAt: new Date().toISOString(),
    };

    let metaResult = null;
    if (stageChanged) {
      metaResult = await reportCrmStageToMeta(updated);
      if (!metaResult.skipped) {
        updated.metaLastEvent = metaResult.eventName;
        updated.metaSyncStatus = metaResult.status;
        updated.metaLastSyncAt = new Date().toISOString();
        updated.metaLastMessage = metaResult.message;
      }
    }

    leadStore[idx] = updated;
    res.json({ ok: true, lead: updated, metaDispatch: metaResult });
  });

  app.post('/api/admin/crm/leads/:id/resend', requireAdmin, async (req, res) => {
    const idx = leadStore.findIndex((l) => l.leadId === req.params.id);
    if (idx < 0) {
      res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      return;
    }
    const lead = leadStore[idx];
    const metaResult = await reportCrmStageToMeta(lead);
    if (!metaResult.skipped) {
      lead.metaLastEvent = metaResult.eventName;
      lead.metaSyncStatus = metaResult.status;
      lead.metaLastSyncAt = new Date().toISOString();
      lead.metaLastMessage = metaResult.message;
    }
    res.json({ ok: true, lead, metaDispatch: metaResult });
  });

  app.post('/api/admin/crm/leads/:id/resend-tiktok', requireAdmin, async (req, res) => {
    const idx = leadStore.findIndex((l) => l.leadId === req.params.id);
    if (idx < 0) {
      res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      return;
    }
    const lead = leadStore[idx];
    const eventName = lead.status === 'Won' ? 'CompletePayment' : 'SubmitForm';
    const ttResult = await dispatchTikTokEvent(eventName, lead.leadId, {
      email: lead.email,
      phone: lead.phone,
      valueUsd: lead.expectedValueUsd,
    });
    lead.tiktokSyncStatus = ttResult.status;
    res.json({ ok: true, lead, tiktokDispatch: ttResult });
  });

  app.delete('/api/admin/crm/leads/:id', requireAdmin, (req, res) => {
    const idx = leadStore.findIndex((l) => l.leadId === req.params.id);
    if (idx < 0) {
      res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      return;
    }
    leadStore.splice(idx, 1);
    res.json({ ok: true });
  });

  // Orders Routes
  app.get('/api/admin/orders', requireAdmin, (_req, res) => {
    res.json({ ok: true, orders: orderStore });
  });

  app.post('/api/admin/orders', requireAdmin, (req, res) => {
    const b = req.body || {};
    const customerEmail = String(b.customerEmail || '').trim();
    const rawItems: Array<{ sku: string; qty: number }> = Array.isArray(b.items) ? b.items : [];

    if (!customerEmail || rawItems.length === 0) {
      res.status(400).json({ ok: false, error: 'customerEmail and at least one item required' });
      return;
    }

    const items: OrderItem[] = [];
    for (const entry of rawItems) {
      const product = catalogStore.find((p) => p.sku === entry.sku);
      if (!product) continue;
      const qty = Math.min(Math.max(Math.floor(Number(entry.qty) || 1), 1), 50);
      items.push({
        sku: product.sku,
        name: product.name,
        qty,
        priceUsd: product.priceUsd,
      });
    }

    if (items.length === 0) {
      res.status(400).json({ ok: false, error: 'NO_VALID_ITEMS' });
      return;
    }

    const totalUsd = Number(items.reduce((s, i) => s + i.priceUsd * i.qty, 0).toFixed(2));
    const allowedChannels = [
      'WhatsApp',
      'PayPal',
      'JazzCash / EasyPaisa',
      'Stripe',
      'Manual',
    ] as const;

    const order: OrderRecord = {
      id: `PB-ORD-${String(Date.now()).slice(-6)}`,
      customerEmail,
      customerPhone: b.customerPhone ? String(b.customerPhone).trim() : undefined,
      channel: allowedChannels.includes(b.channel) ? b.channel : 'Manual',
      paymentRef: String(b.paymentRef || `MAN-${Date.now().toString().slice(-5)}`).trim(),
      status: 'PENDING',
      totalUsd,
      totalPkr: Math.round(totalUsd * USD_TO_PKR),
      items,
      issuedKeys: [],
      createdAt: new Date().toISOString(),
    };

    orderStore.unshift(order);
    res.status(201).json({ ok: true, order });
  });

  app.post('/api/admin/orders/:id/fulfill', requireAdmin, async (req, res) => {
    const idx = orderStore.findIndex((o) => o.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      return;
    }
    const order = orderStore[idx];
    if (order.status === 'PAID_FULFILLED') {
      res.json({ ok: true, order, alreadyFulfilled: true });
      return;
    }

    const keys: string[] = [];
    for (const item of order.items) {
      for (let i = 0; i < item.qty; i++) {
        keys.push(generateLicenseKey(item.sku));
      }
    }

    order.status = 'PAID_FULFILLED';
    order.issuedKeys = keys;
    order.fulfilledAt = new Date().toISOString();

    const capi = await sendMetaOrderPurchase(order, req);
    order.metaCapiStatus = capi.status;

    res.json({ ok: true, order, metaCapi: capi });
  });

  app.delete('/api/admin/orders/:id', requireAdmin, (req, res) => {
    const idx = orderStore.findIndex((o) => o.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      return;
    }
    orderStore.splice(idx, 1);
    res.json({ ok: true });
  });

  // Domains Status & Compliance Routes
  app.get('/api/admin/domains', requireAdmin, (_req, res) => {
    res.json({
      ok: true,
      publisherId: 'ca-pub-9777611286139666',
      adsTxtLine: 'google.com, pub-9777611286139666, DIRECT, f08c47fec0942fa0',
      domains: domainStore,
    });
  });

  app.patch('/api/admin/domains/:domain', requireAdmin, (req, res) => {
    const idx = domainStore.findIndex((d) => d.domain === req.params.domain);
    if (idx < 0) {
      res.status(404).json({ ok: false, error: 'NOT_FOUND' });
      return;
    }
    const patch = req.body || {};
    const existing = domainStore[idx];
    domainStore[idx] = {
      ...existing,
      privacyOk: typeof patch.privacyOk === 'boolean' ? patch.privacyOk : existing.privacyOk,
      termsOk: typeof patch.termsOk === 'boolean' ? patch.termsOk : existing.termsOk,
      inCloudflareAccount:
        typeof patch.inCloudflareAccount === 'boolean'
          ? patch.inCloudflareAccount
          : existing.inCloudflareAccount,
      actionRequired:
        typeof patch.actionRequired === 'string'
          ? patch.actionRequired || undefined
          : existing.actionRequired,
    };
    res.json({ ok: true, domain: domainStore[idx] });
  });

  // Social & Ad Platform Account Connections + Direct OAuth 2.0 Routes
  app.get('/api/admin/channels', requireAdmin, (_req, res) => {
    res.json({
      ok: true,
      callbackBaseUrl: getChannelCallbackBaseUrl(),
      channels: getAllChannelConnections(),
    });
  });

  app.post('/api/admin/channels/:platform/profile', requireAdmin, (req, res) => {
    const platform = String(req.params.platform || '');
    if (!isValidChannelPlatform(platform)) {
      res.status(400).json({ ok: false, message: 'Unsupported platform.' });
      return;
    }
    const b = req.body || {};
    const stored = channelProfilesStore[platform];
    if (typeof b.accountId === 'string') stored.accountId = b.accountId.trim().slice(0, 120);
    if (typeof b.secondaryId === 'string') stored.secondaryId = b.secondaryId.trim().slice(0, 120);
    if (typeof b.loginIdentifier === 'string') {
      stored.loginIdentifier = b.loginIdentifier.trim().slice(0, 120);
    }
    if (typeof b.notes === 'string') stored.notes = b.notes.trim().slice(0, 300);

    res.json({ ok: true, channel: getChannelConnectionPayload(platform) });
  });

  app.get('/api/admin/channels/:platform/oauth/url', requireAdmin, (req, res) => {
    const platform = String(req.params.platform || '');
    if (!isValidChannelPlatform(platform)) {
      res.status(400).json({ ok: false, message: 'Unsupported platform.' });
      return;
    }
    let fallbackOrigin = '';
    const rawOrigin = typeof req.query.origin === 'string' ? req.query.origin.trim() : '';
    if (rawOrigin) {
      try {
        const parsed = new URL(rawOrigin);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
          fallbackOrigin = parsed.origin;
        }
      } catch {
        // ignore invalid origin
      }
    }
    const result = buildChannelOAuthUrl(platform, fallbackOrigin);
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  });

  app.post('/api/admin/channels/:platform/verify', requireAdmin, async (req, res) => {
    const platform = String(req.params.platform || '');
    if (!isValidChannelPlatform(platform)) {
      res.status(400).json({ ok: false, message: 'Unsupported platform.' });
      return;
    }
    const result = await verifyChannelConnection(platform);
    res.json({
      ok: result.ok,
      detail: result.detail,
      channel: getChannelConnectionPayload(platform),
    });
  });

  app.post('/api/admin/channels/:platform/disconnect', requireAdmin, (req, res) => {
    const platform = String(req.params.platform || '');
    if (!isValidChannelPlatform(platform)) {
      res.status(400).json({ ok: false, message: 'Unsupported platform.' });
      return;
    }
    channelOAuthTokens.delete(platform);
    const stored = channelProfilesStore[platform];
    stored.connectedAt = undefined;
    stored.connectedEmail = undefined;
    stored.lastVerifiedAt = new Date().toISOString();
    stored.lastVerifyDetail = 'OAuth session disconnected.';
    res.json({ ok: true, channel: getChannelConnectionPayload(platform) });
  });

  // Popup OAuth 2.0 Callback Handler (handles both with and without trailing slash)
  app.get(
    ['/auth/oauth/:platform/callback', '/auth/oauth/:platform/callback/'],
    async (req, res) => {
      const platform = String(req.params.platform || '');
      const code = typeof req.query.code === 'string' ? req.query.code : '';
      const state = typeof req.query.state === 'string' ? req.query.state : '';
      const oauthError = typeof req.query.error === 'string' ? req.query.error : '';

      let payload: { type: 'OAUTH_AUTH_SUCCESS' | 'OAUTH_AUTH_ERROR'; platform: string; error?: string };

      if (!isValidChannelPlatform(platform)) {
        payload = { type: 'OAUTH_AUTH_ERROR', platform: 'unknown', error: 'UNSUPPORTED_PLATFORM' };
      } else if (oauthError) {
        payload = { type: 'OAUTH_AUTH_ERROR', platform, error: oauthError.slice(0, 120) };
      } else if (!code || !state) {
        payload = { type: 'OAUTH_AUTH_ERROR', platform, error: 'MISSING_CODE_OR_STATE' };
      } else {
        const result = await exchangeChannelOAuthCode(platform, code, state);
        payload = result.ok
          ? { type: 'OAUTH_AUTH_SUCCESS', platform }
          : { type: 'OAUTH_AUTH_ERROR', platform, error: result.error || 'TOKEN_EXCHANGE_FAILED' };
      }

      const serialized = JSON.stringify(payload).replace(/</g, '\\u003c');
      const statusText =
        payload.type === 'OAUTH_AUTH_SUCCESS'
          ? 'Connection complete. This window will close automatically.'
          : 'Authorization could not be completed. You may close this window.';

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>PlayBeat OAuth Callback</title></head>
  <body style="font-family:system-ui,sans-serif;padding:24px;color:#18181b;">
    <p>${statusText}</p>
    <script>
      (function () {
        var msg = ${serialized};
        if (window.opener) {
          window.opener.postMessage(msg, '*');
          window.close();
        } else {
          window.location.href = '/';
        }
      })();
    </script>
  </body>
</html>`);
    },
  );

  // Vite middleware in development; static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PlayBeat Admin Console running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start PlayBeat Admin Console server:', err);
  process.exit(1);
});
