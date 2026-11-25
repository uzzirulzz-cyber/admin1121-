import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  Globe,
  Handshake,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Maximize2,
  Menu,
  Minimize2,
  Moon,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
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
  'argon-sunset': {
    label: 'Starter Amber',
    hex: '#f78109',
    bannerClass: 'bg-[#f78109]',
    scrimClass: 'bg-[#f78109]/70',
    accentTextClass: 'text-[#f78109]',
  },
  'argon-blue': {
    label: 'Slate Cobalt',
    hex: '#1890ff',
    bannerClass: 'bg-[#1890ff]',
    scrimClass: 'bg-[#1890ff]/70',
    accentTextClass: 'text-[#1890ff]',
  },
  'argon-ocean': {
    label: 'Deep Ocean',
    hex: '#0c53b7',
    bannerClass: 'bg-[#0c53b7]',
    scrimClass: 'bg-[#0c53b7]/70',
    accentTextClass: 'text-[#0c53b7]',
  },
  'argon-emerald': {
    label: 'Emerald',
    hex: '#229a16',
    bannerClass: 'bg-[#229a16]',
    scrimClass: 'bg-[#229a16]/70',
    accentTextClass: 'text-[#229a16]',
  },
  'argon-slate': {
    label: 'Obsidian Slate',
    hex: '#212b36',
    bannerClass: 'bg-[#212b36]',
    scrimClass: 'bg-[#212b36]/80',
    accentTextClass: 'text-[#919eab]',
  },
};

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const OPERATIONS_NAV: NavItem[] = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'adsense', label: 'AdSense & GA4', icon: BarChart3 },
  { id: 'channels', label: 'Social & Ad Accounts', icon: Share2 },
  { id: 'affiliate', label: 'Electronic First API', icon: Handshake },
  { id: 'crm', label: 'CRM & WhatsApp', icon: Users },
  { id: 'orders', label: 'Orders & Keys', icon: ShoppingBag },
  { id: 'catalog', label: 'Catalog & TV', icon: Package },
  { id: 'domains', label: 'Domains', icon: Globe },
  { id: 'integrations', label: 'Integrations & Worker', icon: Plug },
];

