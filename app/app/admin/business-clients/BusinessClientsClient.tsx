'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CustomSelect } from '@/components/CustomSelect';
import { Building2, Plus, Search, Filter, Users, Mail, Phone, Globe, MapPin, UserCog, Pencil, Banknote, Ticket, TimerReset, RefreshCw, Loader2, AlertTriangle, Trash2, RotateCcw, Archive, ShieldAlert, ShieldCheck, UserX, Pause } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AddContactToClientModal from '@/components/admin/AddContactToClientModal';
import AddOrganizationToClientModal from '@/components/admin/AddOrganizationToClientModal';
import ManageBillingModal from '@/components/admin/ManageBillingModal';
import ApplyCouponModal from '@/components/admin/ApplyCouponModal';
import ExtendTrialModal from '@/components/admin/ExtendTrialModal';
import EditBusinessClientModal from '@/components/admin/EditBusinessClientModal';
import EditContactModal from '@/components/admin/EditContactModal';
import { asObject } from '@/lib/shared/unknown';
import { getBusinessClients, removeContactFromClient, syncOrganizationsToBusinessClients, backfillUnlinkedOrganizations, deleteBusinessClient, getDeletedBusinessClients, restoreBusinessClient, updateBusinessClient, suspendBusinessClient, unsuspendBusinessClient } from '@/app/actions/business-clients';

type BusinessContact = {
  id?: string;
  user_id: string;
  is_primary?: boolean;
  is_billing_contact?: boolean;
  is_technical_contact?: boolean;
  title?: string | null;
  role?: string;
  department?: string | null;
  user?: {
    id?: string;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  };
  [key: string]: unknown;
};

type BusinessOrg = {
  id: string;
  name?: string;
  slug?: string | null;
  subscription_plan?: string | null;
  subscription_status?: string | null;
  billing_cycle?: string | null;
  seats_allowed?: number | null;
  active_users_count?: number | null;
  billing_email?: string | null;
  payment_method_id?: string | null;
  mrr?: number | null;
  arr?: number | null;
  next_billing_date?: string | Date | null;
  trial_start_date?: string | Date | null;
  trial_days?: number | null;
  trial_extended_days?: number | null;
  trial_end_date?: string | Date | null;
  created_at?: Date | null;
  [key: string]: unknown;
};

type BusinessClient = {
  id: string;
  company_name: string;
  company_name_en: string | null;
  business_number: string | null;
  primary_email: string;
  phone: string | null;
  website: string | null;
  address_city: string | null;
  industry: string | null;
  company_size: string | null;
  status: string;
  lifecycle_stage: string;
  created_at: Date;
  contacts: BusinessContact[];
  organizations: BusinessOrg[];
  [key: string]: unknown;
};

// ── Business Client Status System ──
const CLIENT_STATUS_CONFIG: Record<string, {
  label: string;
  badgeClass: string;
  borderClass: string;
  bannerBg: string;
  bannerBorder: string;
  bannerText: string;
  bannerMessage: string;
  Icon: typeof AlertTriangle;
}> = {
  active: {
    label: 'פעיל',
    badgeClass: 'bg-green-100 text-green-800',
    borderClass: 'border-slate-200',
    bannerBg: '', bannerBorder: '', bannerText: '', bannerMessage: '',
    Icon: ShieldCheck,
  },
  inactive: {
    label: 'לא פעיל',
    badgeClass: 'bg-slate-200 text-slate-700',
    borderClass: 'border-slate-300',
    bannerBg: 'bg-slate-50',
    bannerBorder: 'border-slate-300',
    bannerText: 'text-slate-700',
    bannerMessage: 'לקוח לא פעיל — הושבת ידנית. הארגונים שלו לא הושפעו.',
    Icon: Pause,
  },
  churned: {
    label: 'עזב',
    badgeClass: 'bg-purple-100 text-purple-800',
    borderClass: 'border-purple-200',
    bannerBg: 'bg-purple-50',
    bannerBorder: 'border-purple-200',
    bannerText: 'text-purple-800',
    bannerMessage: 'לקוח עזב — ביטל מנוי. ניתן לשחזר ולקשר מחדש.',
    Icon: UserX,
  },
  suspended: {
    label: 'מושעה — חוב',
    badgeClass: 'bg-red-100 text-red-800 animate-pulse',
    borderClass: 'border-red-300',
    bannerBg: 'bg-red-50',
    bannerBorder: 'border-red-300',
    bannerText: 'text-red-800',
    bannerMessage: 'לקוח מושעה בגלל חוב — כל הארגונים שלו הושעו. תכונות AI חסומות עד להסדרת החוב.',
    Icon: ShieldAlert,
  },
};

