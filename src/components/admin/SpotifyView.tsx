"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Disc3,
  Download,
  ExternalLink,
  Eye,
  Loader2,
  Save,
  Unlink,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/client/api";

interface SpotifyStatus {
  connected: boolean;
  account: {
    displayName: string | null;
    email: string | null;
    importedCount: number;
    connectedAt: string;
    scope: string | null;
  } | null;
  clientId: string | null;
  redirectUri: string;
}

interface ImportSummary {
  imported: number;
  updated: number;
  skipped: number;
  savedTracksScanned: number;
  playlistsScanned: number;
  elapsedMs: number;
}

export default function SpotifyView() {
  const { toast } = useToast();
  const [status, setStatus] = useState<SpotifyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientIdInput, setClientIdInput] = useState("");
  const [savingClientId, setSavingClientId] = useState(false);
  const [importing, setImporting] = useState(false);
  const [includePlaylists, setIncludePlaylists] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Surface the OAuth callback result (?connected=1 / ?error=...) once.
  useEffect(() => {
    const hash = window.location.hash;
    const qIndex = hash.indexOf("?");
    if (qIndex === -1) return;
    const params = new URLSearchParams(hash.slice(qIndex + 1));
    if (params.get("connected") === "1") {
      toast({ title: "Spotify account connected" });
    }
    const error = params.get("error");
    if (error) {
      toast({
        title: "Spotify connection problem",
        description: error,
        variant: "destructive",
      });
    }
    if (params.get("connected") || error) {
      window.history.replaceState(null, "", window.location.pathname + "#/admin/spotify");
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api<SpotifyStatus>("/api/spotify/status");
      setStatus(data);
      setClientIdInput(data.clientId ?? "");
    } catch (err) {
      toast({
        title: "Failed to load Spotify status",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveClientId() {
    setSavingClientId(true);
    try {
      const data = await api<{ clientId: string | null }>("/api/spotify/settings", {
        method: "POST",
        body: { clientId: clientIdInput },
      });
      toast({
        title: data.clientId ? "Client ID saved" : "Client ID cleared",
        description: data.clientId ?? undefined,
      });
      await load();
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSavingClientId(false);
    }
  }

  function connect() {
    window.location.href = "/api/spotify/connect";
  }

  async function disconnect() {
    try {
      await api("/api/spotify/disconnect", { method: "POST" });
      toast({ title: "Spotify account disconnected" });
      await load();
    } catch (err) {
      toast({
        title: "Disconnect failed",
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function importLibrary() {
    setImporting(true);
    try {
      const data = await api<{ summary: ImportSummary }>("/api/spotify/import", {
        method: "POST",
        body: { includePlaylists },
      });
      const s = data.summary;
      toast({
        title: `Import finished in ${(s.elapsedMs / 1000).toFixed(1)}s`,
        description: `${s.imported} new tracks imported, ${s.updated} refreshed, ${s.skipped} skipped. ${
          includePlaylists ? `${s.playlistsScanned} playlists scanned.` : ""
        } Tracks are drafts — review them in Products.`,
      });
      await load();
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setImporting(false);
    }
  }

  async function publishAll() {
    setPublishing(true);
    try {
      const data = await api<{ published: number }>("/api/spotify/publish-all", {
        method: "POST",
      });
      toast({
        title: `${data.published} imported track${data.published === 1 ? "" : "s"} published`,
        description: "They are now live in the storefront.",
      });
      setPublishConfirmOpen(false);
    } catch (err) {
      toast({
        title: "Publish failed",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setPublishing(false);
    }
  }

  function copyRedirectUri() {
    if (!status) return;
    navigator.clipboard
      .writeText(status.redirectUri)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        toast({ title: "Redirect URI copied" });
      })
      .catch(() => toast({ title: "Copy failed", description: "Copy it manually from the field." }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold">Spotify integration</h1>
        {status?.connected ? (
          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15">
            Connected
          </Badge>
        ) : (
          <Badge variant="outline">Not connected</Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Connect your Spotify account to pull your <strong>entire music library</strong> (saved
        tracks, and optionally every playlist) into the catalog as draft beats. Each track
        arrives with real cover art, artist, duration and — when Spotify provides one — a
        30-second preview that plays right in the storefront.
      </p>

      {/* Setup steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">One-time setup</CardTitle>
          <CardDescription>
            Uses the Authorization Code + PKCE flow, so no client secret is needed — only the
            Client ID from your Spotify developer dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ol className="list-decimal pl-5 text-sm space-y-1.5 text-muted-foreground">
            <li>
              Open the{" "}
              <a
                href="https://developer.spotify.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline underline-offset-2 inline-flex items-center gap-1"
              >
                Spotify developer dashboard <ExternalLink className="h-3 w-3" />
              </a>{" "}
              and click <strong className="text-foreground">Create app</strong> (any name, enable{" "}
              <em>Web API</em>).
            </li>
            <li>
              Add this <strong className="text-foreground">Redirect URI</strong> to the app:
              <div className="mt-1.5 flex items-center gap-2">
                <Input readOnly value={status.redirectUri} className="font-mono text-xs h-9" />
                <Button variant="outline" size="sm" onClick={copyRedirectUri} className="gap-1.5 shrink-0">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </li>
            <li>
              Paste the app&apos;s <strong className="text-foreground">Client ID</strong> below and save.
            </li>
          </ol>
          <Separator />
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="grid gap-2 flex-1">
              <Label htmlFor="sp-client-id">Spotify Client ID</Label>
              <Input
                id="sp-client-id"
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
                placeholder="e.g. 4c1f9a2b3d4e5f6a7b8c9d0e1f2a3b4c"
                className="font-mono text-sm"
                autoComplete="off"
              />
            </div>
            <Button
              onClick={saveClientId}
              disabled={savingClientId}
              className="gap-2 h-10 shrink-0"
            >
              {savingClientId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connection card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>
            {status.connected
              ? "Connected account used for library imports."
              : "Connect a Spotify account to enable imports. You can disconnect at any time — imported tracks are kept."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {status.connected && status.account ? (
            <>
              <div className="flex items-center gap-3">
                <span className="h-11 w-11 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                  <Disc3 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {status.account.displayName || "Spotify user"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {status.account.email || "email hidden by Spotify"} ·{" "}
                    {new Date(status.account.connectedAt).toLocaleDateString()} ·{" "}
                    {status.account.importedCount} imported track
                    {status.account.importedCount === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={connect} className="gap-2">
                  <Disc3 className="h-4 w-4" /> Reconnect
                </Button>
                <Button variant="outline" onClick={disconnect} className="gap-2">
                  <Unlink className="h-4 w-4" /> Disconnect
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <Button onClick={connect} disabled={!status.clientId} className="gap-2 w-fit">
                <Disc3 className="h-4 w-4" /> Connect Spotify account
              </Button>
              {!status.clientId && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Save a Client ID above to enable
                  connecting.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import your library</CardTitle>
          <CardDescription>
            Pulls up to 2,000 saved tracks (and up to 50 playlists with 500 tracks each) from
            Spotify. Already-imported tracks are refreshed, never duplicated. Large libraries can
            take a minute.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {status.connected ? (
            <>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={includePlaylists}
                  onCheckedChange={setIncludePlaylists}
                  aria-label="Also import playlists"
                />
                Also import tracks from my playlists
              </label>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={importLibrary} disabled={importing} className="gap-2">
                  {importing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {importing ? "Importing full library..." : "Import full library"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPublishConfirmOpen(true)}
                  disabled={importing}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" /> Publish all imported drafts
                </Button>
                <a
                  href="#/admin/products"
                  className="inline-flex items-center rounded-md border border-border px-3 text-sm hover:bg-accent transition-colors h-9"
                >
                  Review in Products
                </a>
              </div>
              <p className="text-xs text-muted-foreground">
                Imported tracks land as <strong>drafts</strong> (not visible in the storefront)
                with default lease $29.99 / exclusive $149 pricing — set your own prices per track
                in Products before publishing.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Connect a Spotify account above to unlock library import.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Publish-all confirmation */}
      <AlertDialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Publish all imported tracks?</AlertDialogTitle>
            <AlertDialogDescription>
              Every Spotify import that is still a draft will go live in the storefront with its
              current pricing (defaults: $29.99 lease / $149 exclusive). You can unpublish any
              track later in Products.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={publishAll} disabled={publishing}>
              {publishing ? "Publishing..." : "Publish all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
