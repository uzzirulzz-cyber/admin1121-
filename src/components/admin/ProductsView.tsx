"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Music2, Pencil, Plus, Upload } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api, uploadFile } from "@/lib/client/api";
import { formatMoney } from "@/lib/format";

interface Product {
  id: string;
  slug: string;
  title: string;
  producer: string | null;
  description: string | null;
  genre: string | null;
  bpm: number | null;
  musicalKey: string | null;
  tags: string | null;
  coverUrl: string | null;
  audioUrl: string | null;
  priceLeaseCents: number;
  priceExclusiveCents: number;
  published: boolean;
  featured: boolean;
  createdAt: string;
}

interface FormState {
  title: string;
  producer: string;
  genre: string;
  bpm: string;
  musicalKey: string;
  tags: string;
  description: string;
  coverUrl: string;
  audioUrl: string;
  priceLease: string;
  priceExclusive: string;
  published: boolean;
  featured: boolean;
}

const EMPTY_FORM: FormState = {
  title: "",
  producer: "PlayBeat",
  genre: "",
  bpm: "",
  musicalKey: "",
  tags: "",
  description: "",
  coverUrl: "",
  audioUrl: "",
  priceLease: "29.99",
  priceExclusive: "149",
  published: true,
  featured: false,
};

function toForm(p: Product): FormState {
  return {
    title: p.title,
    producer: p.producer ?? "",
    genre: p.genre ?? "",
    bpm: p.bpm != null ? String(p.bpm) : "",
    musicalKey: p.musicalKey ?? "",
    tags: p.tags ?? "",
    description: p.description ?? "",
    coverUrl: p.coverUrl ?? "",
    audioUrl: p.audioUrl ?? "",
    priceLease: (p.priceLeaseCents / 100).toFixed(2),
    priceExclusive: (p.priceExclusiveCents / 100).toFixed(2),
    published: p.published,
    featured: p.featured,
  };
}