const ACCOUNT_NAV: NavItem[] = [
  { id: 'profile', label: 'My Profile', icon: UserCog },
  { id: 'customers', label: 'Customers & Access', icon: UserCheck },
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const displayName = userProfile?.displayName || 'PlayBeat Operator';
  const displayEmail = userProfile?.email || 'business@playbeat.digital';
  const brandTitle = userProfile?.brandTitle || 'PlayBeat Admin';
  const avatarUrl = userProfile?.avatarUrl || '';

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
    function handleOutsideClick(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
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

  const renderNavItem = (item: NavItem, collapsed: boolean) => {
    const Icon = item.icon;
    const active = activeSection === item.id;
    return (
      <button
        key={item.id}
        type="button"
        title={collapsed ? item.label : undefined}
        onClick={() => {
          onSelectSection(item.id);
          setMobileOpen(false);
        }}
        className={`group w-full flex items-center gap-3 rounded-xl transition-colors duration-150 whitespace-nowrap ${
          collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
        } ${
          active
            ? 'bg-amber-500/12 text-[#fda92d] font-semibold ring-1 ring-amber-400/25'
            : 'text-slate-300 font-medium hover:bg-white/[0.06] hover:text-amber-300'
        }`}
      >
        <Icon
          className={`w-[18px] h-[18px] shrink-0 transition-colors ${
            active
              ? 'text-[#fda92d] drop-shadow-[0_0_8px_rgba(247,129,9,0.45)]'
              : 'text-slate-400 group-hover:text-amber-300'
          }`}
        />
        {!collapsed && <span className="text-[13.5px] truncate">{item.label}</span>}
      </button>
    );
  };

  const renderDivider = (label: string, collapsed: boolean) => {
    if (collapsed) {
      return <div className="my-3 border-t border-slate-700/60" aria-hidden="true" />;
    }
    return (
      <div className="flex items-center gap-2.5 px-2 pt-4 pb-1.5">
        <span className="h-px flex-1 bg-slate-700/60" aria-hidden="true" />
        <span className="text-[11px] font-semibold tracking-wide text-slate-400 whitespace-nowrap">
          {label}
        </span>
        <span className="h-px flex-1 bg-slate-700/60" aria-hidden="true" />
      </div>
    );
  };

  const renderSidebarBody = (collapsed: boolean, isMobile = false) => (
    <div className="flex flex-col h-full bg-[#1a202c] text-slate-200 border-r border-slate-700/50">
      {/* Brand Header + Collapsible Toggler (SideNavbar.vue signature) */}
      <div
        className={`h-16 flex items-center border-b border-dashed border-slate-700/80 shrink-0 ${
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}
      >
        {!collapsed && (
          <button
            type="button"
            onClick={() => {
              onSelectSection('overview');
              setMobileOpen(false);
            }}
            className="flex items-center gap-2.5 min-w-0 text-left"
          >
            <span className="w-8 h-8 rounded-lg bg-[#f78109] text-[#161c24] font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
              PB
            </span>
            <span className="text-sm font-bold tracking-tight text-white truncate">
              {brandTitle}
            </span>
          </button>
        )}

        {isMobile ? (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className="p-2 text-slate-400 hover:text-[#fda92d] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-2 text-slate-400 hover:text-[#fda92d] hover:bg-white/[0.06] rounded-lg transition-colors shrink-0"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-[#fda92d]" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav
        aria-label="Primary navigation"
        className="flex-1 overflow-y-auto custom-scrollbar px-2.5 py-3 space-y-1"
      >
        {renderDivider('Operations', collapsed)}
        {OPERATIONS_NAV.map((item) => renderNavItem(item, collapsed))}

        {renderDivider('Account', collapsed)}
        {ACCOUNT_NAV.map((item) => renderNavItem(item, collapsed))}
      </nav>

      {/* Compact Sidebar Footer */}
      <div className="p-3 border-t border-dashed border-slate-700/80 shrink-0">
        <button
          type="button"
          onClick={onSignOut}
          title={collapsed ? 'Log out' : undefined}
          className={`w-full flex items-center gap-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-[#fda92d] hover:bg-white/[0.06] border border-slate-700/70 transition-colors whitespace-nowrap ${
            collapsed ? 'justify-center p-2.5' : 'justify-center px-3 py-2'
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f8fa] dark:bg-[#161c24] text-[#212b36] dark:text-slate-100">
      {/* Desktop Fixed Collapsible Sidebar (AdminLayout.vue) */}
      <aside
        className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 z-40 transition-all duration-200 ${
          sidebarOpen ? 'md:w-64' : 'md:w-16'
        }`}
      >
        {renderSidebarBody(!sidebarOpen, false)}
      </aside>

      {/* Mobile Slide-Over Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-[#161c24]/75 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[84vw] h-full">
            {renderSidebarBody(false, true)}
          </aside>
        </div>
      )}

      {/* Main Column with Dynamic Sidebar Offset */}
      <div
        className={`flex flex-col min-h-screen transition-all duration-200 ${
          sidebarOpen ? 'md:pl-64' : 'md:pl-16'
        }`}
      >
        {/* Sticky Top Navbar (TopNavbar.vue + UserDropDown.vue) */}
        <header className="sticky top-0 z-30 h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 bg-white/95 dark:bg-[#1a202c]/95 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-700/50 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="md:hidden p-2 -ml-2 text-[#637381] dark:text-slate-300 hover:text-[#f78109] rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-[#919eab] whitespace-nowrap">Admin</span>
              <span className="hidden sm:inline text-[#919eab]" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-[#212b36] dark:text-white truncate">
                {SECTION_LABELS[activeSection]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {headerAction}

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Toggle fullscreen'}
              title={isFullscreen ? 'Exit fullscreen' : 'Toggle fullscreen'}
              className="hidden sm:inline-flex items-center justify-center w-9 h-9 text-[#637381] dark:text-[#919eab] hover:text-[#f78109] dark:hover:text-[#fda92d] hover:bg-slate-100 dark:hover:bg-[#212b36] rounded-lg transition-colors shrink-0"
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
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex items-center justify-center w-9 h-9 text-[#637381] dark:text-[#919eab] hover:text-[#f78109] dark:hover:text-[#fda92d] hover:bg-slate-100 dark:hover:bg-[#212b36] rounded-lg transition-colors shrink-0"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Starter Kit User Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#212b36] transition-colors shrink-0"
              >
                {avatarUrl && !avatarError ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                    className="w-8 h-8 rounded-md object-cover border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <span className="w-8 h-8 rounded-md bg-[#f78109] text-[#161c24] font-bold text-xs flex items-center justify-center">
                    {getInitials(displayName)}
                  </span>
                )}
                <span className="hidden lg:inline text-xs font-semibold text-[#212b36] dark:text-slate-100 max-w-[120px] truncate">
                  {displayName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#919eab] hidden sm:block" />
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl bg-white dark:bg-[#212b36] border border-slate-200 dark:border-slate-700/70 shadow-xl overflow-hidden z-50"
                >
                  <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/80 dark:border-slate-700/60">
                    {avatarUrl && !avatarError ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarError(true)}
                        className="w-9 h-9 rounded-md object-cover shrink-0"
                      />
                    ) : (
                      <span className="w-9 h-9 rounded-md bg-[#f78109] text-[#161c24] font-bold text-xs flex items-center justify-center shrink-0">
                        {getInitials(displayName)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#212b36] dark:text-white truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-[#637381] dark:text-[#919eab] truncate">
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
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#333d48] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1a202c] hover:text-[#f78109] dark:hover:text-[#fda92d] transition-colors text-left"
                    >
                      <UserCog className="w-4 h-4 shrink-0" />
                      <span>My Profile</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onSelectSection('profile');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#333d48] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1a202c] hover:text-[#f78109] dark:hover:text-[#fda92d] transition-colors text-left"
                    >
                      <KeyRound className="w-4 h-4 shrink-0" />
                      <span>Change Password</span>
                    </button>
                  </div>

                  <div className="p-3 border-t border-slate-200/80 dark:border-slate-700/60">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-[#333d48] dark:text-slate-200 border border-slate-200 dark:border-slate-600/70 rounded-lg hover:bg-slate-100 dark:hover:bg-[#161c24] transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log out</span>
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
      </div>
    </div>
  );
}
