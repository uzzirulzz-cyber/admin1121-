import React, { useEffect, useRef, useState } from 'react';
import {
  Briefcase,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  Globe,
  ImagePlus,
  KeyRound,
  Link2,
  MapPin,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Shield,
  ShieldOff,
  Sliders,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type {
  CustomerAccount,
  OrderRecord,
  ProfileCoverTheme,
  ProfileCustomField,
  ProfileSocialLink,
  SessionInfo,
  UserProfile,
} from '../types/admin';
import { api } from '../lib/api';
import { ARGON_COVER_THEMES, getInitials } from './AdminShell';

interface ProfileAccountPageProps {
  profile: UserProfile | null;
  onProfileUpdated: (profile: UserProfile) => void;
  onDataChanged?: () => void;
}

type ProfileTab = 'profile' | 'fields' | 'security' | 'accounts';

const DEFAULT_AVATAR_PATH = '/src/assets/images/admin_avatar_1795614396198.jpg';
const ARGON_COVER_IMAGE = '/src/assets/images/argon_profile_cover_1795618213225.jpg';

const FIELD_CATEGORIES: Array<ProfileCustomField['category']> = [
  'Operations',
  'Billing',
  'Contact',
  'Other',
];

function isValidExternalHref(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function ProfileAccountPage({
  profile,
  onProfileUpdated,
  onDataChanged,
}: ProfileAccountPageProps) {
  const isAdmin = profile?.role === 'admin';
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');

  // Core editable profile fields
  const [username, setUsername] = useState(profile?.username || '');
  const [firstName, setFirstName] = useState(profile?.firstName || '');
  const [lastName, setLastName] = useState(profile?.lastName || '');
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [title, setTitle] = useState(profile?.title || '');
  const [department, setDepartment] = useState(profile?.department || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [city, setCity] = useState(profile?.city || '');
  const [country, setCountry] = useState(profile?.country || '');
  const [postalCode, setPostalCode] = useState(profile?.postalCode || '');
  const [website, setWebsite] = useState(profile?.website || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  const [coverTheme, setCoverTheme] = useState<ProfileCoverTheme>(
    profile?.coverTheme || 'argon-blue',
  );
  const [brandTitle, setBrandTitle] = useState(profile?.brandTitle || 'PlayBeat Admin');
  const [avatarPreviewError, setAvatarPreviewError] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [confirmResetProfile, setConfirmResetProfile] = useState(false);
  const [resettingProfile, setResettingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Custom fields CRUD state
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [newFieldCategory, setNewFieldCategory] =
    useState<ProfileCustomField['category']>('Operations');
  const [addingField, setAddingField] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editFieldLabel, setEditFieldLabel] = useState('');
  const [editFieldValue, setEditFieldValue] = useState('');
  const [editFieldCategory, setEditFieldCategory] =
    useState<ProfileCustomField['category']>('Operations');

  // Social links CRUD state
  const [newLinkPlatform, setNewLinkPlatform] = useState('');
  const [newLinkHandle, setNewLinkHandle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editLinkPlatform, setEditLinkPlatform] = useState('');
  const [editLinkHandle, setEditLinkHandle] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');

  // Skills CRUD state
  const [newSkill, setNewSkill] = useState('');
  const [addingSkill, setAddingSkill] = useState(false);

  // Change own password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Sessions & customer orders
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [myOrders, setMyOrders] = useState<OrderRecord[]>([]);

  // Admin: Open account + Manage customers (Edit, Reset Password, Delete)
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [openName, setOpenName] = useState('');
  const [openEmail, setOpenEmail] = useState('');
  const [openPhone, setOpenPhone] = useState('');
  const [openProvider, setOpenProvider] = useState<'Email' | 'Google'>('Email');
  const [openPassword, setOpenPassword] = useState('');
  const [openingAccount, setOpeningAccount] = useState(false);

  const [editingCustomerUid, setEditingCustomerUid] = useState<string | null>(null);
  const [editCustName, setEditCustName] = useState('');
  const [editCustEmail, setEditCustEmail] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustProvider, setEditCustProvider] = useState<'Email' | 'Google'>('Email');
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [directResetUid, setDirectResetUid] = useState<string | null>(null);
  const [directResetPassword, setDirectResetPassword] = useState('');
  const [issuedCode, setIssuedCode] = useState<{
    email: string;
    code: string;
    expiresAt?: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const [confirmDeleteUid, setConfirmDeleteUid] = useState<string | null>(null);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  const [notice, setNotice] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

  // Sync local form state when profile loads or resets
  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username || '');
    setFirstName(profile.firstName || '');
    setLastName(profile.lastName || '');
    setDisplayName(profile.displayName || '');
    setEmail(profile.email || '');
    setPhone(profile.phone || '');
    setTitle(profile.title || '');
    setDepartment(profile.department || '');
    setAddress(profile.address || '');
    setCity(profile.city || '');
    setCountry(profile.country || '');
    setPostalCode(profile.postalCode || '');
    setWebsite(profile.website || '');
    setBio(profile.bio || '');
    setAvatarUrl(profile.avatarUrl || '');
    setCoverTheme(profile.coverTheme || 'argon-blue');
    setBrandTitle(profile.brandTitle || 'PlayBeat Admin');
    setAvatarPreviewError(false);
  }, [profile]);

  async function loadAccountData() {
    try {
      const sessRes = await api.accountSessions();
      setSessions(sessRes.sessions);
      if (isAdmin) {
        const custRes = await api.customers();
        setCustomers(custRes.customers);
      } else {
        const ordRes = await api.accountOrders();
        setMyOrders(ordRes.orders);
      }
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to load account records.',
      });
    }
  }

  useEffect(() => {
    if (profile) {
      loadAccountData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid, isAdmin]);

  const activeThemeObj = ARGON_COVER_THEMES[coverTheme] || ARGON_COVER_THEMES['argon-blue'];

  async function handleSaveProfile(e?: React.FormEvent, overrides?: Partial<{
    avatarUrl: string;
    coverTheme: ProfileCoverTheme;
  }>) {
    if (e) e.preventDefault();
    setNotice(null);
    setSavingProfile(true);
    try {
      const res = await api.saveAccountProfile({
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: displayName.trim() || `${firstName} ${lastName}`.trim() || profile?.displayName || 'PlayBeat User',
        email: isAdmin ? email.trim() : undefined,
        phone: phone.trim(),
        title: title.trim(),
        department: department.trim(),
        address: address.trim(),
        city: city.trim(),
        country: country.trim(),
        postalCode: postalCode.trim(),
        website: website.trim(),
        bio: bio.trim(),
        avatarUrl: overrides?.avatarUrl !== undefined ? overrides.avatarUrl : avatarUrl.trim(),
        coverTheme: overrides?.coverTheme ?? coverTheme,
        brandTitle: brandTitle.trim() || 'PlayBeat Admin',
      });
      onProfileUpdated(res.profile);
      setNotice({ type: 'info', text: 'Profile and Argon workspace settings saved.' });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleThemeSelect(nextTheme: ProfileCoverTheme) {
    setCoverTheme(nextTheme);
    await handleSaveProfile(undefined, { coverTheme: nextTheme });
  }

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setNotice({ type: 'error', text: 'Avatar image must be PNG, JPEG, or WebP.' });
      return;
    }
    if (file.size > 480 * 1024) {
      setNotice({ type: 'error', text: 'Avatar image must be smaller than 480 KB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
        setAvatarPreviewError(false);
        await handleSaveProfile(undefined, { avatarUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleRemoveAvatar() {
    setAvatarUrl('');
    setAvatarPreviewError(false);
    await handleSaveProfile(undefined, { avatarUrl: '' });
  }

  async function handleUseDefaultAvatar() {
    setAvatarUrl(DEFAULT_AVATAR_PATH);
    setAvatarPreviewError(false);
    await handleSaveProfile(undefined, { avatarUrl: DEFAULT_AVATAR_PATH });
  }

  async function handleResetProfileDefaults() {
    setResettingProfile(true);
    setNotice(null);
    try {
      const res = await api.resetAccountProfile();
      onProfileUpdated(res.profile);
      setConfirmResetProfile(false);
      setNotice({ type: 'info', text: 'Profile customizations reset to factory defaults.' });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to reset profile.',
      });
    } finally {
      setResettingProfile(false);
    }
  }

  async function handleTogglePref(key: keyof UserProfile['prefs'], value: boolean) {
    setNotice(null);
    try {
      const res = await api.saveAccountNotifications({ [key]: value });
      onProfileUpdated(res.profile);
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update notification preferences.',
      });
    }
  }

  // Custom Fields CRUD
  async function handleAddCustomField(e: React.FormEvent) {
    e.preventDefault();
    if (!newFieldLabel.trim() || !newFieldValue.trim()) return;
    setAddingField(true);
    setNotice(null);
    try {
      const res = await api.addCustomField({
        label: newFieldLabel.trim(),
        value: newFieldValue.trim(),
        category: newFieldCategory,
      });
      onProfileUpdated(res.profile);
      setNewFieldLabel('');
      setNewFieldValue('');
      setNotice({ type: 'info', text: `Added custom field "${res.field.label}".` });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to add custom field.',
      });
    } finally {
      setAddingField(false);
    }
  }

  function startEditCustomField(field: ProfileCustomField) {
    setEditingFieldId(field.id);
    setEditFieldLabel(field.label);
    setEditFieldValue(field.value);
    setEditFieldCategory(field.category);
  }

  async function handleSaveCustomField(id: string) {
    setNotice(null);
    try {
      const res = await api.updateCustomField(id, {
        label: editFieldLabel.trim(),
        value: editFieldValue.trim(),
        category: editFieldCategory,
      });
      onProfileUpdated(res.profile);
      setEditingFieldId(null);
      setNotice({ type: 'info', text: `Updated custom field "${res.field.label}".` });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to update custom field.',
      });
    }
  }

  async function handleDeleteCustomField(id: string) {
    setNotice(null);
    try {
      const res = await api.deleteCustomField(id);
      onProfileUpdated(res.profile);
      if (editingFieldId === id) setEditingFieldId(null);
      setNotice({ type: 'info', text: 'Custom field removed.' });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to delete custom field.',
      });
    }
  }

  // Social Links CRUD
  async function handleAddSocialLink(e: React.FormEvent) {
    e.preventDefault();
    if (!newLinkPlatform.trim() || !newLinkUrl.trim()) return;
    setAddingLink(true);
    setNotice(null);
    try {
      const res = await api.addSocialLink({
        platform: newLinkPlatform.trim(),
        handle: newLinkHandle.trim(),
        url: newLinkUrl.trim(),
      });
      onProfileUpdated(res.profile);
      setNewLinkPlatform('');
      setNewLinkHandle('');
      setNewLinkUrl('');
      setNotice({ type: 'info', text: `Added link for ${res.link.platform}.` });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to add link.',
      });
    } finally {
      setAddingLink(false);
    }
  }

  function startEditSocialLink(link: ProfileSocialLink) {
    setEditingLinkId(link.id);
    setEditLinkPlatform(link.platform);
    setEditLinkHandle(link.handle);
    setEditLinkUrl(link.url);
  }

  async function handleSaveSocialLink(id: string) {
    setNotice(null);
    try {
      const res = await api.updateSocialLink(id, {
        platform: editLinkPlatform.trim(),
        handle: editLinkHandle.trim(),
        url: editLinkUrl.trim(),
      });
      onProfileUpdated(res.profile);
      setEditingLinkId(null);
      setNotice({ type: 'info', text: `Updated ${res.link.platform} link.` });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to update link.',
      });
    }
  }

  async function handleDeleteSocialLink(id: string) {
    setNotice(null);
    try {
      const res = await api.deleteSocialLink(id);
      onProfileUpdated(res.profile);
      if (editingLinkId === id) setEditingLinkId(null);
      setNotice({ type: 'info', text: 'Social link deleted.' });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to delete social link.',
      });
    }
  }

  // Skills CRUD
  async function handleAddSkill(e: React.FormEvent) {
    e.preventDefault();
    if (!newSkill.trim()) return;
    setAddingSkill(true);
    setNotice(null);
    try {
      const res = await api.addSkill(newSkill.trim());
      onProfileUpdated(res.profile);
      setNewSkill('');
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to add specialty.',
      });
    } finally {
      setAddingSkill(false);
    }
  }

  async function handleDeleteSkill(index: number) {
    setNotice(null);
    try {
      const res = await api.deleteSkill(index);
      onProfileUpdated(res.profile);
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to remove specialty.',
      });
    }
  }

  // Security & Sessions
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (newPassword.length < 8) {
      setNotice({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotice({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setChangingPassword(true);
    try {
      const res = await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice({ type: 'info', text: res.message });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Password change failed.',
      });
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleRevokeOthers() {
    setRevokingSessions(true);
    setNotice(null);
    try {
      const res = await api.revokeOtherSessions();
      await loadAccountData();
      setNotice({
        type: 'info',
        text:
          res.revoked > 0
            ? `Signed out ${res.revoked} other active session(s).`
            : 'No other active sessions were found.',
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to revoke sessions.',
      });
    } finally {
      setRevokingSessions(false);
    }
  }

  // Admin: Open, Edit, Reset, Revoke, Delete Customer Accounts
  async function handleOpenAccount(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    setOpeningAccount(true);
    try {
      const res = await api.adminCreateCustomer({
        displayName: openName.trim(),
        email: openEmail.trim(),
        phone: openPhone.trim() || undefined,
        provider: openProvider,
        password: openPassword || undefined,
      });
      setCustomers((prev) => [res.customer, ...prev]);
      setOpenName('');
      setOpenEmail('');
      setOpenPhone('');
      setOpenPassword('');
      setNotice({
        type: 'info',
        text: `Opened account ${res.customer.uid} for ${res.customer.email}.`,
      });
      onDataChanged?.();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not open customer account.',
      });
    } finally {
      setOpeningAccount(false);
    }
  }

  function startEditCustomer(c: CustomerAccount) {
    setEditingCustomerUid(c.uid);
    setEditCustName(c.displayName);
    setEditCustEmail(c.email);
    setEditCustPhone(c.phone || '');
    setEditCustProvider(c.provider);
    setDirectResetUid(null);
    setConfirmDeleteUid(null);
  }

  async function handleSaveCustomer(uid: string) {
    setSavingCustomer(true);
    setNotice(null);
    try {
      const res = await api.adminUpdateCustomer(uid, {
        displayName: editCustName.trim(),
        email: editCustEmail.trim(),
        phone: editCustPhone.trim(),
        provider: editCustProvider,
      });
      setCustomers((prev) => prev.map((c) => (c.uid === uid ? res.customer : c)));
      setEditingCustomerUid(null);
      setNotice({ type: 'info', text: `Updated account for ${res.customer.email}.` });
      onDataChanged?.();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update customer account.',
      });
    } finally {
      setSavingCustomer(false);
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
      onDataChanged?.();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete customer account.',
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
        setIssuedCode({
          email: customer.email,
          code: res.resetCode,
          expiresAt: res.expiresAt,
        });
      }
      setNotice({ type: 'info', text: res.message });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to generate reset code.',
      });
    }
  }

  async function handleDirectPasswordReset(uid: string) {
    if (directResetPassword.length < 8) {
      setNotice({ type: 'error', text: 'Temporary password must be at least 8 characters.' });
      return;
    }
    setNotice(null);
    try {
      const res = await api.adminResetCustomerPassword(uid, {
        mode: 'direct',
        newPassword: directResetPassword,
      });
      setDirectResetUid(null);
      setDirectResetPassword('');
      setNotice({ type: 'info', text: res.message });
      loadAccountData();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to reset password.',
      });
    }
  }

  async function handleRevokeCustomerSessions(uid: string) {
    setNotice(null);
    try {
      const res = await api.revokeCustomerSessions(uid);
      setCustomers((prev) => prev.map((c) => (c.uid === uid ? res.customer : c)));
      setNotice({ type: 'info', text: `Revoked active sessions for ${res.customer.email}.` });
      onDataChanged?.();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to revoke sessions.',
      });
    }
  }

  if (!profile) {
    return (
      <div className="argon-card p-8 text-sm text-[#8392ab]">
        Loading user profile...
      </div>
    );
  }

  const inputClass =
    'w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#0b1437] border border-[#dee2e6] dark:border-[#243266] rounded-lg text-[#344767] dark:text-slate-100 placeholder:text-[#adb5bd] dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#5e72e4]/30 focus:border-[#5e72e4] transition-colors';

  const labelClass =
    'block text-xs font-bold uppercase tracking-wider text-[#8392ab] dark:text-slate-400 mb-1.5';

  const tabs: Array<{
    id: ProfileTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'profile', label: 'Edit Profile & Theme', icon: User },
    { id: 'fields', label: 'Custom Fields & Links', icon: Sliders },
    { id: 'security', label: 'Security & Sessions', icon: Shield },
    ...(isAdmin
      ? [{ id: 'accounts' as const, label: 'Accounts Manager', icon: Users }]
      : []),
  ];

  const liveName = displayName.trim() || profile.displayName;
  const liveHandle = username.trim() || profile.username;
  const liveLocation = [city.trim(), country.trim()].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      {/* Argon Signature Floating Profile Header Card straddling the top banner */}
      <section className="argon-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          {avatarUrl && !avatarPreviewError ? (
            <img
              src={avatarUrl}
              alt={liveName}
              referrerPolicy="no-referrer"
              onError={() => setAvatarPreviewError(true)}
              className="w-16 h-16 rounded-xl object-cover border border-[#e9ecef] dark:border-[#243266] shadow-xs shrink-0"
            />
          ) : (
            <div
              className={`w-16 h-16 rounded-xl ${activeThemeObj.bannerClass} text-white flex items-center justify-center text-lg font-bold shadow-xs shrink-0`}
            >
              {getInitials(liveName)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-[#344767] dark:text-white truncate">
              {liveName}
            </h1>
            <p className="mt-0.5 text-sm text-[#67748e] dark:text-slate-400 truncate">
              {title || (isAdmin ? 'Lead Operations Admin' : 'Storefront Member')}
              {department ? ` · ${department}` : ''}
            </p>
            <p className="mt-1 text-xs font-mono text-[#8392ab] dark:text-slate-500 truncate">
              @{liveHandle} · {profile.uid}
            </p>
          </div>
        </div>

        {/* Argon Segmented Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#f8f9fe] dark:bg-[#0b1437] border border-[#e9ecef] dark:border-[#1e2952] rounded-xl shrink-0">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTab(t.id);
                  setNotice(null);
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                  active
                    ? 'bg-white dark:bg-[#111c44] text-[#344767] dark:text-white shadow-xs'
                    : 'text-[#67748e] dark:text-slate-400 hover:text-[#344767] dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </section>

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

      {/* Argon Iconic 2-Column Split: 8-Col Studio Left + 4-Col Live Profile Preview Card Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (8 cols) */}
        <div className="xl:col-span-8 space-y-6">
          {/* TAB 1: EDIT PROFILE & CUSTOMIZE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="argon-card overflow-hidden">
              <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#e9ecef] dark:border-[#1e2952] bg-[#fafbfe] dark:bg-[#0e1738]">
                <div>
                  <h2 className="text-base font-bold text-[#344767] dark:text-white">
                    Edit Profile & Workspace Appearance
                  </h2>
                  <p className="text-xs text-[#8392ab] dark:text-slate-400">
                    Customize identity, contact details, Argon theme banner, avatar, and alerts.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {confirmResetProfile ? (
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={resettingProfile}
                        onClick={handleResetProfileDefaults}
                        className="px-3 py-2 text-xs font-semibold text-white bg-[#f5365c] hover:bg-[#e1274c] rounded-lg whitespace-nowrap"
                      >
                        {resettingProfile ? 'Resetting...' : 'Confirm Reset'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmResetProfile(false)}
                        className="px-2.5 py-2 text-xs font-semibold text-[#67748e] hover:text-[#344767] dark:text-slate-300 border border-[#dee2e6] dark:border-[#243266] rounded-lg whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmResetProfile(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#67748e] dark:text-slate-300 bg-white dark:bg-[#111c44] border border-[#dee2e6] dark:border-[#243266] rounded-lg hover:bg-[#f6f9fc] dark:hover:bg-[#182450] whitespace-nowrap"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Defaults</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#5e72e4] hover:bg-[#4e62d4] disabled:opacity-60 rounded-lg shadow-xs transition-colors whitespace-nowrap"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingProfile ? 'Saving...' : 'Save Profile'}</span>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-8">
                {/* SECTION 1: USER INFORMATION */}
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8392ab] dark:text-slate-400">
                    User Information
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="prof-username" className={labelClass}>
                        Username
                      </label>
                      <input
                        id="prof-username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="playbeat.ops"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="prof-email" className={labelClass}>
                        Email Address
                      </label>
                      <input
                        id="prof-email"
                        type="email"
                        disabled={!isAdmin}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`${inputClass} ${!isAdmin ? 'opacity-65 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    <div>
                      <label htmlFor="prof-first-name" className={labelClass}>
                        First Name
                      </label>
                      <input
                        id="prof-first-name"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="prof-last-name" className={labelClass}>
                        Last Name
                      </label>
                      <input
                        id="prof-last-name"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="prof-display-name" className={labelClass}>
                        Display Name
                      </label>
                      <input
                        id="prof-display-name"
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Full display name"
                        className={inputClass}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="prof-title" className={labelClass}>
                          Role / Title
                        </label>
                        <input
                          id="prof-title"
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Lead Operations"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="prof-department" className={labelClass}>
                          Department
                        </label>
                        <input
                          id="prof-department"
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="Operations"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: CONTACT INFORMATION */}
                <div className="pt-6 border-t border-[#e9ecef] dark:border-[#1e2952] space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8392ab] dark:text-slate-400">
                    Contact Information
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label htmlFor="prof-address" className={labelClass}>
                        Address
                      </label>
                      <input
                        id="prof-address"
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Office or mailing address"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="prof-city" className={labelClass}>
                        City
                      </label>
                      <input
                        id="prof-city"
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Lahore"
                        className={inputClass}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="prof-country" className={labelClass}>
                          Country
                        </label>
                        <input
                          id="prof-country"
                          type="text"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          placeholder="Pakistan"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="prof-postal" className={labelClass}>
                          Postal Code
                        </label>
                        <input
                          id="prof-postal"
                          type="text"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="54000"
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="prof-phone" className={labelClass}>
                        Phone / WhatsApp
                      </label>
                      <input
                        id="prof-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+92300..."
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="prof-website" className={labelClass}>
                        Website URL
                      </label>
                      <input
                        id="prof-website"
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://playbeat.digital"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: ABOUT ME */}
                <div className="pt-6 border-t border-[#e9ecef] dark:border-[#1e2952] space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8392ab] dark:text-slate-400">
                    About Me
                  </p>
                  <div>
                    <label htmlFor="prof-bio" className={labelClass}>
                      Bio / Operational Summary
                    </label>
                    <textarea
                      id="prof-bio"
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Short summary shown on your Argon profile card..."
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* SECTION 4: ARGON APPEARANCE & AVATAR CUSTOMIZER */}
                <div className="pt-6 border-t border-[#e9ecef] dark:border-[#1e2952] space-y-5">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[#5e72e4]" />
                    <p className="text-xs font-bold uppercase tracking-wider text-[#8392ab] dark:text-slate-400">
                      Argon Workspace & Avatar Customizer
                    </p>
                  </div>

                  {/* Argon Banner Theme Picker */}
                  <div>
                    <span className={labelClass}>Argon Header Banner Theme</span>
                    <div className="flex flex-wrap gap-2.5">
                      {(Object.keys(ARGON_COVER_THEMES) as ProfileCoverTheme[]).map((key) => {
                        const item = ARGON_COVER_THEMES[key];
                        const selected = coverTheme === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleThemeSelect(key)}
                            className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap ${
                              selected
                                ? 'border-[#5e72e4] bg-[#f6f9fc] dark:bg-[#182450] text-[#344767] dark:text-white shadow-xs'
                                : 'border-[#dee2e6] dark:border-[#243266] text-[#67748e] dark:text-slate-300 hover:border-[#adb5bd]'
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full ${item.bannerClass} flex items-center justify-center text-white shrink-0`}
                            >
                              {selected && <Check className="w-2.5 h-2.5" />}
                            </span>
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sidebar Brand Title & Avatar Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="prof-brand-title" className={labelClass}>
                        Sidebar Brand Title
                      </label>
                      <input
                        id="prof-brand-title"
                        type="text"
                        value={brandTitle}
                        onChange={(e) => setBrandTitle(e.target.value)}
                        placeholder="PlayBeat Admin"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="prof-avatar-url" className={labelClass}>
                        Avatar Image URL (https:// or uploaded)
                      </label>
                      <input
                        id="prof-avatar-url"
                        type="text"
                        value={avatarUrl.startsWith('data:image/') ? '(Uploaded local image)' : avatarUrl}
                        onChange={(e) => {
                          setAvatarUrl(e.target.value);
                          setAvatarPreviewError(false);
                        }}
                        placeholder="https://example.com/avatar.jpg"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#5e72e4] hover:bg-[#4e62d4] rounded-lg whitespace-nowrap"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      <span>Upload Avatar</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleUseDefaultAvatar}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#344767] dark:text-slate-200 bg-white dark:bg-[#182450] border border-[#dee2e6] dark:border-[#243266] rounded-lg hover:bg-[#f6f9fc] dark:hover:bg-[#1e2d62] whitespace-nowrap"
                    >
                      <span>Use Default Portrait</span>
                    </button>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#f5365c] border border-[#f5365c]/30 rounded-lg hover:bg-[#fff5f6] dark:hover:bg-[#2a1220] whitespace-nowrap"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Avatar</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* SECTION 5: NOTIFICATION PREFERENCES */}
                <div className="pt-6 border-t border-[#e9ecef] dark:border-[#1e2952] space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8392ab] dark:text-slate-400">
                    Notification Preferences
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        key: 'orderUpdates' as const,
                        title: 'Order Updates',
                        desc: 'Fulfillment & key alerts',
                      },
                      {
                        key: 'productNews' as const,
                        title: 'Catalog Alerts',
                        desc: 'New stock & deals',
                      },
                      {
                        key: 'securityAlerts' as const,
                        title: 'Security Notices',
                        desc: 'Logins & password resets',
                      },
                    ].map((pref) => (
                      <label
                        key={pref.key}
                        className="flex items-start gap-3 p-3.5 rounded-xl border border-[#e9ecef] dark:border-[#1e2952] bg-[#fafbfe] dark:bg-[#0e1738] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={profile.prefs[pref.key]}
                          onChange={(e) => handleTogglePref(pref.key, e.target.checked)}
                          className="mt-0.5 rounded border-[#dee2e6] accent-[#5e72e4]"
                        />
                        <span>
                          <span className="block text-xs font-bold text-[#344767] dark:text-white">
                            {pref.title}
                          </span>
                          <span className="block text-[11px] text-[#8392ab] dark:text-slate-400">
                            {pref.desc}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: CUSTOM FIELDS, SOCIAL LINKS & SPECIALTIES (ADD · EDIT · REMOVE · DELETE) */}
          {activeTab === 'fields' && (
            <div className="space-y-6">
              {/* Custom Profile Fields CRUD */}
              <section className="argon-card p-6 space-y-5">
                <div>
                  <h2 className="text-base font-bold text-[#344767] dark:text-white">
                    Custom Profile Fields
                  </h2>
                  <p className="mt-0.5 text-xs text-[#67748e] dark:text-slate-400">
                    Add, edit, or delete custom operational identifiers (publisher IDs, billing tags, contact channels).
                  </p>
                </div>

                <form
                  onSubmit={handleAddCustomField}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3"
                >
                  <input
                    type="text"
                    required
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    placeholder="Field label (e.g. Support Desk)"
                    className={`sm:col-span-4 ${inputClass}`}
                  />
                  <input
                    type="text"
                    required
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    placeholder="Value"
                    className={`sm:col-span-4 ${inputClass}`}
                  />
                  <select
                    aria-label="Custom field category"
                    value={newFieldCategory}
                    onChange={(e) =>
                      setNewFieldCategory(e.target.value as ProfileCustomField['category'])
                    }
                    className={`sm:col-span-2 ${inputClass}`}
                  >
                    {FIELD_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={addingField}
                    className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-white bg-[#5e72e4] hover:bg-[#4e62d4] disabled:opacity-60 rounded-lg whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Field</span>
                  </button>
                </form>

                <div className="divide-y divide-[#e9ecef] dark:divide-[#1e2952] border-t border-[#e9ecef] dark:border-[#1e2952]">
                  {profile.customFields.map((field) => {
                    const isEditing = editingFieldId === field.id;
                    return (
                      <div key={field.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {isEditing ? (
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={editFieldLabel}
                              onChange={(e) => setEditFieldLabel(e.target.value)}
                              className={inputClass}
                            />
                            <input
                              type="text"
                              value={editFieldValue}
                              onChange={(e) => setEditFieldValue(e.target.value)}
                              className={inputClass}
                            />
                            <select
                              value={editFieldCategory}
                              onChange={(e) =>
                                setEditFieldCategory(
                                  e.target.value as ProfileCustomField['category'],
                                )
                              }
                              className={inputClass}
                            >
                              {FIELD_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wider text-[#8392ab]">
                              {field.category} · {field.label}
                            </p>
                            <p className="mt-0.5 text-sm font-mono font-medium text-[#344767] dark:text-white break-all">
                              {field.value}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSaveCustomField(field.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#2dce89] hover:bg-[#26b578] rounded-lg whitespace-nowrap"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Save</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingFieldId(null)}
                                className="px-2.5 py-1.5 text-xs font-semibold text-[#67748e] border border-[#dee2e6] dark:border-[#243266] rounded-lg"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditCustomField(field)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#5e72e4] border border-[#e9ecef] dark:border-[#243266] rounded-lg hover:bg-[#f6f9fc] dark:hover:bg-[#182450] whitespace-nowrap"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomField(field.id)}
                                aria-label={`Delete ${field.label}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#f5365c] border border-[#f5365c]/30 rounded-lg hover:bg-[#fff5f6] dark:hover:bg-[#2a1220] whitespace-nowrap"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {profile.customFields.length === 0 && (
                    <p className="py-6 text-center text-xs text-[#8392ab]">
                      No custom fields added yet. Use the form above to add one.
                    </p>
                  )}
                </div>
              </section>

              {/* Social & Contact Links CRUD */}
              <section className="argon-card p-6 space-y-5">
                <div>
                  <h2 className="text-base font-bold text-[#344767] dark:text-white">
                    Social & Workspace Links
                  </h2>
                  <p className="mt-0.5 text-xs text-[#67748e] dark:text-slate-400">
                    Add, edit, or delete verified https:// links displayed on your Argon profile card.
                  </p>
                </div>

                <form
                  onSubmit={handleAddSocialLink}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3"
                >
                  <input
                    type="text"
                    required
                    value={newLinkPlatform}
                    onChange={(e) => setNewLinkPlatform(e.target.value)}
                    placeholder="Platform (e.g. GitHub)"
                    className={`sm:col-span-3 ${inputClass}`}
                  />
                  <input
                    type="text"
                    value={newLinkHandle}
                    onChange={(e) => setNewLinkHandle(e.target.value)}
                    placeholder="Handle (@playbeat)"
                    className={`sm:col-span-3 ${inputClass}`}
                  />
                  <input
                    type="url"
                    required
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className={`sm:col-span-4 ${inputClass}`}
                  />
                  <button
                    type="submit"
                    disabled={addingLink}
                    className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-white bg-[#5e72e4] hover:bg-[#4e62d4] disabled:opacity-60 rounded-lg whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Link</span>
                  </button>
                </form>

                <div className="divide-y divide-[#e9ecef] dark:divide-[#1e2952] border-t border-[#e9ecef] dark:border-[#1e2952]">
                  {profile.socialLinks.map((link) => {
                    const isEditing = editingLinkId === link.id;
                    return (
                      <div key={link.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {isEditing ? (
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={editLinkPlatform}
                              onChange={(e) => setEditLinkPlatform(e.target.value)}
                              className={inputClass}
                            />
                            <input
                              type="text"
                              value={editLinkHandle}
                              onChange={(e) => setEditLinkHandle(e.target.value)}
                              className={inputClass}
                            />
                            <input
                              type="url"
                              value={editLinkUrl}
                              onChange={(e) => setEditLinkUrl(e.target.value)}
                              className={inputClass}
                            />
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#344767] dark:text-white">
                              {link.platform}{' '}
                              <span className="font-normal text-xs text-[#8392ab]">
                                {link.handle}
                              </span>
                            </p>
                            <p className="text-xs font-mono text-[#5e72e4] truncate">
                              {link.url}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSaveSocialLink(link.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#2dce89] hover:bg-[#26b578] rounded-lg whitespace-nowrap"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Save</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingLinkId(null)}
                                className="px-2.5 py-1.5 text-xs font-semibold text-[#67748e] border border-[#dee2e6] dark:border-[#243266] rounded-lg"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditSocialLink(link)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#5e72e4] border border-[#e9ecef] dark:border-[#243266] rounded-lg hover:bg-[#f6f9fc] dark:hover:bg-[#182450] whitespace-nowrap"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSocialLink(link.id)}
                                aria-label={`Delete ${link.platform}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#f5365c] border border-[#f5365c]/30 rounded-lg hover:bg-[#fff5f6] dark:hover:bg-[#2a1220] whitespace-nowrap"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {profile.socialLinks.length === 0 && (
                    <p className="py-6 text-center text-xs text-[#8392ab]">
                      No links configured yet.
                    </p>
                  )}
                </div>
              </section>

              {/* Specialties / Responsibilities CRUD */}
              <section className="argon-card p-6 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-[#344767] dark:text-white">
                    Specialties & Responsibilities
                  </h2>
                  <p className="mt-0.5 text-xs text-[#67748e] dark:text-slate-400">
                    Add or remove operational domains listed on your profile.
                  </p>
                </div>

                <form onSubmit={handleAddSkill} className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    required
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add specialty (e.g. Stripe Billing, AdSense Optimization)"
                    className={`flex-1 ${inputClass}`}
                  />
                  <button
                    type="submit"
                    disabled={addingSkill}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#5e72e4] hover:bg-[#4e62d4] disabled:opacity-60 rounded-lg whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Specialty</span>
                  </button>
                </form>

                <div className="divide-y divide-[#e9ecef] dark:divide-[#1e2952] border-t border-[#e9ecef] dark:border-[#1e2952]">
                  {profile.skills.map((skill, idx) => (
                    <div
                      key={`${skill}-${idx}`}
                      className="py-2.5 flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="font-medium text-[#344767] dark:text-slate-100">
                        {skill}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSkill(idx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#f5365c] hover:bg-[#fff5f6] dark:hover:bg-[#2a1220] rounded-lg whitespace-nowrap"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  ))}
                  {profile.skills.length === 0 && (
                    <p className="py-5 text-center text-xs text-[#8392ab]">
                      No specialties added yet.
                    </p>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: SECURITY & SESSIONS (+ CUSTOMER ORDERS) */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <section className="argon-card p-6 space-y-5">
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-4 h-4 text-[#5e72e4]" />
                  <div>
                    <h2 className="text-base font-bold text-[#344767] dark:text-white">
                      Reset / Change Account Password
                    </h2>
                    <p className="text-xs text-[#67748e] dark:text-slate-400">
                      {isAdmin
                        ? 'Update the operator password used to sign in to this console.'
                        : 'Update your PlayBeat account password. Minimum 8 characters.'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label htmlFor="sec-current-pass" className={labelClass}>
                      Current Password
                    </label>
                    <input
                      id="sec-current-pass"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="sec-new-pass" className={labelClass}>
                        New Password
                      </label>
                      <input
                        id="sec-new-pass"
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="sec-confirm-pass" className={labelClass}>
                        Confirm New Password
                      </label>
                      <input
                        id="sec-confirm-pass"
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#5e72e4] hover:bg-[#4e62d4] disabled:opacity-60 rounded-lg shadow-xs whitespace-nowrap"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{changingPassword ? 'Updating...' : 'Update Password'}</span>
                  </button>
                </form>
              </section>

              {/* Active Sessions */}
              <section className="argon-card p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-[#344767] dark:text-white">
                      Active Sessions
                    </h2>
                    <p className="text-xs text-[#67748e] dark:text-slate-400">
                      Signed-in browsers and devices for this account.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={revokingSessions || sessions.length <= 1}
                    onClick={handleRevokeOthers}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#344767] dark:text-slate-200 border border-[#dee2e6] dark:border-[#243266] rounded-lg hover:bg-[#f6f9fc] dark:hover:bg-[#182450] disabled:opacity-40 whitespace-nowrap self-start sm:self-auto"
                  >
                    <ShieldOff className="w-3.5 h-3.5" />
                    <span>
                      {revokingSessions ? 'Revoking...' : 'Sign Out Other Devices'}
                    </span>
                  </button>
                </div>

                <div className="divide-y divide-[#e9ecef] dark:divide-[#1e2952] border-t border-[#e9ecef] dark:border-[#1e2952]">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[#344767] dark:text-white truncate">
                          {s.userAgent}
                          {s.isCurrent && (
                            <span className="ml-2 text-[#2dce89] font-semibold">
                              · Current Session
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-[#8392ab] font-mono tabular-nums">
                          Started {s.createdAt.slice(0, 19).replace('T', ' ')} · Expires{' '}
                          {s.expiresAt.slice(0, 19).replace('T', ' ')}
                        </p>
                      </div>
                      <span className="font-mono text-[#8392ab] shrink-0">{s.id}</span>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <p className="py-5 text-xs text-[#8392ab]">No active sessions recorded.</p>
                  )}
                </div>
              </section>

              {/* Customer-only Orders & License Keys */}
              {!isAdmin && (
                <section className="argon-card overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#e9ecef] dark:border-[#1e2952]">
                    <h2 className="text-base font-bold text-[#344767] dark:text-white">
                      My Orders & License Keys
                    </h2>
                    <p className="text-xs text-[#67748e] dark:text-slate-400">
                      Orders linked to {profile.email}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#e9ecef] dark:border-[#1e2952] bg-[#f6f9fc] dark:bg-[#0e1738] text-[11px] font-bold uppercase tracking-wider text-[#8392ab]">
                          <th className="py-3 px-6">Order</th>
                          <th className="py-3 px-4">Items</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-6 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e9ecef] dark:divide-[#1e2952] text-sm">
                        {myOrders.map((o) => (
                          <tr key={o.id}>
                            <td className="py-3 px-6 font-mono text-xs font-semibold text-[#344767] dark:text-white whitespace-nowrap">
                              {o.id}
                            </td>
                            <td className="py-3 px-4 text-xs text-[#67748e] dark:text-slate-300">
                              {o.items.map((i) => `${i.name} ×${i.qty}`).join(', ')}
                              {o.issuedKeys.length > 0 && (
                                <p className="mt-1 font-mono text-[#5e72e4]">
                                  Keys: {o.issuedKeys.join(', ')}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs font-semibold whitespace-nowrap">
                              <span
                                className={
                                  o.status === 'PAID_FULFILLED'
                                    ? 'text-[#2dce89]'
                                    : o.status === 'PENDING'
                                      ? 'text-[#fb6340]'
                                      : 'text-[#f5365c]'
                                }
                              >
                                {o.status === 'PAID_FULFILLED'
                                  ? 'Paid · Fulfilled'
                                  : o.status === 'PENDING'
                                    ? 'Pending'
                                    : 'Cancelled'}
                              </span>
                            </td>
                            <td className="py-3 px-6 text-right font-mono tabular-nums text-xs font-semibold">
                              ${o.totalUsd.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        {myOrders.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-xs text-[#8392ab]">
                              No orders linked to this account yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* TAB 4: ADMIN ACCOUNTS MANAGER (OPEN · EDIT · RESET · DELETE) */}
          {activeTab === 'accounts' && isAdmin && (
            <div className="space-y-6">
              <section className="argon-card p-6 space-y-4">
                <div className="flex items-center gap-2.5">
                  <UserPlus className="w-4 h-4 text-[#5e72e4]" />
                  <div>
                    <h2 className="text-base font-bold text-[#344767] dark:text-white">
                      Open New Customer Account
                    </h2>
                    <p className="text-xs text-[#67748e] dark:text-slate-400">
                      Provision a new storefront profile with optional initial sign-in password.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleOpenAccount}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  <div>
                    <label htmlFor="open-name" className={labelClass}>
                      Full Name
                    </label>
                    <input
                      id="open-name"
                      type="text"
                      required
                      value={openName}
                      onChange={(e) => setOpenName(e.target.value)}
                      placeholder="Customer full name"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="open-email" className={labelClass}>
                      Email Address
                    </label>
                    <input
                      id="open-email"
                      type="email"
                      required
                      value={openEmail}
                      onChange={(e) => setOpenEmail(e.target.value)}
                      placeholder="customer@example.com"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="open-phone" className={labelClass}>
                      Phone / WhatsApp
                    </label>
                    <input
                      id="open-phone"
                      type="tel"
                      value={openPhone}
                      onChange={(e) => setOpenPhone(e.target.value)}
                      placeholder="+92300..."
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="open-provider" className={labelClass}>
                      Sign-In Provider
                    </label>
                    <select
                      id="open-provider"
                      value={openProvider}
                      onChange={(e) => setOpenProvider(e.target.value as 'Email' | 'Google')}
                      className={inputClass}
                    >
                      <option value="Email">Email & Password</option>
                      <option value="Google">Google SSO</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="open-password" className={labelClass}>
                      Initial Password (Optional)
                    </label>
                    <input
                      id="open-password"
                      type="password"
                      value={openPassword}
                      onChange={(e) => setOpenPassword(e.target.value)}
                      placeholder="Min 8 chars"
                      className={inputClass}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={openingAccount}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#5e72e4] hover:bg-[#4e62d4] disabled:opacity-60 rounded-lg shadow-xs whitespace-nowrap"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{openingAccount ? 'Opening...' : 'Open Account'}</span>
                    </button>
                  </div>
                </form>
              </section>

              {issuedCode && (
                <div className="argon-card px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-[#5e72e4]/40">
                  <div className="text-xs">
                    <p className="text-[#67748e] dark:text-slate-400">
                      One-time 30-min reset code for{' '}
                      <span className="font-bold text-[#344767] dark:text-white">
                        {issuedCode.email}
                      </span>
                    </p>
                    <p className="mt-1 font-mono text-sm font-bold text-[#5e72e4]">
                      {issuedCode.code}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(issuedCode.code);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 1800);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#344767] dark:text-slate-200 border border-[#dee2e6] dark:border-[#243266] rounded-lg hover:bg-[#f6f9fc] dark:hover:bg-[#182450] whitespace-nowrap"
                    >
                      {copiedCode ? (
                        <Check className="w-3.5 h-3.5 text-[#2dce89]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIssuedCode(null)}
                      aria-label="Dismiss code"
                      className="p-1.5 text-[#8392ab] hover:text-[#344767] dark:hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Full Accounts Edit / Reset / Delete Directory */}
              <section className="argon-card overflow-hidden">
                <div className="px-6 py-4 border-b border-[#e9ecef] dark:border-[#1e2952]">
                  <h2 className="text-base font-bold text-[#344767] dark:text-white">
                    Manage Accounts (Edit · Reset Password · Delete)
                  </h2>
                  <p className="text-xs text-[#67748e] dark:text-slate-400">
                    Edit profile details, issue 30-minute reset codes, set temporary passwords, or delete accounts.
                  </p>
                </div>

                <div className="divide-y divide-[#e9ecef] dark:divide-[#1e2952]">
                  {customers.map((c) => {
                    const isEditing = editingCustomerUid === c.uid;
                    const isDeleting = confirmDeleteUid === c.uid;
                    return (
                      <div key={c.uid} className="p-5 space-y-3">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              <input
                                type="text"
                                value={editCustName}
                                onChange={(e) => setEditCustName(e.target.value)}
                                placeholder="Full name"
                                className={inputClass}
                              />
                              <input
                                type="email"
                                value={editCustEmail}
                                onChange={(e) => setEditCustEmail(e.target.value)}
                                placeholder="Email"
                                className={inputClass}
                              />
                              <input
                                type="tel"
                                value={editCustPhone}
                                onChange={(e) => setEditCustPhone(e.target.value)}
                                placeholder="Phone"
                                className={inputClass}
                              />
                              <select
                                value={editCustProvider}
                                onChange={(e) =>
                                  setEditCustProvider(e.target.value as 'Email' | 'Google')
                                }
                                className={inputClass}
                              >
                                <option value="Email">Email</option>
                                <option value="Google">Google</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={savingCustomer}
                                onClick={() => handleSaveCustomer(c.uid)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2dce89] hover:bg-[#26b578] rounded-lg whitespace-nowrap"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{savingCustomer ? 'Saving...' : 'Save Account'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCustomerUid(null)}
                                className="px-3 py-1.5 text-xs font-semibold text-[#67748e] border border-[#dee2e6] dark:border-[#243266] rounded-lg"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#344767] dark:text-white">
                                {c.displayName}{' '}
                                <span className="font-mono text-xs font-normal text-[#8392ab]">
                                  · {c.uid}
                                </span>
                              </p>
                              <p className="mt-0.5 text-xs text-[#67748e] dark:text-slate-400">
                                {c.email}
                                {c.phone ? ` · ${c.phone}` : ''} · {c.provider} ·{' '}
                                <span className="font-mono tabular-nums">
                                  {c.activeSessions} session{c.activeSessions === 1 ? '' : 's'}
                                </span>
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => startEditCustomer(c)}
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
                                <span>Reset Code</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDirectResetUid(directResetUid === c.uid ? null : c.uid);
                                  setDirectResetPassword('');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#344767] dark:text-slate-200 border border-[#e9ecef] dark:border-[#243266] rounded-lg hover:bg-[#f6f9fc] dark:hover:bg-[#182450] whitespace-nowrap"
                              >
                                <span>Set Password</span>
                              </button>
                              <button
                                type="button"
                                disabled={c.activeSessions === 0}
                                onClick={() => handleRevokeCustomerSessions(c.uid)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#67748e] border border-[#e9ecef] dark:border-[#243266] rounded-lg hover:bg-[#f6f9fc] dark:hover:bg-[#182450] disabled:opacity-40 whitespace-nowrap"
                              >
                                <ShieldOff className="w-3.5 h-3.5" />
                                <span>Revoke</span>
                              </button>

                              {isDeleting ? (
                                <span className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={deletingUid === c.uid}
                                    onClick={() => handleDeleteCustomer(c.uid)}
                                    className="px-2.5 py-1.5 text-xs font-semibold text-white bg-[#f5365c] hover:bg-[#e1274c] rounded-lg whitespace-nowrap"
                                  >
                                    {deletingUid === c.uid ? 'Deleting...' : 'Confirm Delete'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteUid(null)}
                                    className="px-2 py-1.5 text-xs font-semibold text-[#67748e] border border-[#dee2e6] dark:border-[#243266] rounded-lg"
                                  >
                                    Cancel
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteUid(c.uid)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#f5365c] border border-[#f5365c]/30 rounded-lg hover:bg-[#fff5f6] dark:hover:bg-[#2a1220] whitespace-nowrap"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {directResetUid === c.uid && (
                          <div className="pt-2 flex flex-col sm:flex-row gap-2">
                            <input
                              type="password"
                              value={directResetPassword}
                              onChange={(e) => setDirectResetPassword(e.target.value)}
                              placeholder="Enter new temporary password (min 8 chars)"
                              className={`flex-1 ${inputClass}`}
                            />
                            <button
                              type="button"
                              onClick={() => handleDirectPasswordReset(c.uid)}
                              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#5e72e4] hover:bg-[#4e62d4] rounded-lg whitespace-nowrap"
                            >
                              Save Password
                            </button>
                            <button
                              type="button"
                              onClick={() => setDirectResetUid(null)}
                              className="px-3 py-2 text-xs font-semibold text-[#67748e] border border-[#dee2e6] dark:border-[#243266] rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {customers.length === 0 && (
                    <p className="py-8 text-center text-xs text-[#8392ab]">
                      No customer accounts found.
                    </p>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (4 cols): LIVE CREATIVE TIM ARGON PROFILE PREVIEW CARD */}
        <aside className="xl:col-span-4 xl:sticky xl:top-6">
          <div className="argon-card overflow-hidden">
            {/* Architectural Cover Banner */}
            <div className="relative h-36 overflow-hidden">
              <img
                src={ARGON_COVER_IMAGE}
                alt="Profile cover backdrop"
                className="w-full h-full object-cover"
              />
              <div
                className={`absolute inset-0 ${activeThemeObj.scrimClass} mix-blend-multiply`}
                aria-hidden="true"
              />
            </div>

            {/* Overlapping Circular Avatar */}
            <div className="px-6 pb-6">
              <div className="relative flex justify-center -mt-12 mb-4">
                {avatarUrl && !avatarPreviewError ? (
                  <img
                    src={avatarUrl}
                    alt={liveName}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarPreviewError(true)}
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-white dark:ring-[#111c44] shadow-md bg-white dark:bg-[#111c44]"
                  />
                ) : (
                  <div
                    className={`w-24 h-24 rounded-full ${activeThemeObj.bannerClass} text-white flex items-center justify-center text-2xl font-bold ring-4 ring-white dark:ring-[#111c44] shadow-md`}
                  >
                    {getInitials(liveName)}
                  </div>
                )}
              </div>

              {/* Argon Action Strip */}
              <div className="flex items-center justify-center gap-2.5 mb-5">
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#11cdef] hover:bg-[#0eb8d6] rounded-lg shadow-xs transition-colors whitespace-nowrap"
                >
                  Customize
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('fields')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#172b4d] hover:bg-[#101f38] dark:bg-[#5e72e4] dark:hover:bg-[#4e62d4] rounded-lg shadow-xs transition-colors whitespace-nowrap"
                >
                  Edit Fields
                </button>
              </div>

              {/* Argon 3-Column Profile Stats */}
              <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#e9ecef] dark:border-[#1e2952] text-center">
                <div>
                  <p className="text-base font-bold font-mono tabular-nums text-[#344767] dark:text-white">
                    {profile.customFields.length}
                  </p>
                  <p className="text-[11px] font-medium text-[#8392ab]">Fields</p>
                </div>
                <div>
                  <p className="text-base font-bold font-mono tabular-nums text-[#344767] dark:text-white">
                    {profile.socialLinks.length}
                  </p>
                  <p className="text-[11px] font-medium text-[#8392ab]">Links</p>
                </div>
                <div>
                  <p className="text-base font-bold font-mono tabular-nums text-[#344767] dark:text-white">
                    {profile.skills.length}
                  </p>
                  <p className="text-[11px] font-medium text-[#8392ab]">Specialties</p>
                </div>
              </div>

              {/* Identity Details */}
              <div className="mt-5 text-center space-y-1.5">
                <h3 className="text-lg font-bold text-[#344767] dark:text-white">{liveName}</h3>
                <p className="text-xs font-mono text-[#8392ab]">@{liveHandle}</p>

                {liveLocation && (
                  <p className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-[#67748e] dark:text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-[#8392ab]" />
                    <span>{liveLocation}</span>
                  </p>
                )}

                {(title || department) && (
                  <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#344767] dark:text-slate-200 pt-1">
                    <Briefcase className="w-3.5 h-3.5 text-[#5e72e4]" />
                    <span>
                      {[title, department].filter(Boolean).join(' — ')}
                    </span>
                  </p>
                )}

                {isValidExternalHref(website) && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-[#5e72e4] hover:underline pt-0.5"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
              </div>

              {bio && (
                <p className="mt-4 pt-4 border-t border-[#e9ecef] dark:border-[#1e2952] text-xs text-center text-[#67748e] dark:text-slate-300 leading-relaxed">
                  {bio}
                </p>
              )}

              {/* Live Custom Fields Summary */}
              {profile.customFields.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#e9ecef] dark:border-[#1e2952] space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#8392ab]">
                    Profile Details
                  </p>
                  {profile.customFields.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="text-[#8392ab] truncate">{f.label}</span>
                      <span className="font-mono font-medium text-[#344767] dark:text-slate-100 truncate">
                        {f.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Live Verified Social Links */}
              {profile.socialLinks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#e9ecef] dark:border-[#1e2952] space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#8392ab]">
                    Connected Links
                  </p>
                  <div className="space-y-1.5">
                    {profile.socialLinks.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="inline-flex items-center gap-1.5 text-[#344767] dark:text-slate-200 font-medium truncate">
                          <Link2 className="w-3.5 h-3.5 text-[#5e72e4] shrink-0" />
                          <span className="truncate">{link.platform}</span>
                        </span>
                        {isValidExternalHref(link.url) ? (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-[#5e72e4] hover:underline truncate"
                          >
                            <span className="truncate">{link.handle || 'Open'}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="font-mono text-[#8392ab] truncate">
                            {link.handle}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Specialties Summary */}
              {profile.skills.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#e9ecef] dark:border-[#1e2952] space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#8392ab]">
                    Specialties
                  </p>
                  <p className="text-xs text-[#67748e] dark:text-slate-300 leading-relaxed">
                    {profile.skills.join(' · ')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