export default function ProductsView() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [uploadingKey, setUploadingKey] = useState<"cover" | "audio" | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ products: Product[] }>("/api/admin/products");
      setProducts(data.products);
    } catch (err) {
      toast({
        title: "Failed to load products",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm(toForm(p));
    setDialogOpen(true);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleUpload(kind: "cover" | "audio", file: File | undefined) {
    if (!file) return;
    setUploadingKey(kind);
    try {
      const { url } = await uploadFile(file);
      if (kind === "cover") set("coverUrl", url);
      else set("audioUrl", url);
      toast({ title: "File uploaded", description: file.name });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUploadingKey(null);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        producer: form.producer.trim() || null,
        genre: form.genre.trim() || null,
        bpm: form.bpm ? Number(form.bpm) : null,
        musicalKey: form.musicalKey.trim() || null,
        tags: form.tags.trim() || null,
        description: form.description.trim() || null,
        coverUrl: form.coverUrl.trim() || null,
        audioUrl: form.audioUrl.trim() || null,
        priceLeaseCents: Math.round(Number(form.priceLease || "0") * 100),
        priceExclusiveCents: Math.round(Number(form.priceExclusive || "0") * 100),
        published: form.published,
        featured: form.featured,
      };
      if (editing) {
        await api(`/api/admin/products/${editing.id}`, { method: "PATCH", body });
        toast({ title: "Product updated" });
      } else {
        await api("/api/admin/products", { method: "POST", body });
        toast({ title: "Product created" });
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(p: Product, published: boolean) {
    try {
      await api(`/api/admin/products/${p.id}`, { method: "PATCH", body: { published } });
      setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, published } : x)));
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await api(`/api/admin/products/${deleting.id}`, { method: "DELETE" });
      toast({ title: "Product deleted", description: deleting.title });
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> New beat
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Beat</TableHead>
              <TableHead className="hidden sm:table-cell">Genre / BPM</TableHead>
              <TableHead>Prices</TableHead>
              <TableHead>Live</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No products yet. Create your first beat.
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {p.coverUrl ? (
                        <img
                          src={p.coverUrl}
                          alt={`${p.title} cover`}
                          className="h-10 w-10 rounded object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                          <Music2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate max-w-40">{p.title}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-40">
                          /{p.slug}
                        </p>
                      </div>
                      {p.featured && <Badge className="hidden lg:inline-flex">Featured</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {[p.genre, p.bpm ? `${p.bpm} BPM` : null].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatMoney(p.priceLeaseCents)}
                    <span className="text-muted-foreground"> / </span>
                    {formatMoney(p.priceExclusiveCents)}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={p.published}
                      onCheckedChange={(v) => togglePublished(p, v)}
                      aria-label={`Toggle ${p.title} published`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleting(p)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.title}` : "New beat"}</DialogTitle>
            <DialogDescription>
              Fill in the beat details. Uploaded files go to your store storage.
            </DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="p-title">Title *</Label>
              <Input
                id="p-title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Midnight Drive"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-producer">Producer</Label>
              <Input
                id="p-producer"
                value={form.producer}
                onChange={(e) => set("producer", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-genre">Genre</Label>
              <Input
                id="p-genre"
                value={form.genre}
                onChange={(e) => set("genre", e.target.value)}
                placeholder="Trap"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-bpm">BPM</Label>
              <Input
                id="p-bpm"
                type="number"
                value={form.bpm}
                onChange={(e) => set("bpm", e.target.value)}
                placeholder="140"
                min={20}
                max={300}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-key">Key</Label>
              <Input
                id="p-key"
                value={form.musicalKey}
                onChange={(e) => set("musicalKey", e.target.value)}
                placeholder="F Minor"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-tags">Tags (comma separated)</Label>
              <Input
                id="p-tags"
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="dark,808,hard"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-lease">Lease price (USD) *</Label>
              <Input
                id="p-lease"
                type="number"
                step="0.01"
                min="0"
                value={form.priceLease}
                onChange={(e) => set("priceLease", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-exclusive">Exclusive price (USD) *</Label>
              <Input
                id="p-exclusive"
                type="number"
                step="0.01"
                min="0"
                value={form.priceExclusive}
                onChange={(e) => set("priceExclusive", e.target.value)}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea
                id="p-desc"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Cover artwork</Label>
              <div className="flex items-center gap-3">
                {form.coverUrl ? (
                  <img
                    src={form.coverUrl}
                    alt="Cover preview"
                    className="h-14 w-14 rounded-lg object-cover border border-border"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-muted border border-border" />
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload("cover", e.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingKey !== null}
                >
                  {uploadingKey === "cover" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload image
                </Button>
                <Input
                  value={form.coverUrl}
                  onChange={(e) => set("coverUrl", e.target.value)}
                  placeholder="...or paste an image URL"
                />
              </div>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Audio file</Label>
              <div className="flex items-center gap-3 flex-wrap">
                {form.audioUrl ? (
                  <audio controls src={form.audioUrl} className="h-9 max-w-56" />
                ) : (
                  <span className="text-sm text-muted-foreground">No audio attached</span>
                )}
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => handleUpload("audio", e.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => audioInputRef.current?.click()}
                  disabled={uploadingKey !== null}
                >
                  {uploadingKey === "audio" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload audio
                </Button>
                <Input
                  value={form.audioUrl}
                  onChange={(e) => set("audioUrl", e.target.value)}
                  placeholder="...or paste an audio URL"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Files over 900 KB need R2 storage enabled on the Cloudflare account, or link an
                external URL.
              </p>
            </div>
            <div className="flex items-center gap-6 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.published}
                  onCheckedChange={(v) => set("published", v)}
                  aria-label="Published"
                />
                Published
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.featured}
                  onCheckedChange={(v) => set("featured", v)}
                  aria-label="Featured"
                />
                Featured
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !form.title.trim()}>
              {saving ? "Saving..." : editing ? "Save changes" : "Create beat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleting !== null} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this beat?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.title} will be removed permanently. Past orders keep their records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
