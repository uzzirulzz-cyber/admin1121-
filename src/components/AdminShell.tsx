import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Globe,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  Plug,
  Share2,
  ShoppingBag,
  Sun,
  UserCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import type { ProfileCoverTheme, UserProfile } from '../types/admin';

export type NavSection =
  | 'overview'
  | 'adsense'
  | 'channels'
  | 'affiliate'
  | 'crm'
  | 'orders'
  | 'catalog'
  | 'customers'
  | 'domains'
  | 'integrations'
  | 'profile';

export const ARGON_COVER_THEMES: Record<
  ProfileCoverTheme,
  {
    label: string;
    hex: string;
    bannerClass: string;
    scrimClass: string;
    accentTextClass: string;
  }
> = {
  'argon-blue': {
    label: 'Argon Indigo',
    hex: '#5e72e4',
    bannerClass: 'bg-[#5e72e4]',
    scrimClass: 'bg-[#5e72e4]/70',
    accentTextClass: 'text-[#5e72e4]',
  },
  'argon-ocean': {
    label: 'Ocean Blue',
    hex: '#1171ef',
    bannerClass: 'bg-[#1171ef]',
    scrimClass: 'bg-[#1171ef]/70',
    accentTextClass: 'text-[#1171ef]',
  },
  'argon-emerald': {
    label: 'Emerald',
    hex: '#2dce89',
    bannerClass: 'bg-[#2dce89]',
    scrimClass: 'bg-[#2dce89]/70',
    accentTextClass: 'text-[#2dce89]',
  },
  'argon-sunset': {
    label: 'Sunset Coral',
    hex: '#fb6340',
    bannerClass: 'bg-[#fb6340]',
    scrimClass: 'bg-[#fb6340]/70',
    accentTextClass: 'text-[#fb6340]',
  },
  'argon-slate': {
    label: 'Deep Slate',
    hex: '#172b4d',
    bannerClass: 'bg-[#172b4d]',
    scrimClass: 'bg-[#172b4d]/75',
    accentTextClass: 'text-[#172b4d]',
  },
};

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

const OPERATIONS_NAV: NavItem[] = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, iconColor: 'text-[#5e72e4]' },
  { id: 'adsense', label: 'AdSense Revenue', icon: BarChart3, iconColor: 'text-[#fb6340]' },
  { id: 'channels', label: 'Social & Ad Accounts', icon: Share2, iconColor: 'text-[#11cdef]' },
  { id: 'affiliate', label: 'Electronic First API', icon: Handshake, iconColor: 'text-[#2dce89]' },
  { id: 'crm', label: 'CRM & WhatsApp', icon: Users, iconColor: 'text-[#f5365c]' },
  { id: 'orders', label: 'Orders & Keys', icon: ShoppingBag, iconColor: 'text-[#5e72e4]' },
  { id: 'catalog', label: 'Catalog & TV', icon: Package, iconColor: 'text-[#fb6340]' },
  { id: 'domains', label: 'Domains', icon: Globe, iconColor: 'text-[#11cdef]' },
  { id: 'integrations', label: 'Integrations & Worker', icon: Plug, iconColor: 'text-[#2dce89]' },
];

const ACCOUNT_NAV: NavItem[] = [
  { id: 'profile', label: 'User Profile', icon: UserCog, iconColor: 'text-[#5e72e4]' },
  { id: 'customers', label: 'Customers & Access', icon: UserCheck, iconColor: 'text-[#f5365c]' },
];

const SECTION_LABELS: Record<NavSection, string> = {
  overview: 'Dashboard',
  adsense: 'AdSense Revenue',
  channels: 'Social & Ad Accounts',
  affiliate: 'Electronic First API',
  crm: 'CRM & WhatsApp',
  orders: 'Orders & Keys',
  catalog: 'Catalog & TV',
  customers: 'Customers & Access',
  domains: 'Domains',
  integrations: 'Integrations & Worker',
  profile: 'User Profile',
};

export function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'PB';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

