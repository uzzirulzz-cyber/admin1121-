import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  Globe,
  Handshake,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Maximize2,
  Menu,
  Minimize2,
  Moon,
  MoreVertical,
  Package,
  Palette,
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

export type PaperSidebarTheme = 'navy' | 'silver' | 'steel';
export type PaperAccentId = 'platinum' | 'silver' | 'sapphire' | 'cobalt' | 'chrome';

interface PaperAccentConfig {
  id: PaperAccentId;
  label: string;
  hex: string;
  brightHex: string;
  topHex: string;
  bottomHex: string;
  hoverTopHex: string;
  hoverBottomHex: string;
  fgHex: string;
  softRgba: string;
}

const PAPER_ACCENTS: Record<PaperAccentId, PaperAccentConfig> = {
  platinum: {
    id: 'platinum',
    label: 'Platinum Navy',
    hex: '#1e40af',
    brightHex: '#93c5fd',
    topHex: '#2b5ce0',
    bottomHex: '#16338f',
    hoverTopHex: '#376cf0',
    hoverBottomHex: '#1d41b3',
    fgHex: '#f8fafc',
    softRgba: 'rgba(59, 130, 246, 0.14)',
  },
  silver: {
    id: 'silver',
    label: 'Liquid Silver',
    hex: '#475569',
    brightHex: '#e2e8f0',
    topHex: '#64748b',
    bottomHex: '#334155',
    hoverTopHex: '#7889a0',
    hoverBottomHex: '#475569',
    fgHex: '#ffffff',
    softRgba: 'rgba(148, 163, 184, 0.18)',
  },
  sapphire: {
    id: 'sapphire',
    label: 'Sapphire Ice',
    hex: '#0284c7',
    brightHex: '#7dd3fc',
    topHex: '#0ea5e9',
    bottomHex: '#0369a1',
    hoverTopHex: '#38bdf8',
    hoverBottomHex: '#0284c7',
    fgHex: '#ffffff',
    softRgba: 'rgba(56, 189, 248, 0.15)',
  },
  cobalt: {
    id: 'cobalt',
    label: 'Cobalt Steel',
    hex: '#312e81',
    brightHex: '#a5b4fc',
    topHex: '#4338ca',
    bottomHex: '#1e1b4b',
    hoverTopHex: '#4f46e5',
    hoverBottomHex: '#312e81',
    fgHex: '#ffffff',
    softRgba: 'rgba(99, 102, 241, 0.15)',
  },
  chrome: {
    id: 'chrome',
    label: 'Chrome Teal',
    hex: '#0f766e',
    brightHex: '#5eead4',
    topHex: '#14b8a6',
    bottomHex: '#0f766e',
    hoverTopHex: '#2dd4bf',
    hoverBottomHex: '#0d9488',
    fgHex: '#ffffff',
    softRgba: 'rgba(20, 184, 166, 0.15)',
  },
};

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
  'argon-sunset': {
    label: 'Platinum Navy',
    hex: '#1e3a8a',
    bannerClass: 'bg-gradient-to-r from-[#0b162c] via-[#1e3a8a] to-[#3b5ea8]',
    scrimClass: 'bg-[#0b162c]/70',
    accentTextClass: 'text-[#1e40af]',
  },
  'argon-blue': {
    label: 'Sapphire Steel',
    hex: '#0369a1',
    bannerClass: 'bg-gradient-to-r from-[#082f49] via-[#0369a1] to-[#38bdf8]',
    scrimClass: 'bg-[#082f49]/70',
    accentTextClass: 'text-[#0284c7]',
  },
  'argon-ocean': {
    label: 'Midnight Abyss',
    hex: '#0f172a',
    bannerClass: 'bg-gradient-to-r from-[#050b18] via-[#0f1f40] to-[#1e3a8a]',
    scrimClass: 'bg-[#050b18]/75',
    accentTextClass: 'text-[#1d4ed8]',
  },
  'argon-emerald': {
    label: 'Chrome Slate',
    hex: '#334155',
    bannerClass: 'bg-gradient-to-r from-[#1e293b] via-[#475569] to-[#94a3b8]',
    scrimClass: 'bg-[#1e293b]/70',
    accentTextClass: 'text-[#475569]',
  },
  'argon-slate': {
    label: 'Brushed Silver',
    hex: '#64748b',
    bannerClass: 'bg-gradient-to-r from-[#334155] via-[#64748b] to-[#cbd5e1]',
    scrimClass: 'bg-[#334155]/70',
    accentTextClass: 'text-[#475a78]',
  },
};

