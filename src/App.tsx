import React, { useCallback, useEffect, useState } from 'react';
import { LogOut, Moon, Plus, Sun } from 'lucide-react';
import type {
  AccountRole,
  AdminSummary,
  AuthStatusResponse,
  UserProfile,
} from './types/admin';
import { api, setAuthToken, setUnauthorizedHandler } from './lib/api';
import { identifyTikTokUser, trackTikTokPageView } from './lib/tiktokPixel';
import { LoginView } from './components/LoginView';
import { AdminShell, type NavSection } from './components/AdminShell';
import { OverviewPage } from './components/OverviewPage';
import { AdSensePage } from './components/AdSensePage';
import { ChannelConnectionsPage } from './components/ChannelConnectionsPage';
import { AffiliatePage } from './components/AffiliatePage';
import { CrmPage } from './components/CrmPage';
import { OrdersPage } from './components/OrdersPage';
import { CatalogPage } from './components/CatalogPage';
import { CustomersPage } from './components/CustomersPage';
import { DomainsPage } from './components/DomainsPage';
import { IntegrationsPage } from './components/IntegrationsPage';
import { ProfileAccountPage } from './components/ProfileAccountPage';

export default function App() {
  const [dark, setDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pb_theme_dark');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null);
  const [userRole, setUserRole] = useState<AccountRole | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [crmCreateSignal, setCrmCreateSignal] = useState(0);
  const [orderCreateSignal, setOrderCreateSignal] = useState(0);
  const [catalogCreateSignal, setCatalogCreateSignal] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('pb_theme_dark', String(dark));
    } catch {
      // ignore storage errors
    }
  }, [dark]);

  const loadAuthStatus = useCallback(async () => {
    try {
      const status = await api.authStatus();
      setAuthStatus(status);
    } catch {
      setAuthStatus({ ok: true, mode: 'setup_required', upstreamConfigured: false });
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.accountProfile();
      setUserProfile(res.profile);
      void identifyTikTokUser({
        email: res.profile.email,
        phone: res.profile.phone,
        externalId: res.profile.uid,
      });
    } catch {
      // Handled by unauthorized handler if 401
    }
  }, []);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await api.summary();
      setSummary(res.summary);
    } catch {
      // Handled by unauthorized handler if 401
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuthStatus();
    setUnauthorizedHandler(() => {
      setUserRole(null);
      setUserProfile(null);
      setSummary(null);
      loadAuthStatus();
    });
    return () => setUnauthorizedHandler(null);
  }, [loadAuthStatus]);

  useEffect(() => {
    if (userRole) {
      loadProfile();
      if (userRole === 'admin') {
        loadSummary();
      }
    }
  }, [userRole, loadProfile, loadSummary]);

  useEffect(() => {
    trackTikTokPageView();
  }, [activeSection]);

  async function handleSignOut() {
    try {
      await api.logout();
    } catch {
      // ignore logout network errors
    } finally {
      setAuthToken(null);
      setUserRole(null);
      setUserProfile(null);
      setSummary(null);
      setActiveSection('overview');
      loadAuthStatus();
    }
  }

  if (!authStatus) {
    return (
      <div className="min-h-screen bg-[#f4f3ef] dark:bg-[#1c1b1a] flex items-center justify-center">
        <p className="text-sm font-medium text-[#66615b] dark:text-[#9a9a9a]">
          Initializing PlayBeat Admin...
        </p>
      </div>
    );
  }

  if (!userRole) {
    return (
      <LoginView
        authStatus={authStatus}
        dark={dark}
        onToggleTheme={() => setDark((d) => !d)}
        onAuthenticated={(role) => setUserRole(role)}
      />
    );
  }

  // Self-service Paper Dashboard PRO Account Portal for Customer accounts
  if (userRole === 'customer') {
    return (
      <div className="min-h-screen bg-[#f4f3ef] dark:bg-[#1c1b1a] text-[#252422] dark:text-[#f4f3ef] flex flex-col">
        <header className="sticky top-0 z-20 h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 bg-[#f4f3ef]/95 dark:bg-[#1c1b1a]/95 backdrop-blur-sm border-b border-[#ddd9ce] dark:border-white/10">
          <div className="flex items-center gap-2.5 text-sm min-w-0">
            <span className="w-8 h-8 rounded-full bg-[#51cbce] text-white font-bold text-xs flex items-center justify-center shrink-0">
              PB
            </span>
            <span className="font-semibold tracking-tight text-[#252422] dark:text-white whitespace-nowrap">
              {userProfile?.brandTitle || 'PlayBeat Account'}
            </span>
            <span className="text-[#9a9a9a]">/</span>
            <span className="text-[#66615b] dark:text-[#9a9a9a] truncate">
              {userProfile?.email || 'User Profile'}
            </span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setDark((d) => !d)}
              aria-label={dark ? 'Switch to light paper mode' : 'Switch to dark paper mode'}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-[#252422] text-[#66615b] dark:text-[#cfcac0] border border-[#ddd9ce] dark:border-white/10 shadow-xs hover:text-[#252422] dark:hover:text-white transition-colors cursor-pointer"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="paper-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-6 pb-10 max-w-[1280px] w-full mx-auto">
          <ProfileAccountPage
            profile={userProfile}
            onProfileUpdated={setUserProfile}
          />
        </main>
      </div>
    );
  }

  const headerAction =
    activeSection === 'orders' ? (
      <button
        type="button"
        onClick={() => setOrderCreateSignal((n) => n + 1)}
        className="paper-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>New Order</span>
      </button>
    ) : activeSection === 'crm' ? (
      <button
        type="button"
        onClick={() => setCrmCreateSignal((n) => n + 1)}
        className="paper-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Lead</span>
      </button>
    ) : activeSection === 'catalog' ? (
      <button
        type="button"
        onClick={() => setCatalogCreateSignal((n) => n + 1)}
        className="paper-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Product</span>
      </button>
    ) : undefined;

  return (
    <AdminShell
      activeSection={activeSection}
      onSelectSection={setActiveSection}
      userProfile={userProfile}
      dark={dark}
      onToggleTheme={() => setDark((d) => !d)}
      onSignOut={handleSignOut}
      headerAction={headerAction}
    >
      {activeSection === 'overview' && (
        <OverviewPage
          summary={summary}
          loading={summaryLoading}
          onNavigate={setActiveSection}
          onRefresh={loadSummary}
        />
      )}
      {activeSection === 'adsense' && <AdSensePage onNavigate={setActiveSection} />}
      {activeSection === 'channels' && <ChannelConnectionsPage onDataChanged={loadSummary} />}
      {activeSection === 'affiliate' && <AffiliatePage />}
      {activeSection === 'crm' && (
        <CrmPage onDataChanged={loadSummary} openCreateSignal={crmCreateSignal} />
      )}
      {activeSection === 'orders' && (
        <OrdersPage onDataChanged={loadSummary} openCreateSignal={orderCreateSignal} />
      )}
      {activeSection === 'catalog' && (
        <CatalogPage onDataChanged={loadSummary} openCreateSignal={catalogCreateSignal} />
      )}
      {activeSection === 'customers' && <CustomersPage onDataChanged={loadSummary} />}
      {activeSection === 'domains' && <DomainsPage onDataChanged={loadSummary} />}
      {activeSection === 'integrations' && <IntegrationsPage />}
      {activeSection === 'profile' && (
        <ProfileAccountPage
          profile={userProfile}
          onProfileUpdated={setUserProfile}
          onDataChanged={loadSummary}
        />
      )}
    </AdminShell>
  );
}
