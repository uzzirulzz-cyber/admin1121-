import React, { useEffect, useState } from 'react';
import { Download, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import type { CatalogProduct, ServiceItem, TvChannel, TvPlan } from '../types/admin';
import { api } from '../lib/api';

interface CatalogPageProps {
  onDataChanged: () => void;
  openCreateSignal: number;
}

type CatalogTab = 'products' | 'services' | 'channels' | 'plans';
const CATEGORIES = ['ALL', 'Games', 'Gift Cards', 'Subscriptions', 'TV Plans', 'Services'] as const;

export function CatalogPage({ onDataChanged, openCreateSignal }: CatalogPageProps) {
  const [activeTab, setActiveTab] = useState<CatalogTab>('products');
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [channels, setChannels] = useState<TvChannel[]>([]);
  const [plans, setPlans] = useState<TvPlan[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('ALL');
  const [stock, setStock] = useState<string>('ALL');
  const [notice, setNotice] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

  // Add / Edit product modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogProduct | null>(null);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<CatalogProduct['platform']>('PC / Steam');
  const [prodCategory, setProdCategory] = useState<CatalogProduct['category']>('Games');
  const [priceUsd, setPriceUsd] = useState('19.99');
  const [discountPct, setDiscountPct] = useState('0');
  const [stockStatus, setStockStatus] = useState<CatalogProduct['stockStatus']>('IN_STOCK');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Bulk JSON Inventory Import modal (for playbeat-inventory / Electronic First snapshots)
  const [importOpen, setImportOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState(
    '[\n  {\n    "sku": "PB-EF-GTA5",\n    "name": "Grand Theft Auto V Premium Edition (PC Key)",\n    "platform": "PC / Steam",\n    "category": "Games",\n    "priceUsd": 14.99,\n    "discountPct": 25,\n    "stockStatus": "IN_STOCK"\n  }\n]',
  );
  const [importing, setImporting] = useState(false);

  // Add Service / Channel / Plan inline forms
  const [srvCode, setSrvCode] = useState('');
  const [srvName, setSrvName] = useState('');
  const [srvTurnaround, setSrvTurnaround] = useState('20 mins');
  const [srvPrice, setSrvPrice] = useState('5.00');

  const [chName, setChName] = useState('');
  const [chCategory, setChCategory] = useState<TvChannel['category']>('Sports');
  const [chRegion, setChRegion] = useState<TvChannel['region']>('USA / NA');
  const [chDomain, setChDomain] = useState('playbeat.live');

  const [planSku, setPlanSku] = useState('');
  const [planName, setPlanName] = useState('');
  const [planMonths, setPlanMonths] = useState('6');
  const [planPrice, setPlanPrice] = useState('12.99');
  const [planDomains, setPlanDomains] = useState('playbeat.live');

  async function loadCatalog() {
    setLoading(true);
    try {
      const [prodRes, srvRes, chRes, planRes] = await Promise.all([
        api.catalog({
          q: search.trim() || undefined,
          category,
          stock,
          limit: 100,
        }),
        api.services(),
        api.tvChannels(),
        api.tvPlans(),
      ]);
      setProducts(prodRes.products);
      setTotalCount(prodRes.total);
      setServices(srvRes.services);
      setChannels(chRes.channels);
      setPlans(planRes.plans);
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load catalog.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCatalog();
    }, 150);
    return () => clearTimeout(timer);
  }, [search, category, stock]);

  useEffect(() => {
    if (openCreateSignal > 0) {
      setActiveTab('products');
      openNewModal();
    }
  }, [openCreateSignal]);

  function openNewModal() {
    setEditing(null);
    setSku('');
    setName('');
    setPlatform('PC / Steam');
    setProdCategory('Games');
    setPriceUsd('19.99');
    setDiscountPct('0');
    setStockStatus('IN_STOCK');
    setActive(true);
    setModalOpen(true);
  }

  function openEditModal(product: CatalogProduct) {
    setEditing(product);
    setSku(product.sku);
    setName(product.name);
    setPlatform(product.platform);
    setProdCategory(product.category);
    setPriceUsd(String(product.priceUsd));
    setDiscountPct(String(product.discountPct));
    setStockStatus(product.stockStatus);
    setActive(product.active);
    setModalOpen(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      if (editing) {
        const res = await api.updateProduct(editing.id, {
          name: name.trim(),
          priceUsd: Number(priceUsd),
          discountPct: Number(discountPct) || 0,
          stockStatus,
          active,
        });
        setProducts((prev) => prev.map((p) => (p.id === editing.id ? res.product : p)));
        setNotice({ type: 'info', text: `Updated ${res.product.sku}.` });
      } else {
        const res = await api.createProduct({
          sku: sku.trim().toUpperCase(),
          name: name.trim(),
          platform,
          category: prodCategory,
          priceUsd: Number(priceUsd),
          discountPct: Number(discountPct) || 0,
          stockStatus,
          active,
        });
        setProducts((prev) => [res.product, ...prev]);
        setTotalCount((c) => c + 1);
        setNotice({ type: 'info', text: `Added ${res.product.sku} to catalog.` });
      }
      setModalOpen(false);
      onDataChanged();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Save failed.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleImportJson(e: React.FormEvent) {
    e.preventDefault();
    setImporting(true);
    setNotice(null);
    try {
      const parsed = JSON.parse(importJsonText);
      const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.products) ? parsed.products : null;
      if (!items) {
        throw new Error('JSON must be an array of products or { "products": [...] }.');
      }
      const res = await api.importCatalogJson(items);
      setImportOpen(false);
      setNotice({
        type: 'info',
        text: `Inventory import complete: ${res.added} added, ${res.updated} updated (${res.total} total SKUs).`,
      });
      await loadCatalog();
      onDataChanged();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Invalid JSON import payload.',
      });
    } finally {
      setImporting(false);
    }
  }

  async function handleQuickToggleActive(product: CatalogProduct) {
    try {
      const res = await api.updateProduct(product.id, { active: !product.active });
      setProducts((prev) => prev.map((p) => (p.id === product.id ? res.product : p)));
      onDataChanged();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Update failed.',
      });
    }
  }

  async function handleDeleteProduct(product: CatalogProduct) {
    try {
      await api.deleteProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      setTotalCount((c) => Math.max(0, c - 1));
      setNotice({ type: 'info', text: `Removed ${product.sku} from catalog.` });
      onDataChanged();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Delete failed.',
      });
    }
  }

  async function handleCreateService(e: React.FormEvent) {
    e.preventDefault();
    if (!srvCode.trim() || !srvName.trim()) return;
    try {
      const res = await api.createService({
        code: srvCode.trim().toUpperCase(),
        name: srvName.trim(),
        turnaround: srvTurnaround.trim(),
        priceUsd: Number(srvPrice) || 0,
      });
      setServices((prev) => [res.service, ...prev]);
      setSrvCode('');
      setSrvName('');
      onDataChanged();
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Failed to add service.' });
    }
  }

  async function handleDeleteService(id: string) {
    await api.deleteService(id);
    setServices((prev) => prev.filter((s) => s.id !== id));
    onDataChanged();
  }

  async function handleCreateChannel(e: React.FormEvent) {
    e.preventDefault();
    if (!chName.trim()) return;
    try {
      const res = await api.createTvChannel({
        name: chName.trim(),
        category: chCategory,
        region: chRegion,
        domain: chDomain.trim(),
      });
      setChannels((prev) => [res.channel, ...prev]);
      setChName('');
      onDataChanged();
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Failed to add channel.' });
    }
  }

  async function handleCycleChannelStatus(ch: TvChannel) {
    const next: TvChannel['status'] =
      ch.status === 'ONLINE' ? 'DEGRADED' : ch.status === 'DEGRADED' ? 'OFFLINE' : 'ONLINE';
    const res = await api.updateTvChannel(ch.id, { status: next });
    setChannels((prev) => prev.map((c) => (c.id === ch.id ? res.channel : c)));
  }

  async function handleDeleteChannel(id: string) {
    await api.deleteTvChannel(id);
    setChannels((prev) => prev.filter((c) => c.id !== id));
    onDataChanged();
  }

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!planSku.trim() || !planName.trim()) return;
    try {
      const res = await api.createTvPlan({
        sku: planSku.trim().toUpperCase(),
        name: planName.trim(),
        durationMonths: Number(planMonths) || 3,
        priceUsd: Number(planPrice) || 0,
        domains: planDomains
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean),
      });
      setPlans((prev) => [res.plan, ...prev]);
      setPlanSku('');
      setPlanName('');
      onDataChanged();
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Failed to add TV plan.' });
    }
  }

  async function handleDeletePlan(id: string) {
    await api.deleteTvPlan(id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
    onDataChanged();
  }

  function handleExportCsv() {
    const header = ['SKU', 'Name', 'Platform', 'Category', 'Price USD', 'Price PKR', 'Discount %', 'Stock', 'Active'];
    const escapeCell = (v: string | number | boolean) => {
      const str = String(v);
      const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const rows = products.map((p) =>
      [p.sku, p.name, p.platform, p.category, p.priceUsd.toFixed(2), p.pricePkr, p.discountPct, p.stockStatus, p.active]
        .map(escapeCell)
        .join(','),
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `playbeat-catalog-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Storefront Catalog & Live TV
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage Products (<span className="font-mono text-xs">pb:catalog:v1</span>), Concierge Services, Live TV Channels, TV Plans, and <span className="font-mono text-xs">playbeat-inventory</span> JSON imports.
          </p>
        </div>
        {activeTab === 'products' && (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-lg hover:bg-zinc-50 dark:hover:bg-[#1a202c] whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-lg hover:bg-zinc-50 dark:hover:bg-[#1a202c] whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={openNewModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#161c24] font-semibold bg-[#f78109] hover:bg-[#fda92d] rounded-lg whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
          </div>
        )}
      </div>

      {/* Primary Catalog Sub-Tabs */}
      <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-zinc-100 dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-lg">
        {(
          [
            { id: 'products', label: `Products (${totalCount})` },
            { id: 'services', label: `Services (${services.length})` },
            { id: 'channels', label: `TV Channels (${channels.length})` },
            { id: 'plans', label: `TV Plans (${plans.length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white dark:bg-[#1a202c] text-zinc-950 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {notice && (
        <div
          role="status"
          className={`flex items-center justify-between gap-4 px-4 py-3 text-xs rounded-lg border ${
            notice.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
              : 'bg-zinc-100 dark:bg-[#212b36] border-zinc-200 dark:border-slate-700/60 text-zinc-800 dark:text-zinc-200'
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notice">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TAB 1: PRODUCTS */}
      {activeTab === 'products' && (
        <>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-zinc-100 dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-lg">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    category === cat
                      ? 'bg-white dark:bg-[#1a202c] text-zinc-950 dark:text-zinc-50 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                  }`}
                >
                  {cat === 'ALL' ? 'All Categories' : cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <select
                aria-label="Filter by stock status"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="px-3 py-2 text-xs bg-white dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-lg text-zinc-800 dark:text-zinc-200"
              >
                <option value="ALL">All Stock</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>

              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search SKU or product..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                />
              </div>
            </div>
          </div>

          <section className="bg-white dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-slate-700/60 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <th className="py-3 px-5">Product & SKU</th>
                    <th className="py-3 px-4">Platform / Source</th>
                    <th className="py-3 px-4 text-right">USD</th>
                    <th className="py-3 px-4 text-right">PKR</th>
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4">Storefront</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-slate-700/50 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-xs text-zinc-500">
                        Loading catalog...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-sm text-zinc-500">
                        No catalog products match your query.
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr
                        key={product.id}
                        className="hover:bg-zinc-50 dark:hover:bg-[#1a202c]/40 transition-colors"
                      >
                        <td className="py-3 px-5">
                          <p className="font-medium text-zinc-950 dark:text-zinc-50">
                            {product.name}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                            {product.sku}
                            {product.discountPct > 0 ? ` · -${product.discountPct}% off` : ''}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          {product.platform} · {product.source || 'Manual'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-medium text-zinc-950 dark:text-zinc-50 whitespace-nowrap">
                          ${product.priceUsd.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          {product.pricePkr.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium whitespace-nowrap">
                          <span
                            className={
                              product.stockStatus === 'IN_STOCK'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : product.stockStatus === 'LOW_STOCK'
                                  ? 'text-amber-700 dark:text-amber-400'
                                  : 'text-red-700 dark:text-red-400'
                            }
                          >
                            {product.stockStatus === 'IN_STOCK'
                              ? 'In Stock'
                              : product.stockStatus === 'LOW_STOCK'
                                ? 'Low Stock'
                                : 'Out of Stock'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleQuickToggleActive(product)}
                            className={`font-medium hover:underline ${
                              product.active
                                ? 'text-[#f78109] dark:text-[#fda92d]'
                                : 'text-zinc-400 dark:text-zinc-500'
                            }`}
                          >
                            {product.active ? 'Live' : 'Hidden'}
                          </button>
                        </td>
                        <td className="py-3 px-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(product)}
                              aria-label={`Edit ${product.name}`}
                              className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md hover:bg-zinc-100 dark:hover:bg-[#1a202c]"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(product)}
                              aria-label={`Delete ${product.name}`}
                              className="p-1.5 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-zinc-100 dark:hover:bg-[#1a202c]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* TAB 2: SERVICES */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <form
            onSubmit={handleCreateService}
            className="bg-white dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-5 gap-3"
          >
            <input
              type="text"
              required
              value={srvCode}
              onChange={(e) => setSrvCode(e.target.value)}
              placeholder="Code (e.g. SRV-STEAM)"
              className="px-3 py-2 text-xs font-mono bg-white dark:bg-[#161c24] border border-zinc-300 dark:border-slate-700/70 rounded-lg"
            />
            <input
              type="text"
              required
              value={srvName}
              onChange={(e) => setSrvName(e.target.value)}
              placeholder="Service name"
              className="sm:col-span-2 px-3 py-2 text-xs bg-white dark:bg-[#161c24] border border-zinc-300 dark:border-slate-700/70 rounded-lg"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={srvPrice}
              onChange={(e) => setSrvPrice(e.target.value)}
              placeholder="USD"
              className="px-3 py-2 text-xs font-mono bg-white dark:bg-[#161c24] border border-zinc-300 dark:border-slate-700/70 rounded-lg"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-[#161c24] font-semibold bg-[#f78109] hover:bg-[#fda92d] rounded-lg whitespace-nowrap"
            >
              Add Service
            </button>
          </form>

          <section className="bg-white dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-slate-700/60 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <th className="py-3 px-5">Code</th>
                    <th className="py-3 px-4">Service Name</th>
                    <th className="py-3 px-4">Turnaround</th>
                    <th className="py-3 px-4 text-right">USD</th>
                    <th className="py-3 px-4 text-right">PKR</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-slate-700/50 text-sm">
                  {services.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-[#1a202c]/40">
                      <td className="py-3 px-5 font-mono text-xs font-medium">{s.code}</td>
                      <td className="py-3 px-4 text-zinc-900 dark:text-zinc-100">{s.name}</td>
                      <td className="py-3 px-4 text-xs text-zinc-500">{s.turnaround}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                        ${s.priceUsd.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-zinc-500">
                        {s.pricePkr.toLocaleString()}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteService(s.id)}
                          aria-label={`Delete ${s.name}`}
                          className="p-1.5 text-zinc-500 hover:text-red-600 rounded-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: TV CHANNELS */}
      {activeTab === 'channels' && (
        <div className="space-y-4">
          <form
            onSubmit={handleCreateChannel}
            className="bg-white dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-5 gap-3"
          >
            <input
              type="text"
              required
              value={chName}
              onChange={(e) => setChName(e.target.value)}
              placeholder="Channel name"
              className="px-3 py-2 text-xs bg-white dark:bg-[#161c24] border border-zinc-300 dark:border-slate-700/70 rounded-lg"
            />
            <select
              value={chCategory}
              onChange={(e) => setChCategory(e.target.value as TvChannel['category'])}
              className="px-3 py-2 text-xs bg-white dark:bg-[#161c24] border border-zinc-300 dark:border-slate-700/70 rounded-lg"
            >
              <option value="Sports">Sports</option>
              <option value="News">News</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Regional">Regional</option>
            </select>
            <select
              value={chRegion}
              onChange={(e) => setChRegion(e.target.value as TvChannel['region'])}
              className="px-3 py-2 text-xs bg-white dark:bg-[#161c24] border border-zinc-300 dark:border-slate-700/70 rounded-lg"
            >
              <option value="USA / NA">USA / NA</option>
              <option value="South Asia">South Asia</option>
              <option value="Middle East">Middle East</option>
              <option value="Global">Global</option>
            </select>
            <input
              type="text"
              value={chDomain}
              onChange={(e) => setChDomain(e.target.value)}
              placeholder="Domain (e.g. playbeat.live)"
              className="px-3 py-2 text-xs font-mono bg-white dark:bg-[#161c24] border border-zinc-300 dark:border-slate-700/70 rounded-lg"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-[#161c24] font-semibold bg-[#f78109] hover:bg-[#fda92d] rounded-lg whitespace-nowrap"
            >
              Add Channel
            </button>
          </form>

          <section className="bg-white dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-slate-700/60 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <th className="py-3 px-5">Channel</th>
                    <th className="py-3 px-4">Category / Region</th>
                    <th className="py-3 px-4">Target Domain</th>
                    <th className="py-3 px-4">Stream Status</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-slate-700/50 text-sm">
                  {channels.map((ch) => (
                    <tr key={ch.id} className="hover:bg-zinc-50 dark:hover:bg-[#1a202c]/40">
                      <td className="py-3 px-5 font-medium text-zinc-950 dark:text-zinc-50">
                        {ch.name}
                      </td>
                      <td className="py-3 px-4 text-xs text-zinc-600 dark:text-zinc-400">
                        {ch.category} · {ch.region}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                        {ch.domain}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <button
                          type="button"
                          onClick={() => handleCycleChannelStatus(ch)}
                          className={`font-medium hover:underline ${
                            ch.status === 'ONLINE'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : ch.status === 'DEGRADED'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-red-700 dark:text-red-400'
                          }`}
                        >
                          {ch.status === 'ONLINE'
                            ? 'Online'
                            : ch.status === 'DEGRADED'
                              ? 'Degraded'
                              : 'Offline'}
                        </button>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteChannel(ch.id)}
                          aria-label={`Delete ${ch.name}`}
                          className="p-1.5 text-zinc-500 hover:text-red-600 rounded-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: TV PLANS */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <form
            onSubmit={handleCreatePlan}
            className="bg-white dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-6 gap-3"
          >
            <input
              type="text"
              required
              value={planSku}
              onChange={(e) => setPlanSku(e.target.value)}
              placeholder="SKU (PB-TV-ALL)"
              className="px-3 py-2 text-xs font-mono bg-white dark:bg-[#161c24] border border-zinc-300 dark:border-slate-700/70 rounded-lg"
            />
            <input
              type="text"
              required
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="Plan name"
              className="sm:col-span-2 px-3 py-2 text-xs bg-white dark:bg-[#161c24] border border-zinc-300 dark:border-slate-700/70 rounded-lg"
            />
            <input
              type="number"
              min="1"
              max="24"
              value={planMonths}
              onChange={(e) => setPlanMonths(e.target.value)}
              placeholder="Months"
              className="px-3 py-2 text-xs font-mono bg-white dark:bg-[#161c24] border border-zinc-300 dark:border-slate-700/70 rounded-lg"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={planPrice}
              onChange={(e) => setPlanPrice(e.target.value)}
              placeholder="USD"
              className="px-3 py-2 text-xs font-mono bg-white dark:bg-[#161c24] border border-zinc-300 dark:border-slate-700/70 rounded-lg"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-[#161c24] font-semibold bg-[#f78109] hover:bg-[#fda92d] rounded-lg whitespace-nowrap"
            >
              Add Plan
            </button>
          </form>

          <section className="bg-white dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-slate-700/60 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <th className="py-3 px-5">Plan & SKU</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Included Domains</th>
                    <th className="py-3 px-4 text-right">USD</th>
                    <th className="py-3 px-4 text-right">PKR</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-slate-700/50 text-sm">
                  {plans.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-[#1a202c]/40">
                      <td className="py-3 px-5">
                        <p className="font-medium text-zinc-950 dark:text-zinc-50">{p.name}</p>
                        <p className="text-xs font-mono text-zinc-500">{p.sku}</p>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono tabular-nums">
                        {p.durationMonths} mo
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                        {p.domains.join(' · ')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-medium">
                        ${p.priceUsd.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-zinc-500">
                        {p.pricePkr.toLocaleString()}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(p.id)}
                          aria-label={`Delete ${p.name}`}
                          className="p-1.5 text-zinc-500 hover:text-red-600 rounded-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Bulk JSON Inventory Import Modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60">
          <div className="w-full max-w-xl bg-white dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-200 dark:border-slate-700/60">
              <div>
                <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                  Import Inventory JSON (playbeat-inventory / KV Snapshot)
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Paste an array of products or a <span className="font-mono">pb:catalog:v1</span> export to upsert up to 500 SKUs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                aria-label="Close modal"
                className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleImportJson} className="p-6 space-y-4">
              <textarea
                rows={10}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                className="w-full p-3 text-xs font-mono bg-zinc-50 dark:bg-[#161c24] border border-zinc-300 dark:border-slate-700/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setImportOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-slate-700/70 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="px-4 py-2 text-xs font-medium text-[#161c24] font-semibold bg-[#f78109] hover:bg-[#fda92d] disabled:opacity-60 rounded-lg"
                >
                  {importing ? 'Importing...' : 'Upsert Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60">
          <div className="w-full max-w-lg bg-white dark:bg-[#212b36] border border-zinc-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-200 dark:border-slate-700/60">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                {editing ? `Edit ${editing.sku}` : 'Add Catalog Product'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    SKU *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editing)}
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="PB-STM-KEY01"
                    className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-[#161c24] border border-zinc-300 dark:border-slate-700/70 rounded-lg disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Price (USD) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={priceUsd}
                    onChange={(e) => setPriceUsd(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-[#161c24] border border-zinc-300 dark:border-slate-700/70 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Product title"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#161c24] border border-zinc-300 dark:border-slate-700/70 rounded-lg"
                  />
                </div>
                {!editing && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Platform
                      </label>
                      <select
                        value={platform}
                        onChange={(e) =>
                          setPlatform(e.target.value as CatalogProduct['platform'])
                        }
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-[#161c24] border border-zinc-300 dark:border-slate-700/70 rounded-lg"
                      >
                        <option value="PC / Steam">PC / Steam</option>
                        <option value="PlayStation">PlayStation</option>
                        <option value="Xbox">Xbox</option>
                        <option value="Nintendo">Nintendo</option>
                        <option value="Software">Software</option>
                        <option value="TV Plan">TV Plan</option>
                        <option value="Service">Service</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Category
                      </label>
                      <select
                        value={prodCategory}
                        onChange={(e) =>
                          setProdCategory(e.target.value as CatalogProduct['category'])
                        }
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-[#161c24] border border-zinc-300 dark:border-slate-700/70 rounded-lg"
                      >
                        <option value="Games">Games</option>
                        <option value="Gift Cards">Gift Cards</option>
                        <option value="Subscriptions">Subscriptions</option>
                        <option value="TV Plans">TV Plans</option>
                        <option value="Services">Services</option>
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Discount %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="95"
                    value={discountPct}
                    onChange={(e) => setDiscountPct(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-[#161c24] border border-zinc-300 dark:border-slate-700/70 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Stock Status
                  </label>
                  <select
                    value={stockStatus}
                    onChange={(e) =>
                      setStockStatus(e.target.value as CatalogProduct['stockStatus'])
                    }
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#161c24] border border-zinc-300 dark:border-slate-700/70 rounded-lg"
                  >
                    <option value="IN_STOCK">In Stock</option>
                    <option value="LOW_STOCK">Low Stock</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-slate-700/70"
                />
                <span>Visible on live storefront</span>
              </label>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-slate-700/70 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium text-[#161c24] font-semibold bg-[#f78109] hover:bg-[#fda92d] disabled:opacity-60 rounded-lg"
                >
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