interface NavItem {
  id: NavSection;
  label: string;
  miniCode: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

const OPERATIONS_NAV: NavItem[] = [
  { id: 'overview', label: 'Dashboard', miniCode: 'DB', icon: LayoutDashboard },
  { id: 'adsense', label: 'AdSense & GA4', miniCode: 'AS', icon: BarChart3 },
  { id: 'channels', label: 'Social & Ads', miniCode: 'SA', icon: Share2 },
  { id: 'affiliate', label: 'Electronic First', miniCode: 'EF', icon: Handshake },
  { id: 'crm', label: 'CRM & WhatsApp', miniCode: 'CR', icon: Users },
  { id: 'orders', label: 'Orders & Keys', miniCode: 'OR', icon: ShoppingBag },
  { id: 'catalog', label: 'Catalog & TV', miniCode: 'CT', icon: Package },
  { id: 'domains', label: 'Domains', miniCode: 'DM', icon: Globe },
  { id: 'integrations', label: 'Integrations', miniCode: 'IN', icon: Plug },
];

const SECTION_LABELS: Record<NavSection, string> = {
  overview: 'Dashboard',
  adsense: 'AdSense & GA4',
  channels: 'Social & Ad Accounts',
  affiliate: 'Electronic First API',
  crm: 'CRM & WhatsApp',
  orders: 'Orders & Keys',
  catalog: 'Catalog & TV',
  customers: 'Customers & Access',
  domains: 'Domains',
  integrations: 'Integrations & Worker',
  profile: 'My Profile',
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
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pb_sidebar_open');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [sidebarTheme, setSidebarTheme] = useState<PaperSidebarTheme>(() => {
    try {
      const saved = localStorage.getItem('pb_sn_sidebar') as PaperSidebarTheme | null;
      return saved === 'navy' || saved === 'silver' || saved === 'steel'
        ? saved
        : 'navy';
    } catch {
      return 'navy';
    }
  });
  const [accentId, setAccentId] = useState<PaperAccentId>(() => {
    try {
      const saved = localStorage.getItem('pb_sn_accent') as PaperAccentId | null;
      return saved && saved in PAPER_ACCENTS ? saved : 'platinum';
    } catch {
      return 'platinum';
    }
  });
  const [sidebarUserOpen, setSidebarUserOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [pluginOpen, setPluginOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const pluginRef = useRef<HTMLDivElement | null>(null);

  const displayName = userProfile?.displayName || 'PlayBeat Operator';
  const displayEmail = userProfile?.email || 'business@playbeat.digital';
  const brandTitle = userProfile?.brandTitle || 'PlayBeat Admin';
  const avatarUrl = userProfile?.avatarUrl || '';
  const activeAccent = PAPER_ACCENTS[accentId];

  useEffect(() => {
    setAvatarError(false);
  }, [avatarUrl]);

  useEffect(() => {
    try {
      localStorage.setItem('pb_sidebar_open', String(sidebarOpen));
    } catch {
      // ignore storage errors
    }
  }, [sidebarOpen]);

  useEffect(() => {
    try {
      localStorage.setItem('pb_sn_sidebar', sidebarTheme);
    } catch {
      // ignore storage errors
    }
  }, [sidebarTheme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--paper-accent', activeAccent.hex);
    root.style.setProperty('--paper-accent-bright', activeAccent.brightHex);
    root.style.setProperty('--paper-accent-top', activeAccent.topHex);
    root.style.setProperty('--paper-accent-bottom', activeAccent.bottomHex);
    root.style.setProperty('--paper-accent-hover-top', activeAccent.hoverTopHex);
    root.style.setProperty('--paper-accent-hover-bottom', activeAccent.hoverBottomHex);
    root.style.setProperty('--paper-accent-fg', activeAccent.fgHex);
    root.style.setProperty('--paper-accent-soft', activeAccent.softRgba);
    try {
      localStorage.setItem('pb_sn_accent', accentId);
    } catch {
      // ignore storage errors
    }
  }, [accentId, activeAccent]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
      if (pluginRef.current && !pluginRef.current.contains(target)) {
        setPluginOpen(false);
      }
    }
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  const isLightSidebar = sidebarTheme === 'silver';
  const sidebarSurfaceClass =
    sidebarTheme === 'silver'
      ? 'bg-gradient-to-b from-white via-[#f5f8fc] to-[#eaeff7] text-[#0b162c] border-r border-[#cbd5e1]'
      : sidebarTheme === 'steel'
        ? 'bg-gradient-to-b from-[#11203d] via-[#0c172e] to-[#081022] text-[#e6edf7] border-r border-[#cbd5e1]/18'
        : 'bg-gradient-to-b from-[#0a152c] via-[#071022] to-[#040915] text-[#e6edf7] border-r border-[#cbd5e1]/16';

  const sidebarDividerClass = isLightSidebar ? 'border-[#d8e0ec]' : 'border-[#cbd5e1]/14';

  const renderNavItem = (item: NavItem, collapsed: boolean) => {
    const Icon = item.icon;
    const active = activeSection === item.id;
    const activeColor = isLightSidebar ? activeAccent.hex : activeAccent.brightHex;
    return (
      <button
        key={item.id}
        type="button"
        title={collapsed ? item.label : undefined}
        onClick={() => {
          onSelectSection(item.id);
          setMobileOpen(false);
        }}
        className={`group relative w-full flex items-center gap-3.5 rounded-lg transition-all duration-150 whitespace-nowrap cursor-pointer ${
          collapsed ? 'justify-center px-2 py-2.5' : 'px-3.5 py-2.5'
        } ${
          active
            ? isLightSidebar
              ? 'bg-gradient-to-r from-[#e2eaf6] to-[#eef3fa] font-semibold text-[#0b162c] border border-[#cbd5e1] shadow-xs'
              : 'bg-gradient-to-r from-[#cbd5e1]/14 via-[#93c5fd]/10 to-transparent font-semibold text-white border border-[#cbd5e1]/22 shadow-[inset_0_1px_0_rgba(241,245,249,0.18)]'
            : isLightSidebar
              ? 'text-[#475a78] font-medium border border-transparent hover:text-[#0b162c] hover:bg-[#e8eef7]/70'
              : 'text-[#a3b4cf] font-medium border border-transparent hover:text-[#f1f5f9] hover:bg-white/[0.05]'
        }`}
      >
        <Icon
          className={`w-[18px] h-[18px] shrink-0 transition-colors ${
            active
              ? ''
              : isLightSidebar
                ? 'text-[#6c7f9e] group-hover:text-[#0b162c]'
                : 'text-[#7c92b4] group-hover:text-[#e2e8f0]'
          }`}
          style={active ? { color: activeColor } : undefined}
        />
        {!collapsed && (
          <span
            className="text-[12.5px] tracking-[0.02em] truncate"
            style={active ? { color: activeColor } : undefined}
          >
            {item.label}
          </span>
        )}
      </button>
    );
  };

  const renderSidebarBody = (collapsed: boolean, isMobile = false) => (
    <div className={`flex flex-col h-full ${sidebarSurfaceClass}`}>
      {/* Silver-Navy Brand Header */}
      <div
        className={`h-16 flex items-center border-b ${sidebarDividerClass} shrink-0 ${
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            onSelectSection('overview');
            setMobileOpen(false);
          }}
          className="flex items-center gap-3 min-w-0 text-left cursor-pointer"
        >
          <span
            className="w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border border-[#e2e8f0]/45 shadow-[0_4px_12px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.45)]"
            style={{
              background: `linear-gradient(180deg, ${activeAccent.topHex}, ${activeAccent.bottomHex})`,
              color: activeAccent.fgHex,
            }}
          >
            PB
          </span>
          {!collapsed && (
            <span
              className={`text-[13px] font-bold tracking-[0.08em] uppercase truncate ${
                isLightSidebar
                  ? 'text-[#0b162c]'
                  : 'bg-gradient-to-b from-white to-[#cbd5e1] bg-clip-text text-transparent'
              }`}
            >
              {brandTitle}
            </span>
          )}
        </button>

        {isMobile && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLightSidebar
                ? 'text-[#475a78] hover:text-[#0b162c]'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Paper Dashboard PRO Sidebar UserMenu Accordion */}
      <div className={`px-3 py-3 border-b ${sidebarDividerClass} shrink-0`}>
        <button
          type="button"
          onClick={() => {
            if (collapsed) {
              onSelectSection('profile');
              setMobileOpen(false);
            } else {
              setSidebarUserOpen((o) => !o);
            }
          }}
          title={collapsed ? displayName : undefined}
          className={`w-full flex items-center gap-3 rounded-lg px-1.5 py-1.5 transition-colors cursor-pointer ${
            collapsed ? 'justify-center' : 'justify-between'
          } ${
            isLightSidebar ? 'hover:bg-[#e8eef7]/80' : 'hover:bg-white/[0.06]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {avatarUrl && !avatarError ? (
              <img
                src={avatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-[#cbd5e1]/40"
              />
            ) : (
              <span
                className={`w-8 h-8 rounded-full font-semibold text-xs flex items-center justify-center shrink-0 border ${
                  isLightSidebar
                    ? 'bg-gradient-to-b from-white to-[#e2e8f0] text-[#0b162c] border-[#cbd5e1]'
                    : 'bg-gradient-to-b from-[#1e3157] to-[#0f1d38] text-[#e2e8f0] border-[#cbd5e1]/28'
                }`}
              >
                {getInitials(displayName)}
              </span>
            )}
            {!collapsed && (
              <span
                className={`text-[13px] font-medium truncate ${
                  isLightSidebar ? 'text-[#0b162c]' : 'text-[#e6edf7]'
                }`}
              >
                {displayName}
              </span>
            )}
          </div>
          {!collapsed && (
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${
                sidebarUserOpen ? 'rotate-180' : ''
              } ${isLightSidebar ? 'text-[#6c7f9e]' : 'text-[#8da2c0]'}`}
            />
          )}
        </button>

        {!collapsed && sidebarUserOpen && (
          <div className="mt-2 pl-2 space-y-1">
            <button
              type="button"
              onClick={() => {
                onSelectSection('profile');
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeSection === 'profile'
                  ? 'font-semibold'
                  : isLightSidebar
                    ? 'text-[#475a78] hover:text-[#0b162c]'
                    : 'text-[#b8c7dc] hover:text-white'
              }`}
              style={
                activeSection === 'profile'
                  ? { color: isLightSidebar ? activeAccent.hex : activeAccent.brightHex }
                  : undefined
              }
            >
              <span className="w-5 text-center font-mono text-[11px] opacity-75">MP</span>
              <span>My Profile</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectSection('customers');
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeSection === 'customers'
                  ? 'font-semibold'
                  : isLightSidebar
                    ? 'text-[#475a78] hover:text-[#0b162c]'
                    : 'text-[#b8c7dc] hover:text-white'
              }`}
              style={
                activeSection === 'customers'
                  ? { color: isLightSidebar ? activeAccent.hex : activeAccent.brightHex }
                  : undefined
              }
            >
              <span className="w-5 text-center font-mono text-[11px] opacity-75">CA</span>
              <span>Customers & Access</span>
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className={`w-full flex items-center gap-3 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                isLightSidebar
                  ? 'text-rose-600 hover:bg-rose-50'
                  : 'text-rose-300 hover:bg-white/[0.06]'
              }`}
            >
              <span className="w-5 text-center font-mono text-[11px] opacity-85">LO</span>
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>

      {/* Primary Sidebar Navigation */}
      <nav
        aria-label="Primary navigation"
        className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-1"
      >
        {OPERATIONS_NAV.map((item) => renderNavItem(item, collapsed))}

        <div className={`my-2.5 border-t ${sidebarDividerClass}`} aria-hidden="true" />

        {renderNavItem(
          { id: 'customers', label: 'Customers & Access', miniCode: 'CA', icon: UserCheck },
          collapsed,
        )}
        {renderNavItem(
          { id: 'profile', label: 'My Profile', miniCode: 'MP', icon: UserCog },
          collapsed,
        )}
      </nav>

      {/* Compact Sidebar Footer */}
      <div className={`p-3 border-t ${sidebarDividerClass} shrink-0`}>
        <button
          type="button"
          onClick={onSignOut}
          title={collapsed ? 'Log out' : undefined}
          className={`w-full flex items-center gap-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            collapsed ? 'justify-center p-2.5' : 'justify-center px-3 py-2'
          } ${
            isLightSidebar
              ? 'text-[#334155] hover:text-[#0b162c] border border-[#cbd5e1] bg-white/80 hover:bg-white'
              : 'text-[#cbd5e1] hover:text-white border border-[#cbd5e1]/20 bg-white/[0.03] hover:bg-white/[0.08]'
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Log Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen sn-shell-bg text-[#0b162c] dark:text-[#e6edf7]">
      {/* Desktop Fixed Silver-Navy Sidebar */}
      <aside
        className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 z-40 transition-all duration-200 ${
          sidebarOpen ? 'md:w-[260px]' : 'md:w-[80px]'
        }`}
      >
        {renderSidebarBody(!sidebarOpen, false)}
      </aside>

      {/* Mobile Slide-Over Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-[#050b18]/80 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[268px] max-w-[84vw] h-full">
            {renderSidebarBody(false, true)}
          </aside>
        </div>
      )}

      {/* Main Content Column */}
      <div
        className={`flex flex-col min-h-screen transition-all duration-200 ${
          sidebarOpen ? 'md:pl-[260px]' : 'md:pl-[80px]'
        }`}
      >
        {/* Frosted Silver-Navy Top Navbar */}
        <header className="sticky top-0 z-30 h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 bg-[#edf1f7]/88 dark:bg-[#070f21]/88 backdrop-blur-md border-b border-[#cbd5e1]/80 dark:border-[#cbd5e1]/14">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="md:hidden p-2 -ml-2 text-[#475a78] dark:text-[#b8c7dc] hover:text-[#0b162c] dark:hover:text-white rounded-lg cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Iconic Brushed-Silver Round Mini-Sidebar Button */}
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label={sidebarOpen ? 'Minimize sidebar' : 'Expand sidebar'}
              title={sidebarOpen ? 'Minimize sidebar' : 'Expand sidebar'}
              className="sn-btn-silver hidden md:inline-flex items-center justify-center w-9 h-9 rounded-full shrink-0 cursor-pointer"
            >
              {sidebarOpen ? (
                <MoreVertical className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {/* Clean Breadcrumb Title */}
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-[#6c7f9e] dark:text-[#7d92b3] whitespace-nowrap">
                Console
              </span>
              <span className="hidden sm:inline text-[#94a3b8] dark:text-[#475a78]" aria-hidden="true">
                /
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-[#0b162c] dark:text-white truncate">
                {SECTION_LABELS[activeSection]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerAction}

            {/* Silver-Navy Theme Customizer (FixedPlugin.vue) */}
            <div className="relative" ref={pluginRef}>
              <button
                type="button"
                onClick={() => setPluginOpen((o) => !o)}
                aria-expanded={pluginOpen}
                aria-label="Customize Silver-Navy theme"
                title="Customize sidebar & metallic accent"
                className="sn-btn-silver inline-flex items-center justify-center w-9 h-9 rounded-full shrink-0 cursor-pointer"
              >
                <Palette className="w-4 h-4" />
              </button>

              {pluginOpen && (
                <div className="absolute right-0 mt-2 w-68 origin-top-right rounded-xl bg-white dark:bg-[#0d182e] border border-[#cbd5e1] dark:border-[#cbd5e1]/20 shadow-2xl p-4 space-y-4 z-50">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6c7f9e] dark:text-[#94a3b8] mb-2">
                      Sidebar Finish
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'navy', label: 'Midnight', swatch: '#081124' },
                          { id: 'silver', label: 'Silver', swatch: '#eef2f8' },
                          { id: 'steel', label: 'Steel', swatch: '#132447' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSidebarTheme(opt.id)}
                          className={`flex flex-col items-center gap-1.5 py-2 px-1.5 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                            sidebarTheme === opt.id
                              ? 'border-[#2563eb] dark:border-[#93c5fd] bg-[#eff6ff] dark:bg-[#1e3a8a]/30 text-[#0b162c] dark:text-white'
                              : 'border-[#dde4ef] dark:border-[#cbd5e1]/14 text-[#475a78] dark:text-[#b8c7dc] hover:bg-[#f4f7fb] dark:hover:bg-white/[0.04]'
                          }`}
                        >
                          <span
                            className="w-5 h-5 rounded-full border border-slate-400/40 shadow-inner"
                            style={{ backgroundColor: opt.swatch }}
                          />
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6c7f9e] dark:text-[#94a3b8] mb-2">
                      Metallic Accent
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      {(Object.values(PAPER_ACCENTS) as PaperAccentConfig[]).map((acc) => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => setAccentId(acc.id)}
                          title={acc.label}
                          aria-label={acc.label}
                          className={`w-7 h-7 rounded-full border border-white/40 shadow-xs transition-transform cursor-pointer ${
                            accentId === acc.id
                              ? 'scale-110 ring-2 ring-offset-2 ring-[#1e40af] dark:ring-[#93c5fd] dark:ring-offset-[#0d182e]'
                              : 'hover:scale-105'
                          }`}
                          style={{
                            background: `linear-gradient(145deg, ${acc.brightHex}, ${acc.hex})`,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-[#e2e8f0] dark:border-[#cbd5e1]/14 flex items-center justify-between">
                    <span className="text-xs font-medium text-[#475a78] dark:text-[#b8c7dc]">
                      Surface Mode
                    </span>
                    <button
                      type="button"
                      onClick={onToggleTheme}
                      className="sn-btn-silver inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer"
                    >
                      {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                      <span>{dark ? 'Silver Light' : 'Midnight Navy'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Toggle fullscreen'}
              title={isFullscreen ? 'Exit fullscreen' : 'Toggle fullscreen'}
              className="sn-btn-silver hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full shrink-0 cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={dark ? 'Switch to Silver Light mode' : 'Switch to Midnight Navy mode'}
              title={dark ? 'Switch to Silver Light mode' : 'Switch to Midnight Navy mode'}
              className="sn-btn-silver inline-flex items-center justify-center w-9 h-9 rounded-full shrink-0 cursor-pointer"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Account Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                className="sn-btn-silver flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full shrink-0 cursor-pointer"
              >
                {avatarUrl && !avatarError ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <span
                    className="w-7 h-7 rounded-full font-bold text-[11px] flex items-center justify-center border border-white/35"
                    style={{
                      background: `linear-gradient(180deg, ${activeAccent.topHex}, ${activeAccent.bottomHex})`,
                      color: activeAccent.fgHex,
                    }}
                  >
                    {getInitials(displayName)}
                  </span>
                )}
                <span className="hidden lg:inline text-xs font-semibold text-[#0b162c] dark:text-[#f1f5f9] max-w-[120px] truncate">
                  {displayName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#6c7f9e] hidden sm:block" />
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl bg-white dark:bg-[#0d182e] border border-[#cbd5e1] dark:border-[#cbd5e1]/20 shadow-2xl overflow-hidden z-50"
                >
                  <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#e2e8f0] dark:border-[#cbd5e1]/14">
                    {avatarUrl && !avatarError ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarError(true)}
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <span
                        className="w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border border-white/35"
                        style={{
                          background: `linear-gradient(180deg, ${activeAccent.topHex}, ${activeAccent.bottomHex})`,
                          color: activeAccent.fgHex,
                        }}
                      >
                        {getInitials(displayName)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0b162c] dark:text-white truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-[#475a78] dark:text-[#94a3b8] truncate">
                        {displayEmail}
                      </p>
                    </div>
                  </div>

                  <div className="py-1.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onSelectSection('profile');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#0b162c] dark:text-[#e6edf7] hover:bg-[#edf1f7] dark:hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
                    >
                      <UserCog className="w-4 h-4 shrink-0 text-[#1e40af] dark:text-[#93c5fd]" />
                      <span>My Profile</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onSelectSection('profile');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#0b162c] dark:text-[#e6edf7] hover:bg-[#edf1f7] dark:hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 shrink-0 text-[#475569] dark:text-[#cbd5e1]" />
                      <span>Change Password</span>
                    </button>
                  </div>

                  <div className="p-3 border-t border-[#e2e8f0] dark:border-[#cbd5e1]/14">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onSignOut();
                      }}
                      className="sn-btn-silver w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] w-full mx-auto">
          {children}
        </main>

        {/* Quiet Silver-Navy Footer */}
        <footer className="px-4 sm:px-6 lg:px-8 py-4 border-t border-[#cbd5e1]/75 dark:border-[#cbd5e1]/14 text-xs text-[#475a78] dark:text-[#7d92b3] flex flex-col sm:flex-row items-center justify-between gap-2 max-w-[1440px] w-full mx-auto">
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => onSelectSection('overview')}
              className="hover:text-[#0b162c] dark:hover:text-white transition-colors cursor-pointer"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('adsense')}
              className="hover:text-[#0b162c] dark:hover:text-white transition-colors cursor-pointer"
            >
              AdSense & GA4
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('domains')}
              className="hover:text-[#0b162c] dark:hover:text-white transition-colors cursor-pointer"
            >
              Domains
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('profile')}
              className="hover:text-[#0b162c] dark:hover:text-white transition-colors cursor-pointer"
            >
              Profile
            </button>
          </div>
          <span>PlayBeat Digital · playbeat.digital</span>
        </footer>
      </div>
    </div>
  );
}