function getStatusConfig(status: string) {
  return CLIENT_STATUS_CONFIG[status] || CLIENT_STATUS_CONFIG.active;
}

export default function BusinessClientsClient({ initialClients }: { initialClients?: BusinessClient[] }) {
  const router = useRouter();
  const [clients, setClients] = useState<BusinessClient[]>(initialClients ?? []);
  const [loading, setLoading] = useState(!initialClients?.length);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'orgs'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedClientForContact, setSelectedClientForContact] = useState<BusinessClient | null>(null);
  const [selectedClientForOrg, setSelectedClientForOrg] = useState<BusinessClient | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  
  // Billing modals
  const [selectedOrgForBilling, setSelectedOrgForBilling] = useState<BusinessOrg | null>(null);
  const [selectedOrgForCoupon, setSelectedOrgForCoupon] = useState<BusinessOrg | null>(null);
  const [selectedOrgForTrial, setSelectedOrgForTrial] = useState<BusinessOrg | null>(null);
  
  // Edit modals
  const [selectedClientForEdit, setSelectedClientForEdit] = useState<BusinessClient | null>(null);
  const [selectedContactForEdit, setSelectedContactForEdit] = useState<{ contact: BusinessContact; clientId: string; clientName: string } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  // Recycle bin
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [deletedClients, setDeletedClients] = useState<Array<{ id: string; company_name: string; primary_email: string | null; deleted_at: Date | string | null }>>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [restoringClientId, setRestoringClientId] = useState<string | null>(null);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);

  useEffect(() => {
    if (initialClients?.length) return;
    loadClients();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBusinessClients({
        search: searchTerm || undefined,
        status: statusFilter || undefined,
      });

      if (result.ok && result.clients) {
        setClients(result.clients);
      } else if (!result.ok && 'error' in result) {
        setError(String(result.error));
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
      setError('שגיאה בטעינת לקוחות עסקיים');
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  const handleSearch = () => {
    loadClients();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    loadClients();
  };

  const activeFiltersCount = (searchTerm ? 1 : 0) + (statusFilter ? 1 : 0);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      // First: backfill (no auth needed, catches everything)
      const backfilled = await backfillUnlinkedOrganizations().catch(() => 0);
      // Second: full sync (needs admin auth, adds richer data)
      const result = await syncOrganizationsToBusinessClients();
      if (result.ok) {
        const totalLinked = (result.linked || 0) + (backfilled || 0);
        setSyncMessage(
          totalLinked > 0 || result.created > 0
            ? `נוצרו ${result.created} לקוחות עסקיים חדשים, קושרו ${totalLinked} ארגונים`
            : 'הכל מסונכרן — לא נמצאו ארגונים חסרים'
        );
        await loadClients();
      } else if ('error' in result) {
        // Auth-gated sync failed but backfill may have worked
        if (backfilled > 0) {
          setSyncMessage(`קושרו ${backfilled} ארגונים (סנכרון חלקי)`);
          await loadClients();
        } else {
          setError(String(result.error));
        }
      }
    } catch (err) {
      console.error('Sync failed:', err);
      setError('שגיאה בסנכרון');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddClientSuccess = () => {
    loadClients();
  };

  const toggleExpand = (clientId: string) => {
    setExpandedClientId(expandedClientId === clientId ? null : clientId);
  };


  const handleRemoveContact = async (clientId: string, userId: string) => {
    try {
      const result = await removeContactFromClient(clientId, userId);
      if (result.ok) {
        loadClients();
      }
    } catch (error) {
      console.error('Failed to remove contact:', error);
    }
  };

  const loadDeletedClients = async () => {
    setLoadingDeleted(true);
    try {
      const result = await getDeletedBusinessClients();
      if (result.ok && 'clients' in result && result.clients) {
        setDeletedClients(result.clients as Array<{ id: string; company_name: string; primary_email: string | null; deleted_at: Date | string | null }>);
      }
    } catch (err) {
      console.error('Failed to load deleted clients:', err);
    } finally {
      setLoadingDeleted(false);
    }
  };

  const handleToggleRecycleBin = async () => {
    const next = !showRecycleBin;
    setShowRecycleBin(next);
    if (next) await loadDeletedClients();
  };

  const handleRestoreClient = async (clientId: string) => {
    setRestoringClientId(clientId);
    try {
      const result = await restoreBusinessClient(clientId);
      if (result.ok) {
        setDeletedClients((prev) => prev.filter((c) => c.id !== clientId));
        await loadClients();
      } else if ('error' in result) {
        setError(String(result.error));
      }
    } catch (err) {
      console.error('Failed to restore client:', err);
      setError('שגיאה בשחזור לקוח עסקי');
    } finally {
      setRestoringClientId(null);
    }
  };

  const handleSetStatus = async (client: BusinessClient, newStatus: string) => {
    const statusLabels: Record<string, string> = {
      active: 'פעיל',
      inactive: 'לא פעיל',
      churned: 'עזב',
      suspended: 'מושעה (חוב)',
    };
    const label = statusLabels[newStatus] || newStatus;

    if (newStatus === 'suspended') {
      if (!window.confirm(
        `להשעות את לקוח "${client.company_name}" בגלל חוב?\n\n` +
        `פעולה זו תשעה את כל הארגונים של הלקוח וחסום תכונות AI עד להסדרת החוב.`
      )) return;

      setTogglingStatusId(client.id);
      try {
        const result = await suspendBusinessClient(client.id);
        if (result.ok) {
          setClients((prev) => prev.map((c) => c.id === client.id ? { ...c, status: 'suspended' } : c));
          const msg = 'orgsAffected' in result && result.orgsAffected
            ? `לקוח הושעה — ${result.orgsAffected} ארגונים הושעו`
            : 'לקוח הושעה';
          setError(null);
          setSyncMessage(msg);
        } else if ('error' in result) {
          setError(String(result.error));
        }
      } catch (err) {
        console.error('Failed to suspend client:', err);
        setError('שגיאה בהשעיית לקוח');
      } finally {
        setTogglingStatusId(null);
      }
      return;
    }

    if (client.status === 'suspended' && newStatus === 'active') {
      if (!window.confirm(
        `להסיר השעיה מלקוח "${client.company_name}"?\n\n` +
        `כל הארגונים המושעים יוחזרו לפעיל ותכונות AI ישוחררו.`
      )) return;

      setTogglingStatusId(client.id);
      try {
        const result = await unsuspendBusinessClient(client.id);
        if (result.ok) {
          setClients((prev) => prev.map((c) => c.id === client.id ? { ...c, status: 'active' } : c));
          const msg = 'orgsRestored' in result && result.orgsRestored
            ? `השעיה הוסרה — ${result.orgsRestored} ארגונים שוחררו`
            : 'השעיה הוסרה';
          setError(null);
          setSyncMessage(msg);
        } else if ('error' in result) {
          setError(String(result.error));
        }
      } catch (err) {
        console.error('Failed to unsuspend client:', err);
        setError('שגיאה בהסרת השעיה');
      } finally {
        setTogglingStatusId(null);
      }
      return;
    }

    // For inactive/churned ↔ active: simple status change (no org impact)
    if (!window.confirm(`לשנות סטטוס ל"${label}" עבור "${client.company_name}"?`)) return;
    setTogglingStatusId(client.id);
    try {
      const result = await updateBusinessClient(client.id, { status: newStatus });
      if (result.ok) {
        setClients((prev) => prev.map((c) => c.id === client.id ? { ...c, status: newStatus } : c));
      } else if ('error' in result) {
        setError(String(result.error));
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      setError('שגיאה בעדכון סטאטוס');
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleDeleteClient = async (client: BusinessClient) => {
    if (!window.confirm(`למחוק את הלקוח העסקי "${client.company_name}"?\nפעולה זו תסיר אותו מהרשימה (מחיקה רכה).`)) return;
    setDeletingClientId(client.id);
    try {
      const result = await deleteBusinessClient(client.id);
      if (result.ok) {
        setClients((prev) => prev.filter((c) => c.id !== client.id));
        if (showRecycleBin) loadDeletedClients();
      } else if ('error' in result) {
        setError(String(result.error));
      }
    } catch (err) {
      console.error('Failed to delete client:', err);
      setError('שגיאה במחיקת לקוח עסקי');
    } finally {
      setDeletingClientId(null);
    }
  };

  const primaryContact = (client: BusinessClient) => {
    return client.contacts.find((c) => c.is_primary) || client.contacts[0];
  };

  // Sort clients based on sortBy and sortOrder
  const sortedClients = [...clients].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.company_name.localeCompare(b.company_name, 'he');
        break;
      case 'created':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'orgs':
        comparison = a.organizations.length - b.organizations.length;
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8" dir="rtl">
      <AdminPageHeader
        title="לקוחות עסקיים"
        subtitle="ניהול חברות וארגונים עסקיים (B2B)"
        icon={Building2}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleSync} variant="outline" disabled={isSyncing} className="w-full sm:w-auto shadow-sm">
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              סנכרן מארגונים
            </Button>
            <Button
              onClick={handleToggleRecycleBin}
              variant="outline"
              className={`w-full sm:w-auto shadow-sm ${showRecycleBin ? 'bg-amber-50 border-amber-300 text-amber-700' : ''}`}
            >
              <Archive className="w-4 h-4" />
              סל מיחזור
            </Button>
          </div>
        }
      />

      {/* Recycle Bin Panel */}
      {showRecycleBin && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Archive className="w-5 h-5 text-amber-600" />
            <h3 className="font-black text-amber-900 text-base">סל מיחזור — לקוחות עסקיים שנמחקו</h3>
            {loadingDeleted && <Loader2 className="w-4 h-4 animate-spin text-amber-500" />}
          </div>
          {deletedClients.length === 0 && !loadingDeleted ? (
            <p className="text-sm text-amber-700">סל המיחזור ריק</p>
          ) : (
            <div className="space-y-2">
              {deletedClients.map((c) => (
                <div key={c.id} className="flex items-center justify-between bg-white border border-amber-200 rounded-xl px-4 py-3">
                  <div>
                    <div className="font-black text-slate-900 text-sm">{c.company_name}</div>
                    <div className="text-xs text-slate-500">{c.primary_email}</div>
                    {c.deleted_at && (
                      <div className="text-xs text-amber-600 mt-0.5">
                        נמחק: {new Date(c.deleted_at).toLocaleDateString('he-IL')}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestoreClient(c.id)}
                    disabled={restoringClientId === c.id}
                    className="text-xs h-8 text-green-700 hover:bg-green-50 border-green-200"
                  >
                    {restoringClientId === c.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    שחזר
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800 flex-1">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-red-600 hover:bg-red-100">
            סגור
          </Button>
        </div>
      )}

      {/* Sync Success Message */}
      {syncMessage && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm text-green-800 flex-1">{syncMessage}</p>
          <Button variant="ghost" size="sm" onClick={() => setSyncMessage(null)} className="text-green-600 hover:bg-green-100">
            סגור
          </Button>
        </div>
      )}

      {/* Filters & Sort */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          {/* Search & Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
              <Input
                type="text"
                placeholder="חיפוש לפי שם חברה, מייל, ח.פ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pr-10 h-11 text-right"
                dir="rtl"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <CustomSelect
                  value={statusFilter}
                  onChange={(val) => {
                    setStatusFilter(val);
                    setTimeout(loadClients, 100);
                  }}
                  placeholder="כל הסטטוסים"
                  options={[
                    { value: 'active', label: 'פעיל' },
                    { value: 'inactive', label: 'לא פעיל' },
                    { value: 'churned', label: 'עזב' },
                    { value: 'suspended', label: 'מושעה (חוב)' },
                  ]}
                />
                {statusFilter && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                    1
                  </span>
                )}
              </div>
              <Button onClick={handleSearch} variant="outline" className="h-11 relative">
                <Filter className="w-4 h-4 ml-2" />
                <span className="hidden sm:inline">חפש</span>
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -left-1 bg-blue-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
              {activeFiltersCount > 0 && (
                <Button onClick={clearFilters} variant="ghost" className="h-11 text-red-600 hover:text-red-700 hover:bg-red-50">
                  <span className="text-sm">נקה</span>
                </Button>
              )}
            </div>
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-600">סינונים פעילים:</span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                  <Search className="w-3 h-3" />
                  {searchTerm}
                  <button onClick={() => { setSearchTerm(''); loadClients(); }} className="hover:bg-blue-100 rounded p-0.5">
                    <span className="text-blue-600">✕</span>
                  </button>
                </span>
              )}
              {statusFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                  <Filter className="w-3 h-3" />
                  {statusFilter === 'active' ? 'פעיל' : statusFilter === 'inactive' ? 'לא פעיל' : statusFilter === 'churned' ? 'עזב' : 'מושעה'}
                  <button onClick={() => { setStatusFilter(''); loadClients(); }} className="hover:bg-blue-100 rounded p-0.5">
                    <span className="text-blue-600">✕</span>
                  </button>
                </span>
              )}
            </div>
          )}
          
          {/* Sort Options */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-600">מיון לפי:</span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSortBy('created')}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  sortBy === 'created'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                תאריך יצירה
              </button>
              <button
                onClick={() => setSortBy('name')}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  sortBy === 'name'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                שם
              </button>
              <button
                onClick={() => setSortBy('orgs')}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  sortBy === 'orgs'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                מספר ארגונים
              </button>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="text-xs px-3 py-1.5 rounded-lg border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 transition-all"
                title={sortOrder === 'asc' ? 'סדר עולה' : 'סדר יורד'}
              >
                {sortOrder === 'asc' ? '↑ עולה' : '↓ יורד'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">סה״כ לקוחות</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">{clients.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl shrink-0">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">אנשי קשר</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">
                {clients.reduce((sum, c) => sum + c.contacts.length, 0)}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl shrink-0">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">ארגונים</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">
                {clients.reduce((sum, c) => sum + c.organizations.length, 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl shrink-0">
              <Building2 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">ארגונים פעילים</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">
                {clients.reduce((sum, c) => sum + c.organizations.filter((o) => o.subscription_status === 'active').length, 0)}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl shrink-0 flex items-center justify-center">
              <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Clients List */}
      <div className="space-y-4">
        {clients.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <div className="max-w-sm mx-auto">
              <div className="p-4 bg-slate-50 rounded-full w-fit mx-auto mb-4">
                <Building2 className="w-16 h-16 text-slate-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">אין לקוחות עסקיים</h3>
              <p className="text-slate-600 mb-4">אם יש לך כבר ארגונים במערכת, לחץ על סנכרון כדי לייבא אותם כלקוחות עסקיים.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleSync} size="lg" disabled={isSyncing}>
                  {isSyncing ? (
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-5 h-5 ml-2" />
                  )}
                  {isSyncing ? 'מסנכרן...' : 'סנכרן מארגונים קיימים'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          sortedClients.map((client) => {
            const isExpanded = expandedClientId === client.id;
            const primary = primaryContact(client);

            return (
              <div key={client.id} className={`bg-white border rounded-2xl hover:shadow-md transition-shadow ${getStatusConfig(client.status).borderClass}`}>
                {/* Status Warning Banner */}
                {client.status !== 'active' && (() => {
                  const cfg = getStatusConfig(client.status);
                  const StatusIcon = cfg.Icon;
                  return (
                    <div className={`flex items-center gap-2 ${cfg.bannerBg} border-b ${cfg.bannerBorder} px-5 py-2.5 rounded-t-2xl`}>
                      <StatusIcon className={`w-4 h-4 ${cfg.bannerText} shrink-0`} />
                      <span className={`text-xs font-black ${cfg.bannerText}`}>{cfg.bannerMessage}</span>
                    </div>
                  );
                })()}
                {/* Client Header */}
                <div
                  className="p-5 sm:p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleExpand(client.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">{client.company_name}</h3>
                        {client.company_name_en && (
                          <span className="text-sm text-slate-500">({client.company_name_en})</span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full font-bold ${getStatusConfig(client.status).badgeClass}`}>
                          {getStatusConfig(client.status).label}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm">
                        {client.business_number && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <span className="font-medium">ח.פ/עוסק:</span>
                            <span>{client.business_number}</span>
                          </div>
                        )}
                        {client.industry && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <span className="font-medium">תחום:</span>
                            <span>{client.industry}</span>
                          </div>
                        )}
                        {client.company_size && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <span className="font-medium">גודל:</span>
                            <span>{client.company_size} עובדים</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 sm:gap-6 mt-2 sm:mt-3 text-xs sm:text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{client.contacts.length} אנשי קשר</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          <span>{client.organizations.length} ארגונים</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3 sm:mt-0 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClientForEdit(client);
                        }}
                        className="text-xs h-8"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        ערוך
                      </Button>
                      {/* Status Actions */}
                      {togglingStatusId === client.id ? (
                        <Button size="sm" variant="outline" disabled className="text-xs h-8">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        </Button>
                      ) : client.status === 'active' ? (
                        <>
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleSetStatus(client, 'inactive'); }} className="text-xs h-8 text-slate-600 hover:bg-slate-50 border-slate-300">
                            <Pause className="w-3.5 h-3.5" /> השבת
                          </Button>
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleSetStatus(client, 'suspended'); }} className="text-xs h-8 text-red-600 hover:bg-red-50 border-red-200">
                            <ShieldAlert className="w-3.5 h-3.5" /> השעה (חוב)
                          </Button>
                        </>
                      ) : client.status === 'suspended' ? (
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleSetStatus(client, 'active'); }} className="text-xs h-8 text-green-600 hover:bg-green-50 border-green-200">
                          <ShieldCheck className="w-3.5 h-3.5" /> הסר השעיה
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleSetStatus(client, 'active'); }} className="text-xs h-8 text-green-600 hover:bg-green-50 border-green-200">
                          <ShieldCheck className="w-3.5 h-3.5" /> הפעל
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClient(client);
                        }}
                        disabled={deletingClientId === client.id}
                        className="text-xs h-8 text-red-600 hover:bg-red-50 border-red-200"
                      >
                        {deletingClientId === client.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        מחק
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClientForContact(client);
                        }}
                        className="text-xs h-8"
                      >
                        <Users className="w-3.5 h-3.5 mr-1" />
                        <span className="hidden sm:inline">הוסף </span>איש קשר
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (client.contacts.length === 0) {
                            setError(`לא ניתן להוסיף ארגון ל-"${client.company_name}" — יש להוסיף איש קשר ראשי קודם (הוא ישמש כבעלים של הארגון).`);
                            return;
                          }
                          setSelectedClientForOrg(client);
                        }}
                        className={`text-xs h-8 ${client.contacts.length === 0 ? 'opacity-60' : ''}`}
                        title={client.contacts.length === 0 ? 'יש להוסיף איש קשר ראשי לפני יצירת ארגון' : 'הוסף ארגון חדש'}
                      >
                        <Building2 className="w-3.5 h-3.5 mr-1" />
                        <span className="hidden sm:inline">הוסף </span>ארגון
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-200 p-4 sm:p-6 bg-slate-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {/* Contact Info */}
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3">פרטי התקשרות</h4>
                        <div className="space-y-2 text-sm">
                          {client.primary_email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-slate-400" />
                              <a href={`mailto:${client.primary_email}`} className="text-blue-600 hover:underline">
                                {client.primary_email}
                              </a>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-slate-400" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                          {client.website && (
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-slate-400" />
                              <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                {client.website}
                              </a>
                            </div>
                          )}
                          {client.address_city && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              <span>{client.address_city}</span>
                            </div>
                          )}
                        </div>

                        {/* All Contacts List */}
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <h5 className="font-medium text-slate-900 mb-2">אנשי קשר ({client.contacts.length})</h5>
                          {client.contacts.length === 0 ? (
                            <p className="text-sm text-slate-400">אין אנשי קשר</p>
                          ) : (
                            <div className="space-y-2">
                              {client.contacts.map((contact: BusinessContact) => (
                                <div key={contact.user_id} className="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-lg">
                                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                                    <Users className="w-4 h-4 text-slate-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate">{contact.user?.full_name || 'ללא שם'}</p>
                                    <p className="text-xs text-slate-500 truncate">{contact.user?.email}</p>
                                    <div className="flex gap-1 mt-0.5 flex-wrap">
                                      {contact.is_primary && <span className="px-1 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">ראשי</span>}
                                      {contact.is_billing_contact && <span className="px-1 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">חיובים</span>}
                                      {contact.is_technical_contact && <span className="px-1 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">טכני</span>}
                                      {contact.title && <span className="text-xs text-slate-400">{contact.title}</span>}
                                    </div>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedContactForEdit({ contact, clientId: client.id, clientName: client.company_name });
                                      }}
                                      className="h-7 w-7 p-0"
                                      title="ערוך איש קשר"
                                    >
                                      <UserCog className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`למחוק את ${contact.user?.full_name || 'איש קשר'} מ-${client.company_name}?`)) {
                                          handleRemoveContact(client.id, contact.user_id);
                                        }
                                      }}
                                      className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                                      title="הסר איש קשר"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Organizations */}
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3">ארגונים ({client.organizations.length})</h4>
                        {client.organizations.length === 0 ? (
                          <p className="text-sm text-slate-500">אין ארגונים</p>
                        ) : (
                          <div className="space-y-3">
                            {client.organizations.map((org: unknown) => {
                              const o = asObject(org) ?? {};
                              return (
                              <div key={String(o.id || '')} className="bg-white border border-slate-200 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-900">{String(o.name || '')}</p>
                                    <p className="text-xs text-slate-500">{String(o.slug || '')}</p>
                                    {Boolean(o.subscription_plan) && (
                                      <p className="text-xs text-blue-600 mt-1">
                                        {String(o.subscription_plan || '').toUpperCase()} • {Number(o.seats_allowed) || 5} מקומות
                                      </p>
                                    )}
                                  </div>
                                  <span
                                    className={`px-2 py-1 text-xs rounded-full ${
                                      o.subscription_status === 'active'
                                        ? 'bg-green-100 text-green-800'
                                        : o.subscription_status === 'trial'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-slate-100 text-slate-800'
                                    }`}
                                  >
                                    {o.subscription_status === 'active' ? 'פעיל' : o.subscription_status === 'trial' ? 'ניסיון' : 'מבוטל'}
                                  </span>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/app/admin/organizations/${String(o.id || '')}`);
                                    }}
                                    className="text-xs"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    נהל ארגון
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOrgForBilling(o as BusinessOrg);
                                    }}
                                    className="text-xs"
                                  >
                                    <Banknote className="w-3.5 h-3.5" />
                                    חיובים
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOrgForCoupon(o as BusinessOrg);
                                    }}
                                    className="text-xs"
                                  >
                                    <Ticket className="w-3.5 h-3.5" />
                                    קופון
                                  </Button>
                                  {o.subscription_status === 'trial' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedOrgForTrial(o as BusinessOrg);
                                      }}
                                      className="text-xs"
                                    >
                                      <TimerReset className="w-3.5 h-3.5" />
                                      הארכה
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {selectedClientForContact && (
        <AddContactToClientModal
          isOpen={true}
          clientId={selectedClientForContact.id}
          clientName={selectedClientForContact.company_name}
          onClose={() => setSelectedClientForContact(null)}
          onSuccess={() => {
            setSelectedClientForContact(null);
            loadClients();
          }}
        />
      )}

      {selectedClientForOrg && (
        <AddOrganizationToClientModal
          isOpen={true}
          clientId={selectedClientForOrg.id}
          clientName={selectedClientForOrg.company_name}
          primaryContactUserId={primaryContact(selectedClientForOrg)?.user_id || null}
          onClose={() => setSelectedClientForOrg(null)}
          onSuccess={() => {
            setSelectedClientForOrg(null);
            loadClients();
          }}
        />
      )}

      {/* Billing Modals */}
      {selectedOrgForBilling && (
        <ManageBillingModal
          isOpen={true}
          organizationId={selectedOrgForBilling.id}
          organizationName={selectedOrgForBilling.name || ''}
          currentBilling={{
            subscription_plan: selectedOrgForBilling.subscription_plan,
            billing_cycle: selectedOrgForBilling.billing_cycle,
            seats_allowed: selectedOrgForBilling.seats_allowed,
            active_users_count: selectedOrgForBilling.active_users_count,
            billing_email: selectedOrgForBilling.billing_email,
            payment_method_id: selectedOrgForBilling.payment_method_id,
            mrr: selectedOrgForBilling.mrr,
            arr: selectedOrgForBilling.arr,
            next_billing_date: selectedOrgForBilling.next_billing_date,
          }}
          onClose={() => setSelectedOrgForBilling(null)}
          onSuccess={() => {
            setSelectedOrgForBilling(null);
            loadClients();
          }}
        />
      )}

      {selectedOrgForCoupon && (
        <ApplyCouponModal
          isOpen={true}
          organizationId={selectedOrgForCoupon.id}
          organizationName={selectedOrgForCoupon.name || ''}
          currentMRR={Number(selectedOrgForCoupon.mrr || 0)}
          onClose={() => setSelectedOrgForCoupon(null)}
          onSuccess={() => {
            setSelectedOrgForCoupon(null);
            loadClients();
          }}
        />
      )}

      {selectedOrgForTrial && (
        <ExtendTrialModal
          isOpen={true}
          organizationId={selectedOrgForTrial.id}
          organizationName={selectedOrgForTrial.name || ''}
          currentTrial={{
            trial_start_date: selectedOrgForTrial.trial_start_date instanceof Date ? selectedOrgForTrial.trial_start_date : selectedOrgForTrial.trial_start_date ? new Date(selectedOrgForTrial.trial_start_date) : undefined,
            trial_days: selectedOrgForTrial.trial_days,
            trial_extended_days: selectedOrgForTrial.trial_extended_days,
            trial_end_date: selectedOrgForTrial.trial_end_date instanceof Date ? selectedOrgForTrial.trial_end_date : selectedOrgForTrial.trial_end_date ? new Date(selectedOrgForTrial.trial_end_date) : undefined,
          }}
          onClose={() => setSelectedOrgForTrial(null)}
          onSuccess={() => {
            setSelectedOrgForTrial(null);
            loadClients();
          }}
        />
      )}


      {/* Edit Modals */}
      {selectedClientForEdit && (
        <EditBusinessClientModal
          isOpen={true}
          client={selectedClientForEdit}
          onClose={() => setSelectedClientForEdit(null)}
          onSuccess={() => {
            setSelectedClientForEdit(null);
            loadClients();
          }}
        />
      )}


      {selectedContactForEdit && (
        <EditContactModal
          isOpen={true}
          clientId={selectedContactForEdit.clientId}
          clientName={selectedContactForEdit.clientName}
          contact={{ ...selectedContactForEdit.contact, role: selectedContactForEdit.contact.role ?? '', title: selectedContactForEdit.contact.title ?? null, department: selectedContactForEdit.contact.department ?? null, is_primary: Boolean(selectedContactForEdit.contact.is_primary), is_billing_contact: Boolean(selectedContactForEdit.contact.is_billing_contact), is_technical_contact: Boolean(selectedContactForEdit.contact.is_technical_contact), user: { full_name: selectedContactForEdit.contact.user?.full_name ?? null, email: selectedContactForEdit.contact.user?.email ?? null } }}
          onClose={() => setSelectedContactForEdit(null)}
          onSuccess={() => {
            setSelectedContactForEdit(null);
            loadClients();
          }}
        />
      )}
    </div>
  );
}
