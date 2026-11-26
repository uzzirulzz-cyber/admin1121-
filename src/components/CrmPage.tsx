import React, { useEffect, useState } from 'react';
import { Plus, Search, Send, Trash2, X } from 'lucide-react';
import { CRM_STAGES, type CrmLead, type CrmStage } from '../types/admin';
import { api } from '../lib/api';

interface CrmPageProps {
  onDataChanged: () => void;
  openCreateSignal: number;
}

export function CrmPage({ onDataChanged, openCreateSignal }: CrmPageProps) {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<'ALL' | CrmStage>('ALL');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState<{ type: 'info' | 'error'; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // New lead form state
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [ctwaClid, setCtwaClid] = useState('');
  const [expectedValueUsd, setExpectedValueUsd] = useState('250');
  const [source, setSource] = useState<CrmLead['source']>('WhatsApp');
  const [status, setStatus] = useState<CrmStage>('Researched');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadLeads() {
    setLoading(true);
    try {
      const res = await api.crmLeads();
      setLeads(res.leads);
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load CRM leads.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    if (openCreateSignal > 0) setModalOpen(true);
  }, [openCreateSignal]);

  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName.trim()) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await api.createLead({
        businessName: businessName.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        ctwaClid: ctwaClid.trim() || undefined,
        expectedValueUsd: Number(expectedValueUsd) || 0,
        source,
        status,
        notes: notes.trim(),
      });
      setLeads((prev) => [res.lead, ...prev]);
      setModalOpen(false);
      setBusinessName('');
      setContactName('');
      setEmail('');
      setPhone('');
      setCtwaClid('');
      setExpectedValueUsd('250');
      setStatus('Researched');
      setNotes('');
      setNotice({
        type: 'info',
        text: `Added ${res.lead.leadId} (${res.lead.businessName}).${
          res.lead.metaLastMessage ? ` Meta WhatsApp: ${res.lead.metaLastMessage}` : ''
        }`,
      });
      onDataChanged();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create lead.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleStageChange(leadId: string, nextStage: CrmStage) {
    setBusyId(leadId);
    setNotice(null);
    try {
      const res = await api.updateLead(leadId, { status: nextStage });
      setLeads((prev) => prev.map((l) => (l.leadId === leadId ? res.lead : l)));
      if (res.metaDispatch && !res.metaDispatch.skipped) {
        setNotice({
          type: res.metaDispatch.ok ? 'info' : 'error',
          text: `${leadId} moved to ${nextStage} · Meta WhatsApp (${res.lead.metaLastEvent}): ${res.metaDispatch.message}`,
        });
      } else {
        setNotice({ type: 'info', text: `${leadId} updated to ${nextStage}.` });
      }
      onDataChanged();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Stage update failed.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleResendMeta(leadId: string) {
    setBusyId(leadId);
    setNotice(null);
    try {
      const res = await api.resendLeadMeta(leadId);
      setLeads((prev) => prev.map((l) => (l.leadId === leadId ? res.lead : l)));
      setNotice({
        type: res.metaDispatch.ok ? 'info' : 'error',
        text: `Meta dispatch (${leadId}): ${res.metaDispatch.message}`,
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Meta re-send failed.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleResendTikTok(leadId: string) {
    setBusyId(leadId);
    setNotice(null);
    try {
      const res = await api.resendLeadTikTok(leadId);
      setLeads((prev) => prev.map((l) => (l.leadId === leadId ? res.lead : l)));
      setNotice({
        type: res.tiktokDispatch.ok ? 'info' : 'error',
        text: `TikTok dispatch (${leadId}): ${res.tiktokDispatch.detail}`,
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'TikTok re-send failed.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(leadId: string) {
    setBusyId(leadId);
    setNotice(null);
    try {
      await api.deleteLead(leadId);
      setLeads((prev) => prev.filter((l) => l.leadId !== leadId));
      setNotice({ type: 'info', text: `Deleted lead ${leadId}.` });
      onDataChanged();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Delete failed.',
      });
    } finally {
      setBusyId(null);
    }
  }

  const filtered = leads.filter((l) => {
    if (stageFilter !== 'ALL' && l.status !== stageFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = `${l.leadId} ${l.businessName} ${l.contactName} ${l.email} ${l.phone}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const stageCounts = CRM_STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            CRM & WhatsApp Event Sharing
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Moving a lead to <strong className="text-zinc-900 dark:text-zinc-200">Qualified</strong> dispatches a Meta WhatsApp <span className="font-mono text-xs">Lead</span> event; <strong className="text-zinc-900 dark:text-zinc-200">Won</strong> dispatches <span className="font-mono text-xs">Purchase</span> with USD value (SHA-256 hashed PII).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs paper-btn-primary rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Lead</span>
        </button>
      </div>

      {notice && (
        <div
          role="status"
          className={`flex items-center justify-between gap-4 px-4 py-3 text-xs rounded-lg border ${
            notice.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
              : 'bg-zinc-100 dark:bg-[#0d182e] border-zinc-200 dark:border-slate-700/60 text-zinc-800 dark:text-zinc-200'
          }`}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notice"
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-zinc-100 dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-lg">
          <button
            type="button"
            onClick={() => setStageFilter('ALL')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              stageFilter === 'ALL'
                ? 'bg-white dark:bg-[#081226] text-zinc-950 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
            }`}
          >
            All ({leads.length})
          </button>
          {CRM_STAGES.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => setStageFilter(stage)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                stageFilter === stage
                  ? 'bg-white dark:bg-[#081226] text-zinc-950 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
              }`}
            >
              {stage} ({stageCounts[stage] || 0})
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search business, email, phone..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
          />
        </div>
      </div>

      {/* Leads Table */}
      <section className="bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-slate-700/60 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <th className="py-3 px-5">Lead</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Stage (Meta Trigger)</th>
                <th className="py-3 px-4 text-right">Est. Value</th>
                <th className="py-3 px-4">Meta WhatsApp Sync</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-slate-700/50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-zinc-500">
                    Loading CRM leads...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    No leads match the current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => {
                  const isTriggerStage = lead.status === 'Qualified' || lead.status === 'Won';
                  return (
                    <tr
                      key={lead.leadId}
                      className="hover:bg-zinc-50 dark:hover:bg-[#132240]/40 transition-colors align-top"
                    >
                      <td className="py-3.5 px-5">
                        <p className="font-medium text-zinc-950 dark:text-zinc-50">
                          {lead.businessName}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="font-mono">{lead.leadId}</span> · {lead.source}
                          {lead.ctwaClid ? ` · CTWA Linked` : ''}
                        </p>
                        {lead.notes && (
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-xs line-clamp-2">
                            {lead.notes}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <p className="font-medium text-zinc-800 dark:text-zinc-200">
                          {lead.contactName}
                        </p>
                        <p className="text-zinc-500 dark:text-zinc-400">{lead.email || '—'}</p>
                        <p className="font-mono text-zinc-500 dark:text-zinc-400">
                          {lead.phone || '—'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          aria-label={`Stage for ${lead.businessName}`}
                          value={lead.status}
                          disabled={busyId === lead.leadId}
                          onChange={(e) =>
                            handleStageChange(lead.leadId, e.target.value as CrmStage)
                          }
                          className="px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-[#060e20] border border-zinc-300 dark:border-slate-700/70 rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                        >
                          {CRM_STAGES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                              {s === 'Qualified' ? ' (→ Lead)' : s === 'Won' ? ' (→ Purchase)' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        ${lead.expectedValueUsd.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {lead.metaSyncStatus === 'sent' ? (
                          <span className="font-medium text-emerald-700 dark:text-emerald-400">
                            Sent · {lead.metaLastEvent}
                          </span>
                        ) : lead.metaSyncStatus === 'failed' ? (
                          <span className="font-medium text-red-700 dark:text-red-400">
                            Failed · {lead.metaLastEvent}
                          </span>
                        ) : lead.metaSyncStatus === 'not_configured' ? (
                          <span className="font-medium text-amber-700 dark:text-amber-400">
                            Pending Secret · {lead.metaLastEvent}
                          </span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500">No trigger stage</span>
                        )}
                        {lead.metaLastMessage && (
                          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 max-w-[220px]">
                            {lead.metaLastMessage}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={!isTriggerStage || busyId === lead.leadId}
                            onClick={() => handleResendMeta(lead.leadId)}
                            title={
                              isTriggerStage
                                ? 'Re-send conversion event to Meta WhatsApp Dataset'
                                : 'Move to Qualified or Won to send Meta event'
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-slate-700/70 rounded-md hover:bg-zinc-50 dark:hover:bg-[#132240] disabled:opacity-40 whitespace-nowrap"
                          >
                            <Send className="w-3 h-3" />
                            <span>Meta</span>
                          </button>
                          <button
                            type="button"
                            disabled={busyId === lead.leadId}
                            onClick={() => handleResendTikTok(lead.leadId)}
                            title="Re-send lead event to TikTok Events API"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-slate-700/70 rounded-md hover:bg-zinc-50 dark:hover:bg-[#132240] disabled:opacity-40 whitespace-nowrap"
                          >
                            <Send className="w-3 h-3" />
                            <span>TikTok</span>
                          </button>
                          <button
                            type="button"
                            disabled={busyId === lead.leadId}
                            onClick={() => handleDelete(lead.leadId)}
                            aria-label={`Delete ${lead.businessName}`}
                            className="p-1.5 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-zinc-100 dark:hover:bg-[#132240]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add Lead Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60">
          <div className="w-full max-w-lg bg-white dark:bg-[#0d182e] border border-zinc-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-200 dark:border-slate-700/60">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                Add CRM Lead
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
            <form onSubmit={handleCreateLead} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Business / Account Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Rawalpindi Gaming Hub"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#060e20] border border-zinc-300 dark:border-slate-700/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#060e20] border border-zinc-300 dark:border-slate-700/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Expected Value (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={expectedValueUsd}
                    onChange={(e) => setExpectedValueUsd(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-[#060e20] border border-zinc-300 dark:border-slate-700/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Email (hashed for Meta)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="buyer@example.com"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#060e20] border border-zinc-300 dark:border-slate-700/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Phone w/ Country Code
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+923001234567"
                    className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-[#060e20] border border-zinc-300 dark:border-slate-700/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Source
                  </label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value as CrmLead['source'])}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#060e20] border border-zinc-300 dark:border-slate-700/70 rounded-lg"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Storefront">Storefront</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Referral">Referral</option>
                    <option value="Direct">Direct</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Initial Stage
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CrmStage)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#060e20] border border-zinc-300 dark:border-slate-700/70 rounded-lg"
                  >
                    {CRM_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Click-to-WhatsApp CLID (optional)
                  </label>
                  <input
                    type="text"
                    value={ctwaClid}
                    onChange={(e) => setCtwaClid(e.target.value)}
                    placeholder="ctwa_clid from Click-to-WhatsApp ad"
                    className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-[#060e20] border border-zinc-300 dark:border-slate-700/70 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Product interest, volume, follow-up timeline..."
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#060e20] border border-zinc-300 dark:border-slate-700/70 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-slate-700/70 rounded-lg hover:bg-zinc-50 dark:hover:bg-[#132240]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs paper-btn-primary disabled:opacity-60 rounded-lg"
                >
                  {saving ? 'Saving...' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
