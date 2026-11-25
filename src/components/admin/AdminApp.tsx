"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AudioWaveform,
  Disc3,
  LayoutDashboard,
  Loader2,
  LogOut,
  Music2,
  Settings,
  ShoppingCart,
  Store,
  UserCog,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/client/api";
import DashboardView from "@/components/admin/DashboardView";
import ProductsView from "@/components/admin/ProductsView";
import OrdersView from "@/components/admin/OrdersView";
import { CustomersView, SettingsView, UsersView } from "@/components/admin/MiscViews";
import SpotifyView from "@/components/admin/SpotifyView";

interface AdminUser {
  id: string;
  email: string;
  name: string;
}

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "products", label: "Products", icon: Music2 },
  { key: "orders", label: "Orders", icon: ShoppingCart },
  { key: "customers", label: "Customers", icon: Users },
  { key: "spotify", label: "Spotify import", icon: Disc3 },
  { key: "users", label: "Admin users", icon: UserCog },
  { key: "settings", label: "Settings", icon: Settings },
];

function currentViewFromHash(): string {
  const hash = window.location.hash;
  const match = hash.match(/^#\/admin\/?([a-z]*)/);
  const key = match?.[1] ?? "dashboard";
  return NAV.some((n) => n.key === key) ? key : "dashboard";
}

export default function AdminApp() {
  const { toast } = useToast();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [view, setView] = useState("dashboard");

  useEffect(() => {
    api<{ user: AdminUser | null }>("/api/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    setView(currentViewFromHash());
    const onHash = () => setView(currentViewFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((key: string) => {
    window.location.hash = key === "dashboard" ? "#/admin" : `#/admin/${key}`;
    setView(key);
  }, []);

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      toast({ title: "Signed out" });
    }
  }

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <LoginView onSuccess={setUser} />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border sticky top-0 h-screen p-4">
        <div className="flex items-center gap-2 font-bold text-lg mb-6 px-2">
          <span className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <AudioWaveform className="h-5 w-5" />
          </span>
          PlayBeat Admin
        </div>
        <nav className="flex flex-col gap-1" aria-label="Admin sections">
          {NAV.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => navigate(item.key)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                view === item.key
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          <a
            href="#/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-accent transition-colors"
          >
            <Store className="h-4 w-4" /> View storefront
          </a>
          <div className="rounded-lg border border-border p-3">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <Button variant="outline" size="sm" className="w-full mt-2 gap-2" onClick={logout}>
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
          <div className="px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              <span className="h-7 w-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                <AudioWaveform className="h-4 w-4" />
              </span>
              PlayBeat Admin
            </div>
            <div className="flex items-center gap-1">
              <a
                href="#/"
                className="text-sm text-muted-foreground hover:text-foreground px-2 py-1.5"
                aria-label="View storefront"
              >
                <Store className="h-4 w-4" />
              </a>
              <Button variant="ghost" size="sm" onClick={logout} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2" aria-label="Admin sections">
            {NAV.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.key)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors ${
                  view === item.key
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        <main className="flex-1 p-4 sm:p-6 w-full max-w-6xl mx-auto">
          {view === "dashboard" && <DashboardView />}
          {view === "products" && <ProductsView />}
          {view === "orders" && <OrdersView />}
          {view === "customers" && <CustomersView />}
          {view === "spotify" && <SpotifyView />}
          {view === "users" && <UsersView currentUserId={user.id} />}
          {view === "settings" && <SettingsView />}
        </main>
      </div>
    </div>
  );
}

function LoginView({ onSuccess }: { onSuccess: (user: AdminUser) => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await api<{ user: AdminUser }>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      onSuccess(data.user);
    } catch (err) {
      toast({
        title: "Sign in failed",
        description: err instanceof Error ? err.message : "Check your credentials",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 font-bold text-xl mb-6">
          <span className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <AudioWaveform className="h-6 w-6" />
          </span>
          PlayBeat Admin
        </div>
        <form
          onSubmit={submit}
          className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4"
        >
          <div>
            <h1 className="text-lg font-semibold">Sign in</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Restricted to store administrators.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@playbeat.digital"
              required
              autoComplete="username"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="h-11" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
