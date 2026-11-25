"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AudioWaveform,
  Download,
  Music2,
  Pause,
  Play,
  ShieldCheck,
  ShoppingBag,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/client/api";
import { useCart, usePlayer, type CartItem } from "@/lib/client/store";
import { formatMoney } from "@/lib/format";

interface Product {
  id: string;
  slug: string;
  title: string;
  producer: string;
  description: string | null;
  genre: string | null;
  bpm: number | null;
  musicalKey: string | null;
  tags: string | null;
  coverUrl: string | null;
  audioUrl: string | null;
  priceLeaseCents: number;
  priceExclusiveCents: number;
  featured: boolean;
  createdAt: string;
}

interface CheckoutResult {
  orderNumber: string;
  totalCents: number;
  paymentInstructions: string;
}

export default function Storefront() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState("all");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [success, setSuccess] = useState<CheckoutResult | null>(null);
  const items = useCart((s) => s.items);
  const removeFromCart = useCart((s) => s.remove);
  const clearCart = useCart((s) => s.clear);
  const addToCart = useCart((s) => s.add);
  const play = usePlayer((s) => s.play);
  const track = usePlayer((s) => s.track);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (genre && genre !== "all") params.set("genre", genre);
      params.set("sort", sort);
      const data = await api<{ products: Product[]; genres: string[] }>(
        `/api/public/products?${params.toString()}`
      );
      setProducts(data.products);
      setGenres(data.genres);
    } catch (err) {
      toast({
        title: "Could not load the catalog",
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setLoading(false);
    }
  }, [q, genre, sort, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const cartTotal = useMemo(
    () => items.reduce((sum, i) => sum + i.priceCents, 0),
    [items]
  );

  function addToCartDefault(p: Product) {
    addToCart({
      productId: p.id,
      slug: p.slug,
      title: p.title,
      coverUrl: p.coverUrl,
      licenseType: "lease",
      priceCents: p.priceLeaseCents,
    });
    toast({ title: "Added to cart", description: `${p.title} (lease license)` });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header cartCount={items.length} onCart={() => setCartOpen(true)} />

      <main className="flex-1 pb-40">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(700px 340px at 15% 0%, oklch(0.696 0.17 162.48 / 22%), transparent 60%), radial-gradient(600px 300px at 85% 20%, oklch(0.715 0.14 190 / 14%), transparent 60%)",
            }}
          />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <Badge variant="outline" className="mb-4 border-emerald-500/40 text-emerald-400">
              <Zap className="h-3 w-3 mr-1" /> Instant license checkout
            </Badge>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight max-w-3xl">
              Beats that hit{" "}
              <span className="text-primary">different</span>.
            </h1>
            <p className="mt-4 text-muted-foreground text-base sm:text-lg max-w-2xl">
              Premium instrumentals from PlayBeat producers. Preview every track, pick a
              lease or exclusive license, and check out in under a minute.
            </p>
            <div className="mt-8 max-w-xl">
              <div className="relative">
                <SearchIcon />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by mood, genre, BPM..."
                  className="pl-10 h-12 bg-card/70 backdrop-blur"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Catalog */}
        <section id="catalog" className="max-w-6xl mx-auto px-4 sm:px-6 py-10 w-full">
          <div className="flex flex-wrap items-center gap-3 justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
              <Music2 className="h-5 w-5 text-primary" /> Catalog
              <span className="text-sm text-muted-foreground font-normal">
                ({products.length} {products.length === 1 ? "beat" : "beats"})
              </span>
            </h2>
            <div className="flex gap-2">
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger className="w-[150px] bg-card">
                  <SelectValue placeholder="Genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All genres</SelectItem>
                  {genres.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[160px] bg-card">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="price-asc">Price: low to high</SelectItem>
                  <SelectItem value="price-desc">Price: high to low</SelectItem>
                  <SelectItem value="bpm">Tempo (BPM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card h-72 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              No beats match your search. Try a different keyword or genre.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((p) => (
                <BeatCard
                  key={p.id}
                  product={p}
                  playing={track?.trackId === p.id}
                  onPlay={() =>
                    play({
                      trackId: p.id,
                      title: p.title,
                      coverUrl: p.coverUrl,
                      audioUrl: p.audioUrl,
                    })
                  }
                  onDetails={() => setDetail(p)}
                  onAddLease={() => addToCartDefault(p)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Trust strip */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 w-full">
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: <ShieldCheck className="h-5 w-5 text-primary" />,
                title: "Clear licensing",
                text: "Lease for streaming projects or buy the exclusive with full rights transfer.",
              },
              {
                icon: <Download className="h-5 w-5 text-primary" />,
                title: "Studio-ready files",
                text: "High-quality audio delivered for every confirmed order, tagged to you.",
              },
              {
                icon: <AudioWaveform className="h-5 w-5 text-primary" />,
                title: "Producer support",
                text: "Questions about stems, vocals or custom edits? We answer fast.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-border bg-card p-5 flex flex-col gap-2"
              >
                {card.icon}
                <h3 className="font-semibold">{card.title}</h3>
                <p className="text-sm text-muted-foreground">{card.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />

      {/* Sticky player */}
      <PlayerBar />

      {/* Detail dialog */}
      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-2xl bg-card max-h-[85vh] overflow-y-auto">
          {detail && (
            <div>
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-3">
                  {detail.title}
                  {detail.featured && (
                    <Badge className="bg-primary text-primary-foreground">Featured</Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  by {detail.producer} · {detail.genre ?? "Uncategorized"}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 grid sm:grid-cols-[220px_1fr] gap-5">
                <div
                  className="relative rounded-lg overflow-hidden aspect-square cursor-pointer group"
                  onClick={() =>
                    play({
                      trackId: detail.id,
                      title: detail.title,
                      coverUrl: detail.coverUrl,
                      audioUrl: detail.audioUrl,
                    })
                  }
                >
                  {detail.coverUrl ? (
                    <img
                      src={detail.coverUrl}
                      alt={`${detail.title} cover art`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Music2 className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-12 w-12 text-white" />
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2">
                    {detail.bpm ? <Badge variant="secondary">{detail.bpm} BPM</Badge> : null}
                    {detail.musicalKey ? <Badge variant="secondary">{detail.musicalKey}</Badge> : null}
                    {detail.genre ? <Badge variant="secondary">{detail.genre}</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{detail.description}</p>
                  <Separator />
                  <LicensePicker
                    product={detail}
                    onAdd={(item) => {
                      addToCart(item);
                      setDetail(null);
                      toast({
                        title: "Added to cart",
                        description: `${item.title} (${item.licenseType} license)`,
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cart sheet */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="bg-card w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> Your cart ({items.length})
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto max-h-[50vh] px-4">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Your cart is empty. Add a beat to get started.
              </p>
            ) : (
              <div className="flex flex-col gap-3 py-2">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.licenseType}`}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    {item.coverUrl ? (
                      <img
                        src={item.coverUrl}
                        alt={`${item.title} cover`}
                        className="h-12 w-12 rounded object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                        <Music2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {item.licenseType} license
                      </p>
                    </div>
                    <span className="text-sm font-semibold">{formatMoney(item.priceCents)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${item.title} from cart`}
                      onClick={() => removeFromCart(item.productId, item.licenseType)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="px-4 pb-6 pt-2 border-t border-border">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold text-base">{formatMoney(cartTotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Taxes may apply depending on your region. License terms are delivered with your
              order confirmation.
            </p>
            <Button
              className="w-full h-11"
              disabled={items.length === 0}
              onClick={() => {
                setCartOpen(false);
                setCheckoutOpen(true);
              }}
            >
              Continue to checkout
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Checkout dialog */}
      <CheckoutDialog
        open={checkoutOpen}
        items={items}
        totalCents={cartTotal}
        onClose={() => setCheckoutOpen(false)}
        onSuccess={(result) => {
          setCheckoutOpen(false);
          clearCart();
          setSuccess(result);
        }}
      />

      {/* Success dialog */}
      <Dialog open={success !== null} onOpenChange={(open) => !open && setSuccess(null)}>
        <DialogContent className="bg-card max-w-lg">
          {success && (
            <div>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" /> Order placed
                </DialogTitle>
                <DialogDescription>
                  Your order is reserved and pending payment confirmation.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 rounded-lg border border-border p-4 bg-muted/40">
                <p className="text-sm text-muted-foreground">Order number</p>
                <p className="text-xl font-bold tracking-wide text-primary">
                  {success.orderNumber}
                </p>
                <p className="mt-2 text-sm">
                  Total due:{" "}
                  <span className="font-semibold">{formatMoney(success.totalCents)}</span>
                </p>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">How to pay</p>
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground bg-muted/40 rounded-lg p-4 border border-border">
                  {success.paymentInstructions}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function Header({ cartCount, onCart }: { cartCount: number; onCart: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <a
          href="#/"
          className="flex items-center gap-2 font-bold tracking-tight text-lg"
          aria-label="PlayBeat home"
        >
          <span className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <AudioWaveform className="h-5 w-5" />
          </span>
          PlayBeat
        </a>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          <a href="#catalog" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-accent transition-colors">
            Browse
          </a>
          <a
            href="#/admin"
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-accent transition-colors"
          >
            Admin
          </a>
          <Button
            variant="outline"
            size="sm"
            className="relative gap-2"
            onClick={onCart}
            aria-label={`Open cart with ${cartCount} items`}
          >
            <ShoppingBag className="h-4 w-4" />
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Button>
        </nav>
      </div>
    </header>
  );
}

function BeatCard({
  product,
  playing,
  onPlay,
  onDetails,
  onAddLease,
}: {
  product: Product;
  playing: boolean;
  onPlay: () => void;
  onDetails: () => void;
  onAddLease: () => void;
}) {
  return (
    <article className="group rounded-xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/40 transition-colors">
      <div
        className="relative aspect-square cursor-pointer overflow-hidden"
        onClick={onPlay}
        role="button"
        aria-label={`Play preview of ${product.title}`}
      >
        {product.coverUrl ? (
          <img
            src={product.coverUrl}
            alt={`${product.title} cover art`}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Music2 className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
            {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
          </span>
        </div>
        {product.featured && (
          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
            Featured
          </Badge>
        )}
      </div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-semibold leading-tight">{product.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">by {product.producer}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {product.genre && <Badge variant="secondary">{product.genre}</Badge>}
          {product.bpm ? <Badge variant="secondary">{product.bpm} BPM</Badge> : null}
          {product.musicalKey && <Badge variant="secondary">{product.musicalKey}</Badge>}
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div>
            <p className="text-[11px] text-muted-foreground leading-none mb-1">
              Lease / Exclusive
            </p>
            <p className="font-semibold text-sm">
              {formatMoney(product.priceLeaseCents)}
              <span className="text-muted-foreground font-normal"> / </span>
              {formatMoney(product.priceExclusiveCents)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onDetails}>
              Details
            </Button>
            <Button size="sm" onClick={onAddLease}>
              Add lease
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function LicensePicker({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (item: CartItem) => void;
}) {
  const [license, setLicense] = useState<"lease" | "exclusive">("lease");
  const price = license === "lease" ? product.priceLeaseCents : product.priceExclusiveCents;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setLicense("lease")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            license === "lease"
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/40"
          }`}
        >
          <p className="font-semibold text-sm">Lease license</p>
          <p className="text-lg font-bold text-primary">{formatMoney(product.priceLeaseCents)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            For streaming & demo releases, up to 100k streams
          </p>
        </button>
        <button
          type="button"
          onClick={() => setLicense("exclusive")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            license === "exclusive"
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/40"
          }`}
        >
          <p className="font-semibold text-sm">Exclusive rights</p>
          <p className="text-lg font-bold text-primary">
            {formatMoney(product.priceExclusiveCents)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Full ownership, beat removed from the store
          </p>
        </button>
      </div>
      <Button
        className="h-11"
        onClick={() =>
          onAdd({
            productId: product.id,
            slug: product.slug,
            title: product.title,
            coverUrl: product.coverUrl,
            licenseType: license,
            priceCents: price,
          })
        }
      >
        Add {license} license — {formatMoney(price)}
      </Button>
    </div>
  );
}

function CheckoutDialog({
  open,
  items,
  totalCents,
  onClose,
  onSuccess,
}: {
  open: boolean;
  items: CartItem[];
  totalCents: number;
  onClose: () => void;
  onSuccess: (result: CheckoutResult) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    setSubmitting(true);
    try {
      const result = await api<CheckoutResult>("/api/public/orders", {
        method: "POST",
        body: {
          customerName: name,
          customerEmail: email,
          notes: notes || null,
          items: items.map((i) => ({ productId: i.productId, licenseType: i.licenseType })),
        },
      });
      onSuccess(result);
      setName("");
      setEmail("");
      setNotes("");
    } catch (err) {
      toast({
        title: "Checkout failed",
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
          <DialogDescription>
            You pay after the order: we send instructions and an admin confirms your payment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4 mt-2">
          <div className="grid gap-2">
            <Label htmlFor="co-name">Full name</Label>
            <Input
              id="co-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              minLength={1}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="co-email">Email</Label>
            <Input
              id="co-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="co-notes">Notes (optional)</Label>
            <Textarea
              id="co-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything we should know? Social links, deadline, etc."
              rows={2}
            />
          </div>
          <div className="rounded-lg border border-border p-3 text-sm flex flex-col gap-1">
            {items.map((i) => (
              <div key={`${i.productId}-${i.licenseType}`} className="flex justify-between">
                <span className="truncate mr-2">
                  {i.title} <span className="text-muted-foreground">({i.licenseType})</span>
                </span>
                <span className="font-medium">{formatMoney(i.priceCents)}</span>
              </div>
            ))}
            <Separator className="my-1" />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatMoney(totalCents)}</span>
            </div>
          </div>
          <Button type="submit" className="h-11" disabled={submitting || items.length === 0}>
            {submitting ? "Placing order..." : "Place order"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PlayerBar() {
  const track = usePlayer((s) => s.track);

  if (!track) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur">
      <PlayerInner key={track.trackId} track={track} />
    </div>
  );
}

function PlayerInner({ track }: { track: { trackId: string; title: string; coverUrl: string | null; audioUrl: string | null } }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playing = usePlayer((s) => s.playing);
  const toggle = usePlayer((s) => s.toggle);
  const stop = usePlayer((s) => s.stop);
  const setPlaying = usePlayer((s) => s.setPlaying);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [playing, setPlaying]);

  return (
    <>
      <audio
        ref={audioRef}
        src={track.audioUrl ?? undefined}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const audio = e.currentTarget;
          if (audio.duration) setProgress(audio.currentTime / audio.duration);
        }}
        hidden
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
        {track.coverUrl ? (
          <img
            src={track.coverUrl}
            alt={`${track.title} cover`}
            className="h-11 w-11 rounded-md object-cover"
          />
        ) : (
          <div className="h-11 w-11 rounded-md bg-muted flex items-center justify-center">
            <Music2 className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 w-40 sm:w-56">
          <p className="text-sm font-medium truncate">{track.title}</p>
          <p className="text-xs text-muted-foreground">Preview</p>
        </div>
        <Button
          size="icon"
          className="rounded-full h-10 w-10 shrink-0"
          onClick={toggle}
          aria-label={playing ? "Pause preview" : "Play preview"}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </Button>
        <Slider
          value={[progress * 100]}
          max={100}
          step={0.5}
          onValueChange={(v) => {
            const audio = audioRef.current;
            if (audio && audio.duration) {
              audio.currentTime = (v[0] / 100) * audio.duration;
            }
            setProgress(v[0] / 100);
          }}
          className="flex-1"
          aria-label="Seek position"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={stop}
          aria-label="Close player"
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
            <AudioWaveform className="h-3.5 w-3.5" />
          </span>
          PlayBeat — premium beats, clear licenses.
        </p>
        <p>manage.playbeat.digital · All beats are pre-viewable before purchase.</p>
      </div>
    </footer>
  );
}
