"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/client/api";
import { formatMoney } from "@/lib/format";

/* ------------------------------- Customers ------------------------------ */

interface Customer {
  name: string;
  email: string;
  ordersCount: number;
  spentCents: number;
  lastOrderAt: string;
}

export function CustomersView() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ customers: Customer[] }>("/api/admin/customers")
      .then((d) => setCustomers(d.customers))
      .catch((err) =>
        toast({
          title: "Failed to load customers",
          description: err instanceof Error ? err.message : undefined,
        })
      )
      .finally(() => setLoading(false));
  }, [toast]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Customers</h1>
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Spent</TableHead>
              <TableHead className="hidden sm:table-cell">Last order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No customers yet.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => (
                <TableRow key={c.email}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell>{c.ordersCount}</TableCell>
                  <TableCell className="font-semibold">{formatMoney(c.spentCents)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {new Date(c.lastOrderAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ------------------------------ Admin users ----------------------------- */

interface AdminUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export function UsersView({ currentUserId }: { currentUserId: string }) {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [resetting, setResetting] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ users: AdminUser[] }>("/api/admin/users");
      setUsers(data.users);
    } catch (err) {
      toast({
        title: "Failed to load users",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function addUser() {
    setSaving(true);
    try {
      await api("/api/admin/users", { method: "POST", body: form });
      toast({ title: "Admin added", description: form.email });
      setAddOpen(false);
      setForm({ name: "", email: "", password: "" });
      await load();
    } catch (err) {
      toast({
        title: "Could not add admin",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    if (!resetting) return;
    setSaving(true);
    try {
      await api(`/api/admin/users/${resetting.id}`, {
        method: "PATCH",
        body: { password: newPassword },
      });
      toast({ title: "Password updated", description: resetting.email });
      setResetting(null);
      setNewPassword("");
    } catch (err) {
      toast({
        title: "Reset failed",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await api(`/api/admin/users/${deleting.id}`, { method: "DELETE" });
      toast({ title: "Admin removed", description: deleting.email });
      setDeleting(null);
      await load();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Admin users</h1>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add admin
        </Button>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden sm:table-cell">Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.name}
                    {u.id === currentUserId && (
                      <span className="ml-2 text-xs text-primary">(you)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setResetting(u);
                          setNewPassword("");
                        }}
                      >
                        <KeyRound className="h-3.5 w-3.5" /> Reset password
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={u.id === currentUserId}
                        onClick={() => setDeleting(u)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader>
            <DialogTitle>Add admin</DialogTitle>
            <DialogDescription>
              Admins can manage products, orders and store settings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="u-name">Name</Label>
              <Input
                id="u-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="u-email">Email</Label>
              <Input
                id="u-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="u-pass">Password (min 8 chars)</Label>
              <Input
                id="u-pass"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={addUser}
              disabled={saving || !form.name || !form.email || form.password.length < 8}
            >
              {saving ? "Adding..." : "Add admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetting !== null}
        onOpenChange={(v) => {
          if (!v) setResetting(null);
        }}
      >
        <DialogContent className="bg-card max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetting?.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="new-pass">New password (min 8 chars)</Label>
            <Input
              id="new-pass"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetting(null)}>
              Cancel
            </Button>
            <Button onClick={resetPassword} disabled={saving || newPassword.length < 8}>
              {saving ? "Saving..." : "Update password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this admin?</AlertDialogTitle>
            <AlertDialogDescription>{deleting?.email} will lose access.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ------------------------------- Settings ------------------------------- */

export function SettingsView() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ settings: Record<string, string> }>("/api/admin/settings")
      .then((d) => setSettings(d.settings))
      .catch((err) =>
        toast({
          title: "Failed to load settings",
          description: err instanceof Error ? err.message : undefined,
        })
      )
      .finally(() => setLoading(false));
  }, [toast]);

  async function save() {
    setSaving(true);
    try {
      const data = await api<{ settings: Record<string, string> }>("/api/admin/settings", {
        method: "PUT",
        body: { settings },
      });
      setSettings(data.settings);
      toast({ title: "Settings saved" });
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="s-name">Store name</Label>
          <Input
            id="s-name"
            value={settings.store_name ?? ""}
            onChange={(e) => setSettings((s) => ({ ...s, store_name: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="s-email">Contact email</Label>
          <Input
            id="s-email"
            type="email"
            value={settings.contact_email ?? ""}
            onChange={(e) => setSettings((s) => ({ ...s, contact_email: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label>Payment instructions (shown at checkout)</Label>
          <Textarea
            value={settings.payment_instructions ?? ""}
            onChange={(e) => setSettings((s) => ({ ...s, payment_instructions: e.target.value }))}
            rows={8}
          />
          <p className="text-xs text-muted-foreground">
            Include your bank account, e-wallet or crypto address. The order number is
            automatically shown to the buyer as the payment reference.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          Currency: <span className="font-medium text-foreground">USD ($)</span> — fixed for this
          version.
        </div>
        <Button onClick={save} disabled={saving} className="w-fit">
          {saving ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
