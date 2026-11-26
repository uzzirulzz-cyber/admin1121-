import React, { useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { AccountRole, AuthStatusResponse } from '../types/admin';
import { api, setAuthToken } from '../lib/api';
import { trackTikTokEvent } from '../lib/tiktokPixel';

interface LoginViewProps {
  authStatus: AuthStatusResponse;
  dark: boolean;
  onToggleTheme: () => void;
  onAuthenticated: (role: AccountRole) => void;
}

type AuthTab = 'signin' | 'register' | 'reset';
type SignInKind = 'admin' | 'customer';

interface DialTick {
  key: number;
  major: boolean;
  x1: string;
  y1: string;
  x2: string;
  y2: string;
}

export function LoginView({
  authStatus,
  onAuthenticated,
}: LoginViewProps) {
  const isSetup = authStatus.mode === 'setup_required';
  const [tab, setTab] = useState<AuthTab>('signin');
  const [signInKind, setSignInKind] = useState<SignInKind>('admin');

  // Sign-in & setup fields
  const [accountIdentifier, setAccountIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Open Account fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Reset Password fields
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetStage, setResetStage] = useState<'request' | 'redeem'>('request');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const dialTicks = useMemo<DialTick[]>(() => {
    const list: DialTick[] = [];
    for (let i = 0; i < 120; i++) {
      const a = (i * 3 * Math.PI) / 180;
      const major = i % 10 === 0;
      const r1 = major ? 79 : 82;
      const r2 = 88;
      const c = Math.cos(a);
      const n = Math.sin(a);
      list.push({
        key: i,
        major,
        x1: (r1 * c).toFixed(2),
        y1: (r1 * n).toFixed(2),
        x2: (r2 * c).toFixed(2),
        y2: (r2 * n).toFixed(2),
      });
    }
    return list;
  }, []);

  function switchTab(next: AuthTab) {
    setTab(next);
    setError(null);
    setInfo(null);
  }

  async function handleSignInOrSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (isSetup) {
      if (password.length < 8) {
        setError('Admin password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    } else if (signInKind === 'admin') {
      if (!password.trim()) {
        setError('Enter your admin password.');
        return;
      }
    } else {
      if (!accountIdentifier.trim() || !password) {
        setError('Enter your Account ID or email and password.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = isSetup
        ? await api.setupAdmin(password)
        : signInKind === 'admin'
          ? await api.login(password)
          : await api.customerLogin(accountIdentifier.trim(), password);
      setAuthToken(res.token);
      onAuthenticated(res.role || 'admin');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      setError(
        msg === 'ADMIN_BAD_PASSWORD'
          ? 'Incorrect admin password. Please try again.'
          : msg,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setError('Fill in every required field to continue.');
      return;
    }
    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (regConfirm && regPassword !== regConfirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.registerAccount({
        displayName: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim() || undefined,
        password: regPassword,
      });
      void trackTikTokEvent(
        'CompleteRegistration',
        {
          contents: [
            {
              content_id: 'playbeat_account',
              content_type: 'product',
              content_name: 'PlayBeat Account Registration',
            },
          ],
          value: 0,
          currency: 'USD',
        },
        {
          email: regEmail.trim(),
          phone: regPhone.trim() || undefined,
          externalId: regEmail.trim().toLowerCase(),
        },
      );
      setAuthToken(res.token);
      onAuthenticated(res.role || 'customer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open account.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!resetEmail.trim()) {
      setError('Enter your account email address.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.forgotPassword(resetEmail.trim());
      setInfo(res.message);
      setResetStage('redeem');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit reset request.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRedeemReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!resetEmail.trim() || !resetCode.trim()) {
      setError('Enter your account email and one-time reset code.');
      return;
    }
    if (resetNewPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.resetPasswordWithCode({
        email: resetEmail.trim(),
        resetCode: resetCode.trim(),
        newPassword: resetNewPassword,
      });
      setResetCode('');
      setResetNewPassword('');
      setResetConfirmPassword('');
      setAccountIdentifier(resetEmail.trim());
      setSignInKind('customer');
      setTab('signin');
      setInfo(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'pb-glass-input w-full h-[50px] px-4 rounded-[10px] text-white text-[15px] font-medium placeholder:text-[#7088ad]';

  const labelClass =
    'block text-[12.5px] font-semibold uppercase tracking-[0.06em] mb-2 text-[#c5d7f2]';

  return (
    <div className="pb-login-page">
      {/* Flowing optical water caustic pools beneath the glass plane */}
      <div className="pb-water-caustic" aria-hidden="true" />
      <div className="pb-water-caustic-2" aria-hidden="true" />

      <main className="relative z-10 min-h-screen max-w-[1220px] mx-auto px-4 sm:px-8 py-8 lg:py-10 grid grid-cols-1 lg:grid-cols-[1.04fr_1fr] items-center gap-8 lg:gap-12">
        {/* LEFT HERO: PlayBeat Digital Optical Glass Lens Emblem + Headline */}
        <section
          aria-label="PlayBeat Digital"
          className="flex flex-col items-center text-center gap-6"
        >
          <div className="pb-logo-wrap">
            <div className="pb-sweep" aria-hidden="true" />
            <svg
              className="pb-dial"
              viewBox="-100 -100 200 200"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="pb-dial-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#2563eb" />
                  <stop offset="0.55" stopColor="#38bdf8" />
                  <stop offset="1" stopColor="#e0f2fe" />
                </linearGradient>
              </defs>
              <circle className="pb-dial-track" r="85" />
              <g>
                {dialTicks.map((t) => (
                  <line
                    key={t.key}
                    className={t.major ? 'pb-dial-tick pb-dial-major' : 'pb-dial-tick'}
                    x1={t.x1}
                    y1={t.y1}
                    x2={t.x2}
                    y2={t.y2}
                  />
                ))}
              </g>
              <circle className="pb-dial-arc" r="85" stroke="url(#pb-dial-grad)" />
              <circle className="pb-dial-arc2" r="85" stroke="url(#pb-dial-grad)" />
            </svg>
            <img
              src="/src/assets/images/playbeat_logo.webp"
              alt="PlayBeat Digital logo"
              className="pb-logo-img"
            />
          </div>

          <div className="space-y-3 max-w-[44ch]">
            <h2 className="pb-login-head text-[clamp(26px,3.1vw,38px)] leading-[1.12] font-semibold tracking-[0.015em] bg-gradient-to-b from-white via-[#e0f2fe] to-[#93c5fd] bg-clip-text text-transparent">
              Run every beat from one console
            </h2>

            <div
              className="mx-auto w-24 h-px bg-gradient-to-r from-transparent via-[#7dd3fc]/60 to-transparent"
              aria-hidden="true"
            />

            <p className="hidden sm:block text-[#9ab2d4] text-sm sm:text-[15px] leading-relaxed">
              Manage accounts, sessions, and operations for PlayBeat Digital from a single command surface.
            </p>
          </div>
        </section>

        {/* RIGHT LIQUID-GLASS AUTH CARD */}
        <section
          aria-label="Account access"
          className="pb-login-card p-6 sm:p-8 w-full max-w-[530px] mx-auto"
        >
          <div className="relative z-10">
            {/* Brand Row */}
            <div className="pb-login-head flex items-center justify-between gap-3 pb-4 mb-5 border-b border-[#bae6fd]/14">
              <div className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[0.02em] text-[#eef6ff]">
                <span className="grid place-items-center w-8 h-8 rounded-[9px] text-xs font-bold text-white bg-gradient-to-b from-[#3892ff] to-[#0f45be] border border-[#e0f2fe]/45 shadow-[0_6px_18px_rgba(31,107,255,0.5),inset_0_1px_0_rgba(255,255,255,0.65)] shrink-0">
                  PB
                </span>
                <span>PlayBeat Admin</span>
              </div>
              <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#7dd3fc]/85">
                Console
              </span>
            </div>

            {/* 3-Tab Switcher */}
            {!isSetup && (
              <div
                role="tablist"
                className="pb-glass-rail grid grid-cols-3 gap-1 p-1 rounded-[12px]"
              >
                {[
                  { id: 'signin' as const, label: 'Sign In' },
                  { id: 'register' as const, label: 'Open Account' },
                  { id: 'reset' as const, label: 'Reset Password' },
                ].map((t) => {
                  const selected = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => switchTab(t.id)}
                      className={`py-2.5 px-1.5 text-[13px] sm:text-[13.5px] font-semibold rounded-[9px] transition-all cursor-pointer whitespace-nowrap ${
                        selected ? 'pb-glass-tab-active' : 'pb-glass-tab-idle'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* SIGN IN / FIRST-RUN SETUP */}
            {(isSetup || tab === 'signin') && (
              <>
                <h1 className="pb-login-head text-[clamp(24px,3vw,30px)] leading-[1.12] font-bold tracking-[0.01em] text-white mt-6 mb-2">
                  {isSetup
                    ? 'Claim Admin Access'
                    : 'Sign in to PlayBeat Admin'}
                </h1>
                <p className="text-[14.5px] text-[#9ab2d4] leading-relaxed mb-5">
                  {isSetup
                    ? 'Set an initial administrator password to initialize access to this console.'
                    : signInKind === 'admin'
                      ? 'Enter your administrator password to access PlayBeat operations.'
                      : 'Use your account ID or email with your password to continue.'}
                </p>

                {!isSetup && (
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    <button
                      type="button"
                      aria-pressed={signInKind === 'admin'}
                      onClick={() => {
                        setSignInKind('admin');
                        setError(null);
                      }}
                      className={`px-3.5 py-2.5 rounded-[10px] border text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        signInKind === 'admin'
                          ? 'pb-glass-toggle-active'
                          : 'pb-glass-toggle-idle'
                      }`}
                    >
                      Admin Operator
                    </button>
                    <button
                      type="button"
                      aria-pressed={signInKind === 'customer'}
                      onClick={() => {
                        setSignInKind('customer');
                        setError(null);
                      }}
                      className={`px-3.5 py-2.5 rounded-[10px] border text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        signInKind === 'customer'
                          ? 'pb-glass-toggle-active'
                          : 'pb-glass-toggle-idle'
                      }`}
                    >
                      Account ID / Email
                    </button>
                  </div>
                )}

                <form onSubmit={handleSignInOrSetup} className="space-y-4" noValidate>
                  {!isSetup && signInKind === 'customer' && (
                    <div>
                      <label htmlFor="account-identifier" className={labelClass}>
                        Account ID or email
                      </label>
                      <input
                        id="account-identifier"
                        type="text"
                        autoComplete="username"
                        value={accountIdentifier}
                        onChange={(e) => setAccountIdentifier(e.target.value)}
                        placeholder="you@playbeat.com or uid_pb_..."
                        className={inputClass}
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="admin-password" className={labelClass}>
                      {isSetup
                        ? 'New Admin Password'
                        : signInKind === 'admin'
                          ? 'Admin Password'
                          : 'Password'}
                    </label>
                    <div className="relative">
                      <input
                        id="admin-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={isSetup ? 'new-password' : 'current-password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isSetup ? 'Minimum 8 characters' : 'Enter password'}
                        className={`${inputClass} pr-12`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-1.5 top-1.5 w-9 h-9 rounded-lg text-[#93a9ca] hover:text-white hover:bg-[#bae6fd]/10 grid place-items-center transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                      </button>
                    </div>
                  </div>

                  {isSetup && (
                    <div>
                      <label htmlFor="admin-password-confirm" className={labelClass}>
                        Confirm Password
                      </label>
                      <input
                        id="admin-password-confirm"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className={inputClass}
                        required
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="pb-login-go pb-login-head w-full h-[52px] mt-1.5 rounded-[11px] text-white text-[15px] font-bold tracking-[0.06em] uppercase disabled:opacity-60 cursor-pointer whitespace-nowrap"
                  >
                    {submitting
                      ? isSetup
                        ? 'Creating Session...'
                        : 'Signing In...'
                      : isSetup
                        ? 'Set Password & Enter Console'
                        : 'Sign In'}
                  </button>
                </form>
              </>
            )}

            {/* OPEN ACCOUNT */}
            {!isSetup && tab === 'register' && (
              <>
                <h1 className="pb-login-head text-[clamp(24px,3vw,30px)] leading-[1.12] font-bold tracking-[0.01em] text-white mt-6 mb-2">
                  Open your account
                </h1>
                <p className="text-[14.5px] text-[#9ab2d4] leading-relaxed mb-5">
                  Create a PlayBeat account to manage orders, license keys, and profile security.
                </p>

                <form onSubmit={handleRegister} className="space-y-4" noValidate>
                  <div>
                    <label htmlFor="reg-name" className={labelClass}>
                      Full name
                    </label>
                    <input
                      id="reg-name"
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Your name"
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="reg-email" className={labelClass}>
                        Email
                      </label>
                      <input
                        id="reg-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="you@playbeat.com"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-phone" className={labelClass}>
                        Phone (Optional)
                      </label>
                      <input
                        id="reg-phone"
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+92300..."
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="reg-password" className={labelClass}>
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="reg-password"
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          minLength={8}
                          autoComplete="new-password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Min 8 chars"
                          className={`${inputClass} pr-11`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword((v) => !v)}
                          aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-1.5 top-1.5 w-9 h-9 rounded-lg text-[#93a9ca] hover:text-white hover:bg-[#bae6fd]/10 grid place-items-center transition-colors cursor-pointer"
                        >
                          {showRegPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="reg-confirm" className={labelClass}>
                        Confirm Password
                      </label>
                      <input
                        id="reg-confirm"
                        type={showRegPassword ? 'text' : 'password'}
                        minLength={8}
                        autoComplete="new-password"
                        value={regConfirm}
                        onChange={(e) => setRegConfirm(e.target.value)}
                        placeholder="Repeat password"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="pb-login-go pb-login-head w-full h-[52px] mt-1.5 rounded-[11px] text-white text-[15px] font-bold tracking-[0.06em] uppercase disabled:opacity-60 cursor-pointer whitespace-nowrap"
                  >
                    {submitting ? 'Opening Account...' : 'Open Account'}
                  </button>
                </form>
              </>
            )}

            {/* RESET PASSWORD */}
            {!isSetup && tab === 'reset' && (
              <>
                <h1 className="pb-login-head text-[clamp(24px,3vw,30px)] leading-[1.12] font-bold tracking-[0.01em] text-white mt-6 mb-2">
                  Reset your password
                </h1>
                <p className="text-[14.5px] text-[#9ab2d4] leading-relaxed mb-5">
                  Request a reset or redeem a one-time reset code issued by an administrator.
                </p>

                <div className="grid grid-cols-2 gap-2 mb-5">
                  <button
                    type="button"
                    aria-pressed={resetStage === 'request'}
                    onClick={() => {
                      setResetStage('request');
                      setError(null);
                    }}
                    className={`px-3.5 py-2.5 rounded-[10px] border text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      resetStage === 'request'
                        ? 'pb-glass-toggle-active'
                        : 'pb-glass-toggle-idle'
                    }`}
                  >
                    1. Request Reset
                  </button>
                  <button
                    type="button"
                    aria-pressed={resetStage === 'redeem'}
                    onClick={() => {
                      setResetStage('redeem');
                      setError(null);
                    }}
                    className={`px-3.5 py-2.5 rounded-[10px] border text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      resetStage === 'redeem'
                        ? 'pb-glass-toggle-active'
                        : 'pb-glass-toggle-idle'
                    }`}
                  >
                    2. Enter Reset Code
                  </button>
                </div>

                {resetStage === 'request' ? (
                  <form onSubmit={handleRequestReset} className="space-y-4" noValidate>
                    <div>
                      <label htmlFor="reset-email" className={labelClass}>
                        Account email
                      </label>
                      <input
                        id="reset-email"
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="you@playbeat.com"
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="pb-login-go pb-login-head w-full h-[52px] mt-1.5 rounded-[11px] text-white text-[15px] font-bold tracking-[0.06em] uppercase disabled:opacity-60 cursor-pointer whitespace-nowrap"
                    >
                      {submitting ? 'Submitting...' : 'Send Reset Request'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRedeemReset} className="space-y-4" noValidate>
                    <div>
                      <label htmlFor="redeem-email" className={labelClass}>
                        Account email
                      </label>
                      <input
                        id="redeem-email"
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="you@playbeat.com"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="redeem-code" className={labelClass}>
                        One-Time Reset Code
                      </label>
                      <input
                        id="redeem-code"
                        type="text"
                        required
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="PB-XXXXXXXX-XXXXXXXX"
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label htmlFor="redeem-new-pass" className={labelClass}>
                          New Password
                        </label>
                        <input
                          id="redeem-new-pass"
                          type="password"
                          required
                          minLength={8}
                          value={resetNewPassword}
                          onChange={(e) => setResetNewPassword(e.target.value)}
                          placeholder="Min 8 chars"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="redeem-confirm-pass" className={labelClass}>
                          Confirm Password
                        </label>
                        <input
                          id="redeem-confirm-pass"
                          type="password"
                          required
                          minLength={8}
                          value={resetConfirmPassword}
                          onChange={(e) => setResetConfirmPassword(e.target.value)}
                          placeholder="Repeat password"
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="pb-login-go pb-login-head w-full h-[52px] mt-1.5 rounded-[11px] text-white text-[15px] font-bold tracking-[0.06em] uppercase disabled:opacity-60 cursor-pointer whitespace-nowrap"
                    >
                      {submitting ? 'Updating Password...' : 'Reset Password'}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* Live Status / Error Message */}
            <div role="status" aria-live="polite" className="min-h-[22px] mt-3.5 text-[13.5px]">
              {error && <p className="text-[#fca5a5] font-medium">{error}</p>}
              {!error && info && <p className="text-[#7dd3fc] font-medium">{info}</p>}
            </div>

            {/* Minimal Brand Footer */}
            <div className="mt-4 pt-4 border-t border-[#bae6fd]/14 flex items-center justify-between text-[12px] text-[#7e98be]">
              <span>PlayBeat Digital</span>
              <span className="font-mono tracking-[0.04em] text-[#93b4dc]">playbeat.digital</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
