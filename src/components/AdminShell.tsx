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

export type PaperSidebarTheme = 'charcoal' | 'paper' | 'espresso';
export type PaperAccentId = 'teal' | 'coral' | 'sun' | 'mint' | 'azure';

interface PaperAccentConfig {
  id: PaperAccentId;
  label: string;
  hex: string;
  hoverHex: string;
  fgHex: string;
  softRgba: string;
}

const PAPER_ACCENTS: Record<PaperAccentId, PaperAccentConfig> = {
  teal: {
    id: 'teal',
    label: 'Paper Teal',
    hex: '#51cbce',
    hoverHex: '#34b5b8',
    fgHex: '#ffffff',
    softRgba: 'rgba(81, 203, 206, 0.14)',
  },
  coral: {
    id: 'coral',
    label: 'Paper Coral',
    hex: '#ef8157',
    hoverHex: '#e4693b',
    fgHex: '#ffffff',
    softRgba: 'rgba(239, 129, 87, 0.14)',
  },
  sun: {
    id: 'sun',
    label: 'Warm Sun',
    hex: '#fbc658',
    hoverHex: '#f5b432',
    fgHex: '#252422',
    softRgba: 'rgba(251, 198, 88, 0.18)',
  },
  mint: {
    id: 'mint',
    label: 'Sage Mint',
    hex: '#6bd098',
    hoverHex: '#4ec082',
    fgHex: '#1c1b1a',
    softRgba: 'rgba(107, 208, 152, 0.16)',
  },
  azure: {
    id: 'azure',
    label: 'Sky Azure',
    hex: '#51bcda',
    hoverHex: '#35a6c7',
    fgHex: '#ffffff',
    softRgba: 'rgba(81, 188, 218, 0.14)',
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
    label: 'Paper Coral',
    hex: '#ef8157',
    bannerClass: 'bg-[#ef8157]',
    scrimClass: 'bg-[#ef8157]/75',
    accentTextClass: 'text-[#ef8157]',
  },
  'argon-blue': {
    label: 'Paper Teal',
    hex: '#51cbce',
    bannerClass: 'bg-[#51cbce]',
    scrimClass: 'bg-[#51cbce]/75',
    accentTextClass: 'text-[#51cbce]',
  },
  'argon-ocean': {
    label: 'Sky Azure',
    hex: '#51bcda',
    bannerClass: 'bg-[#51bcda]',
    scrimClass: 'bg-[#51bcda]/75',
    accentTextClass: 'text-[#51bcda]',
  },
  'argon-emerald': {
    label: 'Sage Mint',
    hex: '#6bd098',
    bannerClass: 'bg-[#6bd098]',
    scrimClass: 'bg-[#6bd098]/75',
    accentTextClass: 'text-[#6bd098]',
  },
  'argon-slate': {
    label: 'Charcoal Ink',
    hex: '#212120',
    bannerClass: 'bg-[#212120]',
    scrimClass: 'bg-[#212120]/80',
    accentTextClass: 'text-[#66615b]',
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
      const saved = localStorage.getItem('pb_paper_sidebar') as PaperSidebarTheme | null;
      return saved === 'charcoal' || saved === 'paper' || saved === 'espresso'
        ? saved
        : 'charcoal';
    } catch {
      return 'charcoal';
    }
  });
  const [accentId, setAccentId] = useState<PaperAccentId>(() => {
    try {
      const saved = localStorage.getItem('pb_paper_accent') as PaperAccentId | null;
      return saved && saved in PAPER_ACCENTS ? saved : 'teal';
    } catch {
      return 'teal';
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
      localStorage.setItem('pb_paper_sidebar', sidebarTheme);
    } catch {
      // ignore storage errors
    }
  }, [sidebarTheme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--paper-accent', activeAccent.hex);
    root.style.setProperty('--paper-accent-hover', activeAccent.hoverHex);
    root.style.setProperty('--paper-accent-fg', activeAccent.fgHex);
    root.style.setProperty('--paper-accent-soft', activeAccent.softRgba);
    try {
      localStorage.setItem('pb_paper_accent', accentId);
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

  const isLightSidebar = sidebarTheme === 'paper';
  const sidebarSurfaceClass =
    sidebarTheme === 'paper'
      ? 'bg-white text-[#252422] border-r border-[#ddd9ce]'
      : sidebarTheme === 'espresso'
        ? 'bg-[#2c2926] text-[#f4f3ef] border-r border-white/10'
        : 'bg-[#212120] text-[#f4f3ef] border-r border-white/10';

  const sidebarDividerClass = isLightSidebar ? 'border-[#e8e5dc]' : 'border-white/12';

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
        className={`group relative w-full flex items-center gap-3.5 rounded-lg transition-colors duration-150 whitespace-nowrap cursor-pointer ${
          collapsed ? 'justify-center px-2 py-2.5' : 'px-3.5 py-2.5'
        } ${
          active
            ? isLightSidebar
              ? 'bg-[#f4f3ef] font-semibold text-[#252422]'
              : 'bg-white/[0.08] font-semibold text-white'
            : isLightSidebar
              ? 'text-[#66615b] font-medium hover:text-[#252422] hover:bg-[#f4f3ef]/70'
              : 'text-[#d4d0c8] font-medium hover:text-white hover:bg-white/[0.05]'
        }`}
      >
        <Icon
          className={`w-[18px] h-[18px] shrink-0 transition-colors ${
            active
              ? ''
              : isLightSidebar
                ? 'text-[#8c867c] group-hover:text-[#252422]'
                : 'text-[#9a9a9a] group-hover:text-white'
          }`}
          style={active ? { color: activeAccent.hex } : undefined}
        />
        {!collapsed && (
          <span
            className="text-[12.5px] tracking-[0.02em] truncate"
            style={active ? { color: activeAccent.hex } : undefined}
          >
            {item.label}
          </span>
        )}
      </button>
    );
  };

  const renderSidebarBody = (collapsed: boolean, isMobile = false) => (
    <div className={`flex flex-col h-full ${sidebarSurfaceClass}`}>
      {/* Paper Dashboard PRO Brand Header */}
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
            className="w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 shadow-xs"
            style={{
              backgroundColor: activeAccent.hex,
              color: activeAccent.fgHex,
            }}
          >
            PB
          </span>
          {!collapsed && (
            <span
              className={`text-[13.5px] font-semibold tracking-[0.04em] uppercase truncate ${
                isLightSidebar ? 'text-[#252422]' : 'text-white'
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
            className={`p-1.5 rounded-lg transition-colors ${
              isLightSidebar
                ? 'text-[#66615b] hover:text-[#252422]'
                : 'text-[#9a9a9a] hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Paper Dashboard PRO Sidebar UserMenu Accordion (UserMenu.vue) */}
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
            isLightSidebar ? 'hover:bg-[#f4f3ef]' : 'hover:bg-white/[0.06]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {avatarUrl && !avatarError ? (
              <img
                src={avatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-black/10"
              />
            ) : (
              <span
                className="w-8 h-8 rounded-full font-semibold text-xs flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: isLightSidebar ? '#f4f3ef' : 'rgba(255,255,255,0.12)',
                  color: isLightSidebar ? '#252422' : '#ffffff',
                }}
              >
                {getInitials(displayName)}
              </span>
            )}
            {!collapsed && (
              <span
                className={`text-[13px] font-medium truncate ${
                  isLightSidebar ? 'text-[#252422]' : 'text-[#f4f3ef]'
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
              } ${isLightSidebar ? 'text-[#66615b]' : 'text-[#9a9a9a]'}`}
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
                    ? 'text-[#66615b] hover:text-[#252422]'
                    : 'text-[#cfcac0] hover:text-white'
              }`}
              style={activeSection === 'profile' ? { color: activeAccent.hex } : undefined}
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
                    ? 'text-[#66615b] hover:text-[#252422]'
                    : 'text-[#cfcac0] hover:text-white'
              }`}
              style={activeSection === 'customers' ? { color: activeAccent.hex } : undefined}
            >
              <span className="w-5 text-center font-mono text-[11px] opacity-75">CA</span>
              <span>Customers & Access</span>
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className={`w-full flex items-center gap-3 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                isLightSidebar
                  ? 'text-[#ef8157] hover:bg-[#ef8157]/10'
                  : 'text-[#ef8157] hover:bg-white/[0.06]'
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
              ? 'text-[#66615b] hover:text-[#252422] border border-[#ddd9ce] hover:bg-[#f4f3ef]'
              : 'text-[#d4d0c8] hover:text-white border border-white/15 hover:bg-white/[0.06]'
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Log Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f3ef] dark:bg-[#1c1b1a] text-[#252422] dark:text-[#f4f3ef]">
      {/* Desktop Fixed Paper Dashboard PRO Sidebar */}
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
            className="fixed inset-0 bg-[#1c1b1a]/75 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[268px] max-w-[84vw] h-full">
            {renderSidebarBody(false, true)}
          </aside>
        </div>
      )}

      {/* Main Paper Panel */}
      <div
        className={`flex flex-col min-h-screen transition-all duration-200 ${
          sidebarOpen ? 'md:pl-[260px]' : 'md:pl-[80px]'
        }`}
      >
        {/* Paper Dashboard PRO Transparent Top Navbar (TopNavbar.vue) */}
        <header className="sticky top-0 z-30 h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 bg-[#f4f3ef]/95 dark:bg-[#1c1b1a]/95 backdrop-blur-sm border-b border-[#ddd9ce] dark:border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="md:hidden p-2 -ml-2 text-[#66615b] dark:text-[#cfcac0] hover:text-[#252422] dark:hover:text-white rounded-lg cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Iconic Paper Dashboard PRO Round Mini-Sidebar Button */}
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label={sidebarOpen ? 'Minimize sidebar' : 'Expand sidebar'}
              title={sidebarOpen ? 'Minimize sidebar' : 'Expand sidebar'}
              className="hidden md:inline-flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-[#252422] text-[#66615b] dark:text-[#cfcac0] border border-[#ddd9ce] dark:border-white/10 shadow-xs hover:text-[#252422] dark:hover:text-white transition-colors shrink-0 cursor-pointer"
            >
              {sidebarOpen ? (
                <MoreVertical className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {/* Clean Breadcrumb Title */}
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-[#9a9a9a] whitespace-nowrap">Paper Console</span>
              <span className="hidden sm:inline text-[#9a9a9a]" aria-hidden="true">
                /
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-[#252422] dark:text-white truncate">
                {SECTION_LABELS[activeSection]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerAction}

            {/* Paper Dashboard PRO Interactive Style Customizer (FixedPlugin.vue) */}
            <div className="relative" ref={pluginRef}>
              <button
                type="button"
                onClick={() => setPluginOpen((o) => !o)}
                aria-expanded={pluginOpen}
                aria-label="Customize Paper Dashboard theme"
                title="Customize sidebar & accent"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-[#252422] text-[#66615b] dark:text-[#cfcac0] border border-[#ddd9ce] dark:border-white/10 shadow-xs hover:text-[#252422] dark:hover:text-white transition-colors shrink-0 cursor-pointer"
              >
                <Palette className="w-4 h-4" />
              </button>

              {pluginOpen && (
                <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl bg-white dark:bg-[#252422] border border-[#ddd9ce] dark:border-white/12 shadow-xl p-4 space-y-4 z-50">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9a9a9a] mb-2">
                      Sidebar Background
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'charcoal', label: 'Charcoal', swatch: '#212120' },
                          { id: 'paper', label: 'Paper', swatch: '#f4f3ef' },
                          { id: 'espresso', label: 'Espresso', swatch: '#2c2926' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSidebarTheme(opt.id)}
                          className={`flex flex-col items-center gap-1.5 py-2 px-1.5 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                            sidebarTheme === opt.id
                              ? 'border-[#51cbce] bg-[#51cbce]/10 text-[#252422] dark:text-white'
                              : 'border-[#e8e5dc] dark:border-white/10 text-[#66615b] dark:text-[#cfcac0] hover:bg-[#f4f3ef] dark:hover:bg-white/[0.04]'
                          }`}
                        >
                          <span
                            className="w-5 h-5 rounded-full border border-black/15"
                            style={{ backgroundColor: opt.swatch }}
                          />
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9a9a9a] mb-2">
                      Active Accent
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      {(Object.values(PAPER_ACCENTS) as PaperAccentConfig[]).map((acc) => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => setAccentId(acc.id)}
                          title={acc.label}
                          aria-label={acc.label}
                          className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                            accentId === acc.id
                              ? 'scale-110 ring-2 ring-offset-2 ring-[#252422] dark:ring-white dark:ring-offset-[#252422]'
                              : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: acc.hex }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#e8e5dc] dark:border-white/10 flex items-center justify-between">
                    <span className="text-xs font-medium text-[#66615b] dark:text-[#cfcac0]">
                      Surface Mode
                    </span>
                    <button
                      type="button"
                      onClick={onToggleTheme}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border border-[#ddd9ce] dark:border-white/15 text-[#252422] dark:text-white hover:bg-[#f4f3ef] dark:hover:bg-white/[0.06] cursor-pointer"
                    >
                      {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                      <span>{dark ? 'Light Paper' : 'Dark Paper'}</span>
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
              className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-[#252422] text-[#66615b] dark:text-[#cfcac0] border border-[#ddd9ce] dark:border-white/10 shadow-xs hover:text-[#252422] dark:hover:text-white transition-colors shrink-0 cursor-pointer"
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
              aria-label={dark ? 'Switch to light paper mode' : 'Switch to dark paper mode'}
              title={dark ? 'Switch to light paper mode' : 'Switch to dark paper mode'}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-[#252422] text-[#66615b] dark:text-[#cfcac0] border border-[#ddd9ce] dark:border-white/10 shadow-xs hover:text-[#252422] dark:hover:text-white transition-colors shrink-0 cursor-pointer"
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
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-white dark:bg-[#252422] border border-[#ddd9ce] dark:border-white/10 shadow-xs hover:border-[#51cbce] transition-colors shrink-0 cursor-pointer"
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
                    className="w-7 h-7 rounded-full font-bold text-[11px] flex items-center justify-center"
                    style={{
                      backgroundColor: activeAccent.hex,
                      color: activeAccent.fgHex,
                    }}
                  >
                    {getInitials(displayName)}
                  </span>
                )}
                <span className="hidden lg:inline text-xs font-semibold text-[#252422] dark:text-[#f4f3ef] max-w-[120px] truncate">
                  {displayName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#9a9a9a] hidden sm:block" />
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl bg-white dark:bg-[#252422] border border-[#ddd9ce] dark:border-white/12 shadow-xl overflow-hidden z-50"
                >
                  <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#e8e5dc] dark:border-white/10">
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
                        className="w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: activeAccent.hex,
                          color: activeAccent.fgHex,
                        }}
                      >
                        {getInitials(displayName)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#252422] dark:text-white truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-[#66615b] dark:text-[#9a9a9a] truncate">
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
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#252422] dark:text-[#f4f3ef] hover:bg-[#f4f3ef] dark:hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
                    >
                      <UserCog className="w-4 h-4 shrink-0 text-[#51cbce]" />
                      <span>My Profile</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onSelectSection('profile');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#252422] dark:text-[#f4f3ef] hover:bg-[#f4f3ef] dark:hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 shrink-0 text-[#ef8157]" />
                      <span>Change Password</span>
                    </button>
                  </div>

                  <div className="p-3 border-t border-[#e8e5dc] dark:border-white/10">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-[#252422] dark:text-[#f4f3ef] border border-[#ddd9ce] dark:border-white/15 rounded-lg hover:bg-[#f4f3ef] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
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

        {/* Paper Dashboard PRO Quiet Footer (ContentFooter.vue) */}
        <footer className="px-4 sm:px-6 lg:px-8 py-4 border-t border-[#ddd9ce] dark:border-white/10 text-xs text-[#66615b] dark:text-[#9a9a9a] flex flex-col sm:flex-row items-center justify-between gap-2 max-w-[1440px] w-full mx-auto">
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => onSelectSection('overview')}
              className="hover:text-[#252422] dark:hover:text-white transition-colors cursor-pointer"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('adsense')}
              className="hover:text-[#252422] dark:hover:text-white transition-colors cursor-pointer"
            >
              AdSense & GA4
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('domains')}
              className="hover:text-[#252422] dark:hover:text-white transition-colors cursor-pointer"
            >
              Domains
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('profile')}
              className="hover:text-[#252422] dark:hover:text-white transition-colors cursor-pointer"
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
