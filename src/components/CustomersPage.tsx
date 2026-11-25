import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Edit3,
  KeyRound,
  Plus,
  ShieldOff,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import type { AllowlistEntry, CustomerAccount } from '../types/admin';
import { api } from '../lib/api';

interface CustomersPageProps {
  onDataChanged: () => void;
}

export function CustomersPage({ onDataChanged }: CustomersPageProps) {
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [allowlist, setAllowlist] = useState<AllowlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<AllowlistEntry['role']>('Admin');
  const [savingEmail, setSavingEmail] = useState(false);

  // Open new account form state
  const [showCreate, setShowCreate] = useState(false);
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custPassword, setCustPassword] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // Edit & Delete customer state
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editProvider, setEditProvider] = useState<'Email' | 'Google'>('Email');
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDeleteUid, setConfirmDeleteUid] = useState<string | null>(null);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  // Issued reset code banner
  const [issuedCode, setIssuedCode] = useState<{ email: string; code: string } | null>(null);
  const [copiedReset, setCopiedReset] = useState(false);

  const [notice, setNotice] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [custRes, allowRes] = await Promise.all([api.customers(), api.allowlist()]);
      setCustomers(custRes.customers);
      setAllowlist(allowRes.allowlist);
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load customer accounts.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    setCreatingCustomer(true);
    try {
      const res = await api.adminCreateCustomer({
        displayName: custName.trim(),
        email: custEmail.trim(),
        phone: custPhone.trim() || undefined,
        password: custPassword || undefined,
      });
      setCustomers((prev) => [res.customer, ...prev]);
      setCustName('');
      setCustEmail('');
      setCustPhone('');
      setCustPassword('');
      setShowCreate(false);
      setNotice({
        type: 'info',
        text: `Opened account ${res.customer.uid} for ${res.customer.email}.`,
      });
      onDataChanged();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not open customer account.',
      });
    } finally {
      setCreatingCustomer(false);
    }
  }

  function startEdit(c: CustomerAccount) {
    setEditingUid(c.uid);
    setEditName(c.displayName);
    setEditEmail(c.email);
    setEditPhone(c.phone || '');
    setEditProvider(c.provider);
    setConfirmDeleteUid(null);
  }

  async function handleSaveEdit(uid: string) {
    setSavingEdit(true);
    setNotice(null);
    try {
      const res = await api.adminUpdateCustomer(uid, {
        displayName: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        provider: editProvider,
      });
      setCustomers((prev) => prev.map((c) => (c.uid === uid ? res.customer : c)));
      setEditingUid(null);
      setNotice({ type: 'info', text: `Updated customer account ${res.customer.email}.` });
      onDataChanged();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to update customer account.',
      });
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteCustomer(uid: string) {
    setDeletingUid(uid);
    setNotice(null);
    try {
      await api.adminDeleteCustomer(uid);
      setCustomers((prev) => prev.filter((c) => c.uid !== uid));
      setConfirmDeleteUid(null);
      setNotice({ type: 'info', text: `Deleted customer account ${uid}.` });
      onDataChanged();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to delete customer account.',
      });
    } finally {
      setDeletingUid(null);
    }
  }

  async function handleIssueResetCode(customer: CustomerAccount) {
    setNotice(null);
    setIssuedCode(null);
    try {
      const res = await api.adminResetCustomerPassword(customer.uid, { mode: 'code' });
      if (res.resetCode) {
        setIssuedCode({ email: customer.email, code: res.resetCode });
      }
      setNotice({ type: 'info', text: res.message });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to generate reset code.',
      });
    }
  }

  async function handleRevokeSessions(uid: string) {
    setNotice(null);
    try {
      const res = await api.revokeCustomerSessions(uid);
      setCustomers((prev) => prev.map((c) => (c.uid === uid ? res.customer : c)));
      setNotice({ type: 'info', text: `Revoked active sessions for ${res.customer.email}.` });
      onDataChanged();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Session revocation failed.',
      });
    }
  }

  async function handleAddAllowlist(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setSavingEmail(true);
    setNotice(null);
    try {
      const res = await api.addAllowlist(newEmail.trim(), newRole);
      setAllowlist((prev) => [...prev, res.entry]);
      setNewEmail('');
      setNotice({ type: 'info', text: `Added ${res.entry.email} to admin allow-list.` });
      onDataChanged();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not add email.',
      });
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleRemoveAllowlist(email: string) {
    setNotice(null);
    try {
      await api.removeAllowlist(email);
      setAllowlist((prev) => prev.filter((a) => a.email !== email));
      setNotice({ type: 'info', text: `Removed ${email} from admin allow-list.` });
      onDataChanged();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not remove email.',
      });
    }
  }

  const inputClass =
    'px-3 py-2 text-sm bg-white dark:bg-[#0b1437] border border-[#dee2e6] dark:border-[#243266] rounded-lg text-[#344767] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#5e72e4]/30 focus:border-[#5e72e4]';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#344767] dark:text-white">
            Customer Accounts & Admin Access
          </h1>
          <p className="mt-1 text-sm text-[#67748e] dark:text-slate-400">
            Storefront <span className="font-mono text-xs">/account</span> profiles, KV session indexes (<span className="font-mono text-xs">pb:auth:u:&lt;uid&gt;</span>), account CRUD, password resets, and the Firebase admin allow-list.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#5e72e4] hover:bg-[#4e62d4] rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{showCreate ? 'Close Form' : 'Open Account'}</span>
        </button>
      </div>

      {notice && (
        <div
          role="status"
          className={`flex items-center justify-between gap-4 px-4 py-3 text-xs font-medium rounded-xl border ${
            notice.type === 'error'
              ? 'bg-[#fff5f6] dark:bg-[#2a1220] border-[#f5365c]/40 text-[#c92a49] dark:text-[#ff7591]'
              : 'bg-white dark:bg-[#111c44] border-[#5e72e4]/30 text-[#344767] dark:text-slate-100'
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notice">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {issuedCode && (
        <div className="argon-card px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs">
            <p className="text-[#67748e] dark:text-slate-400">
              One-time 30-min reset code for{' '}
              <span className="font-semibold text-[#344767] dark:text-white">
                {issuedCode.email}
              </span>
            </p>
            <p className="mt-0.5 font-mono text-sm font-bold text-[#5e72e4]">
              {issuedCode.code}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(issuedCode.code);
                setCopiedReset(true);
                setTimeout(() => setCopiedReset(false), 1800);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#344767] dark:text-slate-200 border border-[#dee2e6] dark:border-[#243266] rounded-lg hover:bg-[#f6f9fc] dark:hover:bg-[#182450] whitespace-nowrap"
            >
              {copiedReset ? (
                <Check className="w-3.5 h-3.5 text-[#2dce89]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedReset ? 'Copied' : 'Copy Code'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIssuedCode(null)}
              aria-label="Dismiss code"
              className="p-1.5 text-[#8392ab] hover:text-[#344767] dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <section className="argon-card p-6 space-y-4">
          <h2 className="text-base font-bold text-[#344767] dark:text-white">
            Open New Customer Account
          </h2>
          <form
            onSubmit={handleCreateCustomer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5"
          >
            <input
              type="text"
              required
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              placeholder="Full name"
              className={inputClass}
            />
            <input
              type="email"
              required
              value={custEmail}
              onChange={(e) => setCustEmail(e.target.value)}
              placeholder="customer@example.com"
              className={inputClass}
            />
            <input
              type="tel"
              value={custPhone}
              onChange={(e) => setCustPhone(e.target.value)}
              placeholder="Phone (optional)"
              className={inputClass}
            />
            <input
              type="password"
              value={custPassword}
              onChange={(e) => setCustPassword(e.target.value)}
              placeholder="Initial password (min 8, opt)"
              className={inputClass}
            />
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-3.5 py-2 text-xs font-semibold text-[#67748e] dark:text-slate-300 border border-[#dee2e6] dark:border-[#243266] rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingCustomer}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#5e72e4] hover:bg-[#4e62d4] disabled:opacity-60 rounded-lg whitespace-nowrap"
              >
                {creatingCustomer ? 'Opening...' : 'Create Customer Account'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Customer Accounts Table */}
      <section className="argon-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e9ecef] dark:border-[#1e2952]">
          <h2 className="text-base font-bold text-[#344767] dark:text-white">
            Storefront Customer Accounts
          </h2>
          <p className="text-xs text-[#67748e] dark:text-slate-400">
            Accounts attached via signup-to-checkout bridge on playbeat.digital — edit, reset password, revoke sessions, or delete.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e9ecef] dark:border-[#1e2952] bg-[#f6f9fc] dark:bg-[#0e1738] text-[11px] font-bold uppercase tracking-wider text-[#8392ab]">
                <th className="py-3 px-6">Customer & UID</th>
                <th className="py-3 px-4">Provider / Member Since</th>
                <th className="py-3 px-4 text-right">Orders & Spend</th>
                <th className="py-3 px-4 text-right">Sessions</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9ecef] dark:divide-[#1e2952] text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-[#8392ab]">
                    Loading customer accounts...
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const isEditing = editingUid === c.uid;
                  const isDeleting = confirmDeleteUid === c.uid;
                  return (
                    <tr
                      key={c.uid}
                      className="hover:bg-[#f8f9fe] dark:hover:bg-[#182450]/40 transition-colors"
                    >
                      <td className="py-3.5 px-6">
                        {isEditing ? (
                          <div className="space-y-2 max-w-xs">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className={`w-full ${inputClass}`}
                            />
                            <input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              className={`w-full ${inputClass}`}
                            />
                            <input
                              type="tel"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              placeholder="Phone"
                              className={`w-full ${inputClass}`}
                            />
                          </div>
                        ) : (
                          <>
                            <p className="font-semibold text-[#344767] dark:text-white">
                              {c.displayName}
                            </p>
                            <p className="mt-0.5 text-xs text-[#8392ab]">
                              {c.email} · <span className="font-mono">{c.uid}</span>
                            </p>
                          </>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#67748e] dark:text-slate-400 whitespace-nowrap">
                        {isEditing ? (
                          <select
                            value={editProvider}
                            onChange={(e) =>
                              setEditProvider(e.target.value as 'Email' | 'Google')
                            }
                            className={inputClass}
                          >
                            <option value="Email">Email</option>
                            <option value="Google">Google</option>
                          </select>
                        ) : (
                          <>
                            {c.provider} · Joined <span className="font-mono">{c.memberSince}</span>
                          </>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs whitespace-nowrap">
                        {c.ordersCount} · ${c.totalSpentUsd.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs whitespace-nowrap">
                        <span
                          className={
                            c.activeSessions > 0
                              ? 'text-[#2dce89] font-semibold'
                              : 'text-[#8392ab]'
                          }
                        >
                          {c.activeSessions} device{c.activeSessions === 1 ? '' : 's'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={savingEdit}
                              onClick={() => handleSaveEdit(c.uid)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#2dce89] hover:bg-[#26b578] rounded-lg whitespace-nowrap"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingUid(null)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-[#67748e] border border-[#dee2e6] dark:border-[#243266] rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEdit(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#5e72e4] border border-[#e9ecef] dark:border-[#243266] rounded-lg hover:bg-[#f6f9fc] dark:hover:bg-[#182450] whitespace-nowrap"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleIssueResetCode(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#344767] dark:text-slate-200 border border-[#e9ecef] dark:border-[#243266] rounded-lg hover:bg-[#f6f9fc] dark:hover:bg-[#182450] whitespace-nowrap"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Reset</span>
                            </button>
                            <button
                              type="button"
                              disabled={c.activeSessions === 0}
                              onClick={() => handleRevokeSessions(c.uid)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#67748e] border border-[#e9ecef] dark:border-[#243266] rounded-lg hover:bg-[#f6f9fc] dark:hover:bg-[#182450] disabled:opacity-40 whitespace-nowrap"
                            >
                              <ShieldOff className="w-3.5 h-3.5" />
                              <span>Revoke</span>
                            </button>
                            {isDeleting ? (
                              <>
                                <button
                                  type="button"
                                  disabled={deletingUid === c.uid}
                                  onClick={() => handleDeleteCustomer(c.uid)}
                                  className="px-2.5 py-1.5 text-xs font-semibold text-white bg-[#f5365c] hover:bg-[#e1274c] rounded-lg whitespace-nowrap"
                                >
                                  {deletingUid === c.uid ? 'Deleting...' : 'Confirm'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteUid(null)}
                                  className="px-2 py-1.5 text-xs font-semibold text-[#67748e] border border-[#dee2e6] dark:border-[#243266] rounded-lg"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteUid(c.uid)}
                                aria-label={`Delete ${c.email}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#f5365c] border border-[#f5365c]/30 rounded-lg hover:bg-[#fff5f6] dark:hover:bg-[#2a1220] whitespace-nowrap"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Firebase Admin Allow-List */}
      <section className="argon-card p-6 space-y-5">
        <div>
          <h2 className="text-base font-bold text-[#344767] dark:text-white">
            Firebase Admin Allow-List
          </h2>
          <p className="mt-0.5 text-xs text-[#67748e] dark:text-slate-400">
            Authorized operator emails permitted to use passwordless Google sign-in bridge into{' '}
            <span className="font-mono">admin.playbeat.digital</span>.
          </p>
        </div>

        <form onSubmit={handleAddAllowlist} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="operator@playbeat.digital"
            className={`flex-1 ${inputClass}`}
          />
          <select
            aria-label="Operator role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as AllowlistEntry['role'])}
            className={inputClass}
          >
            <option value="Owner">Owner</option>
            <option value="Admin">Admin</option>
            <option value="Operator">Operator</option>
          </select>
          <button
            type="submit"
            disabled={savingEmail}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#5e72e4] hover:bg-[#4e62d4] disabled:opacity-60 rounded-lg shadow-xs whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{savingEmail ? 'Adding...' : 'Add Admin Email'}</span>
          </button>
        </form>

        <div className="divide-y divide-[#e9ecef] dark:divide-[#1e2952] border-t border-[#e9ecef] dark:border-[#1e2952]">
          {allowlist.map((entry) => (
            <div
              key={entry.email}
              className="py-3 flex items-center justify-between gap-4 text-sm"
            >
              <div>
                <p className="font-semibold text-[#344767] dark:text-white font-mono text-xs">
                  {entry.email}
                </p>
                <p className="text-xs text-[#8392ab]">
                  {entry.role} · Added {entry.addedAt.slice(0, 10)}
                </p>
              </div>
              <button
                type="button"
                disabled={allowlist.length <= 1}
                onClick={() => handleRemoveAllowlist(entry.email)}
                aria-label={`Remove ${entry.email}`}
                className="p-1.5 text-[#8392ab] hover:text-[#f5365c] disabled:opacity-30 rounded-lg hover:bg-[#fff5f6] dark:hover:bg-[#2a1220]"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