interface AdminShellProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  userProfile?: UserProfile | null;
  dark: boolean;
  onToggleTheme: () => void;
  onSignOut: () => void;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export function AdminShell({
  activeSection,
  onSelectSection,
  userProfile,
  dark,
  onToggleTheme,
  onSignOut,
  headerAction,
  children,
}: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const displayName = userProfile?.displayName || 'PlayBeat Operator';
  const displayEmail = userProfile?.email || 'playbeat.digital';
  const brandTitle = userProfile?.brandTitle || 'PlayBeat Admin';
  const avatarUrl = userProfile?.avatarUrl || '';
  const coverThemeKey: ProfileCoverTheme =
    userProfile?.coverTheme && ARGON_COVER_THEMES[userProfile.coverTheme]
      ? userProfile.coverTheme
      : 'argon-blue';
  const coverTheme = ARGON_COVER_THEMES[coverThemeKey];

  useEffect(() => {
    setAvatarError(false);
  }, [avatarUrl]);

  // Overview and User Profile feature floating Argon cards straddling the colored header band.
  // Other operational pages sit cleanly below a compact Argon banner so their dark/light titles keep WCAG AA contrast.
  const straddlesBanner = activeSection === 'overview' || activeSection === 'profile';

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = activeSection === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          onSelectSection(item.id);
          setMobileOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm rounded-xl transition-colors whitespace-nowrap ${
          active
            ? 'bg-[#f6f9fc] dark:bg-[#1b2859] text-[#344767] dark:text-white font-semibold'
            : 'text-[#67748e] dark:text-slate-300 font-medium hover:bg-[#f8f9fe] dark:hover:bg-[#182450] hover:text-[#344767] dark:hover:text-white'
        }`}
      >
        <span
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            active
              ? 'bg-white dark:bg-[#111c44] shadow-xs'
              : 'bg-transparent'
          }`}
        >
          <Icon className={`w-4 h-4 shrink-0 ${item.iconColor}`} />
        </span>
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#111c44] border border-[#e9ecef] dark:border-[#1e2952] lg:rounded-2xl shadow-[0_0_2rem_0_rgba(136,152,170,0.15)] dark:shadow-[0_0_2rem_0_rgba(0,0,0,0.4)] overflow-hidden">
      {/* Argon Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-[#e9ecef] dark:border-[#1e2952] shrink-0">
        <button
          type="button"
          onClick={() => {
            onSelectSection('overview');
            setMobileOpen(false);
          }}
          className="flex items-center gap-2.5 min-w-0 text-left"
        >
          <span
            className={`w-8 h-8 rounded-lg ${coverTheme.bannerClass} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs`}
          >
            PB
          </span>
          <span className="text-sm font-bold tracking-tight text-[#344767] dark:text-white truncate">
            {brandTitle}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 text-[#67748e] hover:text-[#344767] dark:hover:text-white rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Grouped Argon Navigation */}
      <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <div className="space-y-1">
          <p className="px-3.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#8392ab] dark:text-slate-400">
            Operations
          </p>
          {OPERATIONS_NAV.map(renderNavItem)}
        </div>

        <div className="space-y-1 pt-2 border-t border-[#e9ecef] dark:border-[#1e2952]">
          <p className="px-3.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#8392ab] dark:text-slate-400">
            Account Pages
          </p>
          {ACCOUNT_NAV.map(renderNavItem)}
        </div>
      </nav>

      {/* Operator Footer */}
      <div className="p-4 border-t border-[#e9ecef] dark:border-[#1e2952] space-y-3 shrink-0 bg-[#fafbfe] dark:bg-[#0e1738]">
        <button
          type="button"
          onClick={() => {
            onSelectSection('profile');
            setMobileOpen(false);
          }}
          className="w-full flex items-center gap-3 p-1.5 -m-1.5 rounded-xl hover:bg-[#f6f9fc] dark:hover:bg-[#182450] transition-colors text-left"
        >
          {avatarUrl && !avatarError ? (
            <img
              src={avatarUrl}
              alt={displayName}
              referrerPolicy="no-referrer"
              onError={() => setAvatarError(true)}
              className="w-9 h-9 rounded-full object-cover border border-[#e9ecef] dark:border-[#1e2952] shrink-0"
            />
          ) : (
            <div
              className={`w-9 h-9 rounded-full ${coverTheme.bannerClass} text-white flex items-center justify-center text-xs font-bold shrink-0`}
            >
              {getInitials(displayName)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#344767] dark:text-white truncate">
              {displayName}
            </p>
            <p className="text-[11px] text-[#8392ab] dark:text-slate-400 truncate">
              {displayEmail}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-[#344767] dark:text-slate-200 bg-white dark:bg-[#111c44] border border-[#dee2e6] dark:border-[#1e2952] rounded-lg hover:bg-[#f6f9fc] dark:hover:bg-[#182450] transition-colors whitespace-nowrap"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fe] dark:bg-[#0b1437] text-[#344767] dark:text-slate-100 relative">
      {/* Argon Signature Full-Width Top Header Band */}
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 pointer-events-none transition-colors duration-200 ${
          coverTheme.bannerClass
        } ${straddlesBanner ? 'h-64' : 'h-[76px]'}`}
      />

      <div className="relative z-10 flex min-h-screen">
        {/* Desktop Floating Argon Sidebar */}
        <aside className="hidden lg:block w-[264px] shrink-0 p-4">
          <div className="sticky top-4 h-[calc(100vh-2rem)]">{sidebarContent}</div>
        </aside>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-[#0b1437]/60"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <aside className="relative z-10 w-68 max-w-[82vw] h-full">{sidebarContent}</aside>
          </div>
        )}

        {/* Main Workspace */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Argon Translucent Top Navbar over Colored Band */}
          <header className="px-4 sm:px-6 lg:px-8 h-[76px] flex items-center justify-between gap-4 text-white shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation menu"
                className="lg:hidden p-2 -ml-2 text-white/90 hover:bg-white/15 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-white/80">
                  <span className="whitespace-nowrap">Pages</span>
                  <span aria-hidden="true">/</span>
                  <span className="truncate font-medium text-white">
                    {SECTION_LABELS[activeSection]}
                  </span>
                </div>
                <p className="text-base font-bold tracking-tight text-white truncate">
                  {SECTION_LABELS[activeSection]}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => onSelectSection('profile')}
                className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <span className="truncate max-w-[140px]">{displayName}</span>
              </button>
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                className="inline-flex items-center justify-center w-9 h-9 text-white bg-white/15 hover:bg-white/25 rounded-lg transition-colors shrink-0"
              >
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              {headerAction}
            </div>
          </header>

          <main
            className={`flex-1 px-4 sm:px-6 lg:px-8 pb-10 max-w-[1440px] w-full mx-auto ${
              straddlesBanner ? 'pt-4' : 'pt-6'
            }`}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
